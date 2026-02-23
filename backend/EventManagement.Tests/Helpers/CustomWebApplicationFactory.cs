using EventManagement.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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
            // Swap out the production SQLite file-based DbContext for an
            // in-memory SQLite connection that is private to this test.
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor is not null)
                services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite(_connection));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing); // shuts down the server first
        if (disposing)
            _connection.Dispose();
    }
}
