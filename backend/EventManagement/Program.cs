using System.Security.Claims;
using System.Threading.RateLimiting;
using EventManagement.Data;
using EventManagement.Middleware;
using EventManagement.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── CloudWatch Logs ───────────────────────────────────────────────────────────
// In production, ILogger output is shipped to CloudWatch via AWS.Logger.
// In development the default console logger is used (no AWS calls made).
builder.Logging.AddAWSProvider(builder.Configuration.GetAWSLoggingConfigSection());

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Cognito config
var cognitoRegion   = builder.Configuration["Cognito:Region"]!;
var cognitoPoolId   = builder.Configuration["Cognito:UserPoolId"]!;
var cognitoClientId = builder.Configuration["Cognito:ClientId"]!;
var cognitoIssuer   = $"https://cognito-idp.{cognitoRegion}.amazonaws.com/{cognitoPoolId}";

// Auth services
builder.Services.AddScoped<ICognitoUserResolver, CognitoUserResolver>();
builder.Services.AddScoped<IWaitlistService, WaitlistService>();
builder.Services.AddHostedService<NotificationBackgroundService>();

// AppMetrics — structured log helper consumed by controllers
builder.Services.AddSingleton<AppMetrics>();

// ── Health checks ─────────────────────────────────────────────────────────────
// /health/live  → always 200 (process is running)
// /health/ready → 200 only when the database is reachable
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database", tags: ["ready"]);

// Storage: "Local" (default for dev) or "S3" (production)
var storageProvider = builder.Configuration["Storage:Provider"] ?? "Local";
if (storageProvider.Equals("S3", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddSingleton<IStorageService, S3StorageService>();
else
    builder.Services.AddSingleton<IStorageService, LocalStorageService>();

// JWT authentication — Cognito RS256, keys fetched automatically via OIDC discovery
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority       = cognitoIssuer;
        options.MetadataAddress = $"{cognitoIssuer}/.well-known/openid-configuration";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidIssuer              = cognitoIssuer,
            ValidateAudience         = true,
            ValidAudience            = cognitoClientId,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
        };

        // Map Cognito groups to ASP.NET ClaimTypes.Role so [Authorize(Roles = "Admin")] works
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = ctx =>
            {
                var groups = ctx.Principal!
                    .FindAll("cognito:groups")
                    .Select(c => c.Value)
                    .ToList();

                var identity = (ClaimsIdentity)ctx.Principal.Identity!;

                if (groups.Count == 0)
                    identity.AddClaim(new Claim(ClaimTypes.Role, "Attendee"));
                else
                    foreach (var group in groups)
                        identity.AddClaim(new Claim(ClaimTypes.Role, group));

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

// Rate limiting
builder.Services.AddRateLimiter(options =>
{
    // Auth endpoints: 5 attempts per minute per IP (brute-force protection)
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    // Booking endpoints: 20 per minute per IP
    options.AddFixedWindowLimiter("booking", opt =>
    {
        opt.PermitLimit = 20;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    // General API: 200 requests per minute per IP
    options.AddFixedWindowLimiter("api", opt =>
    {
        opt.PermitLimit = 200;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Emit a structured log entry every time rate limiting rejects a request.
    // CloudWatch Metric Filter pattern: [METRIC] EventName=RateLimitHit
    options.OnRejected = async (ctx, token) =>
    {
        var metrics = ctx.HttpContext.RequestServices.GetRequiredService<AppMetrics>();
        var endpoint = ctx.HttpContext.Request.Path.ToString();
        var ip       = ctx.HttpContext.Connection.RemoteIpAddress?.ToString();
        metrics.RateLimitHit(endpoint, ip);
        ctx.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await ctx.HttpContext.Response.WriteAsync("Too many requests. Please try again later.", token);
    };
});

// CORS — allow React dev server
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Event Management API",
        Version = "v1",
        Description = "REST API for managing events, bookings, and users."
    });

    // JWT bearer auth in Swagger UI
    var jwtScheme = new OpenApiSecurityScheme
    {
        BearerFormat = "JWT",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = JwtBearerDefaults.AuthenticationScheme,
        Description = "Paste your Cognito ID token here (without 'Bearer ' prefix)."
    };

    c.AddSecurityDefinition("Bearer", jwtScheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Id = "Bearer", Type = ReferenceType.SecurityScheme }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Apply migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// Seed demo data in development
if (app.Environment.IsDevelopment())
{
    using var seedScope = app.Services.CreateScope();
    var seedDb = seedScope.ServiceProvider.GetRequiredService<AppDbContext>();
    await SeedService.SeedDemoDataAsync(seedDb);
}

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Event Management API v1");
    c.RoutePrefix = string.Empty; // Serve Swagger UI at root "/"
});

// Security + observability middleware (before auth so headers are always added)
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<RequestCorrelationMiddleware>();

app.UseStaticFiles();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check endpoints — excluded from auth + rate limiting
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    // Liveness: always 200 as long as the process responds
    Predicate = _ => false,
    ResultStatusCodes =
    {
        [HealthStatus.Healthy]   = StatusCodes.Status200OK,
        [HealthStatus.Degraded]  = StatusCodes.Status200OK,
        [HealthStatus.Unhealthy] = StatusCodes.Status200OK,
    },
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    // Readiness: only passes when the database check succeeds
    Predicate = check => check.Tags.Contains("ready"),
    ResultStatusCodes =
    {
        [HealthStatus.Healthy]   = StatusCodes.Status200OK,
        [HealthStatus.Degraded]  = StatusCodes.Status200OK,
        [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable,
    },
});

app.Run();

// Needed by WebApplicationFactory<Program> in the test project
public partial class Program { }
