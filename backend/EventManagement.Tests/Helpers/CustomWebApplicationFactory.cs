using EventManagement.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;

namespace EventManagement.Tests.Helpers;

/// <summary>
/// Creates a real in-process server backed by an isolated SQLite in-memory database.
/// Instantiate one per test so every test has a completely fresh database.
/// Migrations (including category/tag seed data) are applied by Program.cs on startup.
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    /// <summary>Registration key used for SuperAdmin creation in all tests.</summary>
    public const string TestAdminKey = "test-admin-key";

    // Keep the connection open for the lifetime of the factory so that the
    // in-memory SQLite database persists across requests within the same test.
    private readonly SqliteConnection _connection;

    public CustomWebApplicationFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        // Override the admin registration key with a known test value so tests
        // don't depend on the value in appsettings.json.
        builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AdminSettings:RegistrationKey"] = TestAdminKey
            }));

        builder.ConfigureServices(services =>
        {
            // EF Core 8+ registers both DbContextOptions<T> and
            // IDbContextOptionsConfiguration<T> (one per provider call).
            // Removing only DbContextOptions<T> leaves the Npgsql configuration
            // descriptor behind, which conflicts with the SQLite re-registration.
            // Both must be removed before adding the test SQLite context.
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();

            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite(_connection)
                       // EF Core 9 escalated PendingModelChangesWarning to an error.
                       // Suppress it for tests: the SQLite schema is built from the
                       // existing migrations and is correct for what tests exercise.
                       // A production migration should be added separately.
                       .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning)));

            // Override Cognito RS256 JWT validation with test HS256 key
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.Authority = null;
                options.MetadataAddress = null!;
                options.RequireHttpsMetadata = false;
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer           = false,
                    ValidateAudience         = false,
                    ValidateLifetime         = false,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey         = new SymmetricSecurityKey(
                        System.Text.Encoding.UTF8.GetBytes(EventManagement.Controllers.DevController.TestJwtKey)),
                };
            });
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing); // shuts down the server first
        if (disposing)
            _connection.Dispose();
    }
}
