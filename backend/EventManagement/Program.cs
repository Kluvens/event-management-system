using System.Security.Claims;
using EventManagement.Data;
using EventManagement.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

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

app.UseStaticFiles();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Needed by WebApplicationFactory<Program> in the test project
public partial class Program { }
