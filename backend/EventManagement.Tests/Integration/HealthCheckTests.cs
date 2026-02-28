using System.Net;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Tests for the health check endpoints added in Program.cs:
///   GET /health/live  — liveness probe (always 200 while process is up)
///   GET /health/ready — readiness probe (200 only when DB is reachable)
///
/// Both endpoints must be accessible without authentication.
/// </summary>
public sealed class HealthCheckTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public HealthCheckTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client  = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        GC.SuppressFinalize(this);
    }

    // ── /health/live ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Live_Returns200()
    {
        var resp = await _client.GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Live_RequiresNoAuthentication()
    {
        // Anonymous request — no Bearer token
        var resp = await _client.GetAsync("/health/live");

        Assert.NotEqual(HttpStatusCode.Unauthorized, resp.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden,    resp.StatusCode);
    }

    [Fact]
    public async Task Live_ContentTypeIsTextPlain()
    {
        var resp = await _client.GetAsync("/health/live");

        Assert.Equal("text/plain", resp.Content.Headers.ContentType?.MediaType);
    }

    // ── /health/ready ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Ready_Returns200_WhenDatabaseIsHealthy()
    {
        // The in-memory SQLite DB is always reachable in tests
        var resp = await _client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Ready_RequiresNoAuthentication()
    {
        var resp = await _client.GetAsync("/health/ready");

        Assert.NotEqual(HttpStatusCode.Unauthorized, resp.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden,    resp.StatusCode);
    }

    [Fact]
    public async Task Ready_ContentTypeIsTextPlain()
    {
        var resp = await _client.GetAsync("/health/ready");

        Assert.Equal("text/plain", resp.Content.Headers.ContentType?.MediaType);
    }

    // ── Both endpoints are independent ────────────────────────────────────────

    [Fact]
    public async Task BothEndpoints_ReturnSuccessfullyInParallel()
    {
        var liveTask  = _client.GetAsync("/health/live");
        var readyTask = _client.GetAsync("/health/ready");

        await Task.WhenAll(liveTask, readyTask);

        Assert.Equal(HttpStatusCode.OK, liveTask.Result.StatusCode);
        Assert.Equal(HttpStatusCode.OK, readyTask.Result.StatusCode);
    }
}
