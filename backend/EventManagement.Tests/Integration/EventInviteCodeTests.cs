using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Integration tests for private-event invite-code endpoints.
///
/// Scenarios covered:
///  - Owner can generate an invite code → receives 32-char hex token
///  - Non-owner cannot generate → 403
///  - Unauthenticated cannot generate → 401
///  - Private event inaccessible without code → 404
///  - Private event accessible with correct code → 200
///  - Private event inaccessible with wrong code → 404
///  - Owner can revoke the invite code → 204
///  - After revocation the old code no longer grants access
///  - Generating again issues a new code (old code invalidated)
///  - InviteCode is returned in GET /api/events/{id} response for owner only
///  - Public events are unaffected by invite-code mechanism
/// </summary>
public sealed class EventInviteCodeTests : IAsyncLifetime, IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;       // unauthenticated

    private HttpClient _ownerClient   = null!;
    private HttpClient _strangerClient = null!;
    private int _privateEventId;
    private int _publicEventId;

    public EventInviteCodeTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client  = _factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        var (ownerToken, _) = await ApiClient.RegisterAndGetIdAsync(
            _client, "Invite Owner", "inviteowner@invite.test", "Pass!");
        _ownerClient = ApiClient.WithToken(_factory, ownerToken);

        var (strangerToken, _) = ApiClient.RegisterAndGetIdAsync(
            _client, "Invite Stranger", "invitestranger@invite.test", "Pass!").Result;
        _strangerClient = ApiClient.WithToken(_factory, strangerToken);

        // Private event
        var privResp = await ApiClient.CreateEventAsync(
            _ownerClient, "Secret Event", isPublic: false, draft: false);
        var privEv = await privResp.Content.ReadFromJsonAsync<EventResponse>();
        _privateEventId = privEv!.Id;

        // Public event (control group)
        var pubResp = await ApiClient.CreateEventAsync(
            _ownerClient, "Public Event", isPublic: true, draft: false);
        var pubEv = await pubResp.Content.ReadFromJsonAsync<EventResponse>();
        _publicEventId = pubEv!.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    public void Dispose()
    {
        _ownerClient?.Dispose();
        _strangerClient?.Dispose();
        _client.Dispose();
        _factory.Dispose();
        GC.SuppressFinalize(this);
    }

    // ── Generate invite code ───────────────────────────────────────

    [Fact]
    public async Task GenerateInviteCode_Owner_Returns200WithCode()
    {
        var resp = await _ownerClient.PostAsync(
            $"/api/events/{_privateEventId}/invite-code", null);

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<InviteCodeBody>();
        Assert.NotNull(body);
        Assert.NotNull(body.InviteCode);
        Assert.Equal(32, body.InviteCode.Length); // Guid.NewGuid().ToString("N")
    }

    [Fact]
    public async Task GenerateInviteCode_NonOwner_Returns403()
    {
        var resp = await _strangerClient.PostAsync(
            $"/api/events/{_privateEventId}/invite-code", null);

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task GenerateInviteCode_Unauthenticated_Returns401()
    {
        var resp = await _client.PostAsync(
            $"/api/events/{_privateEventId}/invite-code", null);

        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // ── Access private event ───────────────────────────────────────

    [Fact]
    public async Task GetPrivateEvent_NoCode_Returns404ForStranger()
    {
        var resp = await _strangerClient.GetAsync($"/api/events/{_privateEventId}");

        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task GetPrivateEvent_NoCode_Returns404ForAnonymous()
    {
        var resp = await _client.GetAsync($"/api/events/{_privateEventId}");

        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task GetPrivateEvent_CorrectCode_Returns200()
    {
        // Generate code
        var genResp = await _ownerClient.PostAsync(
            $"/api/events/{_privateEventId}/invite-code", null);
        var body = await genResp.Content.ReadFromJsonAsync<InviteCodeBody>();

        // Access with correct code (anonymous)
        var resp = await _client.GetAsync(
            $"/api/events/{_privateEventId}?code={body!.InviteCode}");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var ev = await resp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(ev);
        Assert.Equal(_privateEventId, ev.Id);
    }

    [Fact]
    public async Task GetPrivateEvent_WrongCode_Returns404()
    {
        // Generate a real code first
        await _ownerClient.PostAsync(
            $"/api/events/{_privateEventId}/invite-code", null);

        // Try with wrong code
        var resp = await _client.GetAsync(
            $"/api/events/{_privateEventId}?code=wrongcode12345");

        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ── InviteCode in response ─────────────────────────────────────

    [Fact]
    public async Task GetEvent_Owner_ResponseIncludesInviteCode()
    {
        var genResp = await _ownerClient.PostAsync(
            $"/api/events/{_privateEventId}/invite-code", null);
        var genBody = await genResp.Content.ReadFromJsonAsync<InviteCodeBody>();

        var resp = await _ownerClient.GetAsync($"/api/events/{_privateEventId}");
        var ev = await resp.Content.ReadFromJsonAsync<EventResponse>();

        Assert.NotNull(ev);
        Assert.Equal(genBody!.InviteCode, ev.InviteCode);
    }

    [Fact]
    public async Task GetEvent_Stranger_InviteCodeIsNull()
    {
        await _ownerClient.PostAsync(
            $"/api/events/{_privateEventId}/invite-code", null);
        var genResp = await _ownerClient.PostAsync(
            $"/api/events/{_privateEventId}/invite-code", null);
        var genBody = await genResp.Content.ReadFromJsonAsync<InviteCodeBody>();

        // Stranger accesses with valid code — should see event but NOT the code
        var resp = await _strangerClient.GetAsync(
            $"/api/events/{_privateEventId}?code={genBody!.InviteCode}");
        var ev = await resp.Content.ReadFromJsonAsync<EventResponse>();

        Assert.NotNull(ev);
        Assert.Null(ev.InviteCode);
    }

    // ── Revoke invite code ─────────────────────────────────────────

    [Fact]
    public async Task RevokeInviteCode_Owner_Returns204()
    {
        await _ownerClient.PostAsync(
            $"/api/events/{_privateEventId}/invite-code", null);

        var resp = await _ownerClient.DeleteAsync(
            $"/api/events/{_privateEventId}/invite-code");

        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);
    }

    [Fact]
    public async Task RevokeInviteCode_NonOwner_Returns403()
    {
        var resp = await _strangerClient.DeleteAsync(
            $"/api/events/{_privateEventId}/invite-code");

        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task RevokeInviteCode_ThenOldCode_Returns404()
    {
        // Generate, capture code, then revoke
        var genResp = await _ownerClient.PostAsync(
            $"/api/events/{_privateEventId}/invite-code", null);
        var body = await genResp.Content.ReadFromJsonAsync<InviteCodeBody>();

        await _ownerClient.DeleteAsync(
            $"/api/events/{_privateEventId}/invite-code");

        // Old code should no longer work
        var resp = await _client.GetAsync(
            $"/api/events/{_privateEventId}?code={body!.InviteCode}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task Regenerate_InvalidatesOldCode()
    {
        var first = await _ownerClient.PostAsync(
            $"/api/events/{_privateEventId}/invite-code", null);
        var firstBody = await first.Content.ReadFromJsonAsync<InviteCodeBody>();

        var second = await _ownerClient.PostAsync(
            $"/api/events/{_privateEventId}/invite-code", null);
        var secondBody = await second.Content.ReadFromJsonAsync<InviteCodeBody>();

        Assert.NotEqual(firstBody!.InviteCode, secondBody!.InviteCode);

        // First code no longer grants access
        var resp = await _client.GetAsync(
            $"/api/events/{_privateEventId}?code={firstBody.InviteCode}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ── Public events unaffected ───────────────────────────────────

    [Fact]
    public async Task GetPublicEvent_NoCode_AlwaysAccessible()
    {
        var resp = await _client.GetAsync($"/api/events/{_publicEventId}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }
}

internal record InviteCodeBody(string InviteCode);
