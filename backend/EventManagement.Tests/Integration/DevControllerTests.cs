using System.Net;
using System.Net.Http.Json;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Tests for the development-only data management endpoints.
/// Uses its own factory so that reset/seed operations don't pollute other test classes.
/// Dev endpoints now require an Admin or SuperAdmin JWT.
/// </summary>
public sealed class DevControllerTests : IAsyncLifetime, IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;        // unauthenticated
    private HttpClient _authedClient = null!;   // SuperAdmin — used for all dev calls
    private HttpClient _attendeeClient = null!; // Attendee — used for 403 tests

    public DevControllerTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        var saToken = await ApiClient.RegisterSuperAdminAsync(
            _client, "Dev SuperAdmin", "devsa@test.com", "Password1!",
            CustomWebApplicationFactory.TestAdminKey);
        _authedClient = ApiClient.WithToken(_factory, saToken);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Dev Attendee", "devattendee@test.com", "Password1!");
        _attendeeClient = ApiClient.WithToken(_factory, attendeeToken);
    }

    public Task DisposeAsync()
    {
        _authedClient?.Dispose();
        _attendeeClient?.Dispose();
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        GC.SuppressFinalize(this);
    }

    // ── POST /api/dev/seed ────────────────────────────────────────────

    [Fact]
    public async Task Seed_WithAdminToken_EmptyDatabase_Returns200WithUserIds()
    {
        await _authedClient.DeleteAsync("/api/dev/reset");

        var response = await _authedClient.PostAsync("/api/dev/seed", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<SeedResponse>();
        Assert.NotNull(body);
        Assert.True(body.UpcomingEventId > 0);
        Assert.True(body.PastEventId > 0);
    }

    [Fact]
    public async Task Seed_WithAdminToken_DataAlreadyExists_Returns409()
    {
        await _authedClient.DeleteAsync("/api/dev/reset");
        await _authedClient.PostAsync("/api/dev/seed", null);

        var response = await _authedClient.PostAsync("/api/dev/seed", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Seed_WithoutToken_Returns401()
    {
        var response = await _client.PostAsync("/api/dev/seed", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Seed_WithAttendeeToken_Returns403()
    {
        var response = await _attendeeClient.PostAsync("/api/dev/seed", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── DELETE /api/dev/reset ─────────────────────────────────────────

    [Fact]
    public async Task Reset_WithAdminToken_Returns200_AndClearsAllUserData()
    {
        await _authedClient.DeleteAsync("/api/dev/reset");
        await _authedClient.PostAsync("/api/dev/seed", null);

        var beforeResp = await _client.GetAsync("/api/events");
        var beforeEvents = await beforeResp.Content.ReadFromJsonAsync<List<object>>();
        Assert.NotNull(beforeEvents);
        Assert.NotEmpty(beforeEvents);

        var resetResp = await _authedClient.DeleteAsync("/api/dev/reset");
        Assert.Equal(HttpStatusCode.OK, resetResp.StatusCode);

        var afterResp = await _client.GetAsync("/api/events");
        var afterEvents = await afterResp.Content.ReadFromJsonAsync<List<object>>();
        Assert.NotNull(afterEvents);
        Assert.Empty(afterEvents);
    }

    [Fact]
    public async Task Reset_WithAdminToken_PreservesTagsAndCategories()
    {
        await _authedClient.DeleteAsync("/api/dev/reset");

        var tagsResp = await _client.GetAsync("/api/tags");
        Assert.Equal(HttpStatusCode.OK, tagsResp.StatusCode);
        var tags = await tagsResp.Content.ReadFromJsonAsync<List<object>>();
        Assert.NotNull(tags);
        Assert.NotEmpty(tags);

        var catsResp = await _client.GetAsync("/api/categories");
        Assert.Equal(HttpStatusCode.OK, catsResp.StatusCode);
        var cats = await catsResp.Content.ReadFromJsonAsync<List<object>>();
        Assert.NotNull(cats);
        Assert.NotEmpty(cats);
    }

    [Fact]
    public async Task Reset_WithoutToken_Returns401()
    {
        var response = await _client.DeleteAsync("/api/dev/reset");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Reset_WithAttendeeToken_Returns403()
    {
        var response = await _attendeeClient.DeleteAsync("/api/dev/reset");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── DELETE /api/dev/events/{eventId} ─────────────────────────────

    [Fact]
    public async Task ResetEvent_WithAdminToken_ExistingEvent_Returns200()
    {
        await _authedClient.DeleteAsync("/api/dev/reset");
        var seedResp = await _authedClient.PostAsync("/api/dev/seed", null);
        var seed = await seedResp.Content.ReadFromJsonAsync<SeedResponse>();
        Assert.NotNull(seed);

        var response = await _authedClient.DeleteAsync($"/api/dev/events/{seed.PastEventId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ResetEvent_WithAdminToken_NonexistentEvent_Returns404()
    {
        await _authedClient.DeleteAsync("/api/dev/reset");
        var response = await _authedClient.DeleteAsync("/api/dev/events/999999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ResetEvent_WithoutToken_Returns401()
    {
        var response = await _client.DeleteAsync("/api/dev/events/1");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ResetEvent_WithAttendeeToken_Returns403()
    {
        var response = await _attendeeClient.DeleteAsync("/api/dev/events/1");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── Seed then verify the created data is usable ───────────────────

    [Fact]
    public async Task SeedData_HostCanLoginAndSeeEvents()
    {
        await _authedClient.DeleteAsync("/api/dev/reset");
        await _authedClient.PostAsync("/api/dev/seed", null);

        var loginResp = await _client.PostAsJsonAsync("/api/auth/login",
            new { Email = "host@example.com", Password = "Password1!" });
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);

        var eventsResp = await _client.GetAsync("/api/events");
        var events = await eventsResp.Content.ReadFromJsonAsync<List<object>>();
        Assert.NotNull(events);
        Assert.NotEmpty(events);
    }
}

// Local helper record for deserializing seed response
internal record SeedResponse(
    string Message,
    SeedUser Host,
    SeedUser Attendee,
    int UpcomingEventId,
    int PastEventId);

internal record SeedUser(int Id, string Email, string Password);
