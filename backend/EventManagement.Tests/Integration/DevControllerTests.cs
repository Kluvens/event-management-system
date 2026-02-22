using System.Net;
using System.Net.Http.Json;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Tests for the development-only data management endpoints.
/// Uses its own factory so that reset/seed operations don't pollute other test classes.
/// </summary>
public class DevControllerTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public DevControllerTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    // ── POST /api/dev/seed ────────────────────────────────────────────

    [Fact]
    public async Task Seed_EmptyDatabase_Returns200WithUserIds()
    {
        // Reset first to ensure empty state
        await _client.DeleteAsync("/api/dev/reset");

        var response = await _client.PostAsync("/api/dev/seed", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<SeedResponse>();
        Assert.NotNull(body);
        Assert.True(body.UpcomingEventId > 0);
        Assert.True(body.PastEventId > 0);
    }

    [Fact]
    public async Task Seed_DataAlreadyExists_Returns409()
    {
        await _client.DeleteAsync("/api/dev/reset");
        await _client.PostAsync("/api/dev/seed", null);

        // Seeding again should fail with Conflict
        var response = await _client.PostAsync("/api/dev/seed", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    // ── DELETE /api/dev/reset ─────────────────────────────────────────

    [Fact]
    public async Task Reset_Returns200_AndClearsAllUserData()
    {
        await _client.DeleteAsync("/api/dev/reset");
        await _client.PostAsync("/api/dev/seed", null);

        // Verify there are events
        var beforeResp = await _client.GetAsync("/api/events");
        var beforeEvents = await beforeResp.Content.ReadFromJsonAsync<List<object>>();
        Assert.NotNull(beforeEvents);
        Assert.NotEmpty(beforeEvents);

        var resetResp = await _client.DeleteAsync("/api/dev/reset");
        Assert.Equal(HttpStatusCode.OK, resetResp.StatusCode);

        // After reset, no events should exist
        var afterResp = await _client.GetAsync("/api/events");
        var afterEvents = await afterResp.Content.ReadFromJsonAsync<List<object>>();
        Assert.NotNull(afterEvents);
        Assert.Empty(afterEvents);
    }

    [Fact]
    public async Task Reset_PreservesTagsAndCategories()
    {
        await _client.DeleteAsync("/api/dev/reset");

        // Tags and categories must still be available
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

    // ── DELETE /api/dev/events/{eventId} ─────────────────────────────

    [Fact]
    public async Task ResetEvent_ExistingEvent_Returns200()
    {
        await _client.DeleteAsync("/api/dev/reset");
        var seedResp = await _client.PostAsync("/api/dev/seed", null);
        var seed = await seedResp.Content.ReadFromJsonAsync<SeedResponse>();
        Assert.NotNull(seed);

        var response = await _client.DeleteAsync($"/api/dev/events/{seed.PastEventId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ResetEvent_NonexistentEvent_Returns404()
    {
        await _client.DeleteAsync("/api/dev/reset");
        var response = await _client.DeleteAsync("/api/dev/events/999999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── Seed then verify the created data is usable ───────────────────

    [Fact]
    public async Task SeedData_HostCanLoginAndSeeEvents()
    {
        await _client.DeleteAsync("/api/dev/reset");
        await _client.PostAsync("/api/dev/seed", null);

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
