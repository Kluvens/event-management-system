using System.Net;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Verifies the two middleware components added to the pipeline:
///
///   SecurityHeadersMiddleware  — adds defensive HTTP headers to every response
///   RequestCorrelationMiddleware — propagates / generates X-Request-ID
///
/// We probe against GET /api/events (a public, always-200 endpoint) so the
/// middleware runs end-to-end without any auth setup.
/// </summary>
public sealed class MiddlewareTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public MiddlewareTests()
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

    // ── SecurityHeadersMiddleware ─────────────────────────────────────────────

    [Fact]
    public async Task Response_HasXContentTypeOptionsNoSniff()
    {
        var resp = await _client.GetAsync("/api/events");

        Assert.Equal("nosniff",
            resp.Headers.GetValues("X-Content-Type-Options").First());
    }

    [Fact]
    public async Task Response_HasXFrameOptionsDeny()
    {
        var resp = await _client.GetAsync("/api/events");

        Assert.Equal("DENY",
            resp.Headers.GetValues("X-Frame-Options").First());
    }

    [Fact]
    public async Task Response_HasXXssProtection()
    {
        var resp = await _client.GetAsync("/api/events");

        Assert.Equal("1; mode=block",
            resp.Headers.GetValues("X-XSS-Protection").First());
    }

    [Fact]
    public async Task Response_HasReferrerPolicy()
    {
        var resp = await _client.GetAsync("/api/events");

        Assert.Equal("strict-origin-when-cross-origin",
            resp.Headers.GetValues("Referrer-Policy").First());
    }

    [Fact]
    public async Task Response_HasPermissionsPolicy()
    {
        var resp = await _client.GetAsync("/api/events");

        Assert.True(resp.Headers.Contains("Permissions-Policy"),
            "Permissions-Policy header should be present");
    }

    [Fact]
    public async Task SecurityHeaders_PresentOnAuthEndpoints()
    {
        // Headers must appear on every route, not just /api/events
        var resp = await _client.GetAsync("/api/auth/me"); // returns 401 for anon, that's fine

        Assert.Equal("nosniff",
            resp.Headers.GetValues("X-Content-Type-Options").First());
        Assert.Equal("DENY",
            resp.Headers.GetValues("X-Frame-Options").First());
    }

    [Fact]
    public async Task SecurityHeaders_PresentOn404Response()
    {
        var resp = await _client.GetAsync("/api/nonexistent-route-xyz");

        // Headers must be added even when the route doesn't exist
        Assert.True(resp.Headers.Contains("X-Content-Type-Options"),
            "Security headers must be added even on 404 responses");
    }

    // ── RequestCorrelationMiddleware ──────────────────────────────────────────

    [Fact]
    public async Task Response_ContainsXRequestId_WhenNotProvidedByClient()
    {
        // No X-Request-ID in the request — middleware should generate one
        var resp = await _client.GetAsync("/api/events");

        Assert.True(resp.Headers.Contains("X-Request-ID"),
            "Middleware should add X-Request-ID to response when not provided");
    }

    [Fact]
    public async Task Response_EchoesClientProvidedXRequestId()
    {
        const string clientCorrelationId = "test-correlation-abc123";

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/events");
        request.Headers.Add("X-Request-ID", clientCorrelationId);
        var resp = await _client.SendAsync(request);

        var returnedId = resp.Headers.GetValues("X-Request-ID").First();
        Assert.Equal(clientCorrelationId, returnedId);
    }

    [Fact]
    public async Task GeneratedXRequestId_IsNonEmpty()
    {
        var resp = await _client.GetAsync("/api/events");

        var id = resp.Headers.GetValues("X-Request-ID").First();
        Assert.False(string.IsNullOrWhiteSpace(id),
            "Generated X-Request-ID must not be empty");
    }

    [Fact]
    public async Task TwoRequestsWithoutId_ReceiveDifferentCorrelationIds()
    {
        var resp1 = await _client.GetAsync("/api/events");
        var resp2 = await _client.GetAsync("/api/events");

        var id1 = resp1.Headers.GetValues("X-Request-ID").First();
        var id2 = resp2.Headers.GetValues("X-Request-ID").First();

        Assert.NotEqual(id1, id2);
    }

    [Fact]
    public async Task CorrelationHeader_IsNotSetOnIncomingRequestBody()
    {
        // Sending a custom ID in the request should only echo it back, not leak
        // it into any other header or response body
        const string myId = "my-unique-id-xyz";
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/events");
        request.Headers.Add("X-Request-ID", myId);
        var resp = await _client.SendAsync(request);

        // Only one X-Request-ID header in the response (not duplicated)
        var values = resp.Headers.GetValues("X-Request-ID").ToList();
        Assert.Single(values);
        Assert.Equal(myId, values[0]);
    }
}
