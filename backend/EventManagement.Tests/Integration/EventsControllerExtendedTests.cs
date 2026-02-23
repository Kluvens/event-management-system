using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Extended coverage for /api/events/* that complements EventsControllerTests.
/// Covers: suspended-event visibility, tag-based filtering, date-range filtering,
/// popularity sort, and the suspended-event booking guard.
/// </summary>
public sealed class EventsControllerExtendedTests : IAsyncLifetime, IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private HttpClient _adminClient = null!;
    private HttpClient _hostClient = null!;
    private int _publishedEventId;

    public EventsControllerExtendedTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        // SuperAdmin for suspension tests
        var saToken = await ApiClient.RegisterSuperAdminAsync(
            _client, "SA Events Ext", "saevext@ev.test", "Password1!",
            CustomWebApplicationFactory.TestAdminKey);
        _adminClient = ApiClient.WithToken(_factory, saToken);

        // Regular host
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "ExtHost", "exthost@ev.test", "Password1!");
        _hostClient = ApiClient.WithToken(_factory, hostToken);

        var createResp = await ApiClient.CreateEventAsync(_hostClient, "Ext Published Event");
        var ev = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        _publishedEventId = ev!.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    public void Dispose()
    {
        _adminClient?.Dispose();
        _hostClient?.Dispose();
        _client.Dispose();
        _factory.Dispose();
        GC.SuppressFinalize(this);
    }

    // ── Suspended event visibility ────────────────────────────────────

    [Fact]
    public async Task GetById_SuspendedEvent_Returns404ForAnonymousUser()
    {
        await _adminClient.PostAsync($"/api/admin/events/{_publishedEventId}/suspend", null);

        var response = await _client.GetAsync($"/api/events/{_publishedEventId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetById_SuspendedEvent_Returns404ForOwner()
    {
        await _adminClient.PostAsync($"/api/admin/events/{_publishedEventId}/suspend", null);

        // Even the event owner cannot see a suspended event through the public endpoint
        var response = await _hostClient.GetAsync($"/api/events/{_publishedEventId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetById_SuspendedEvent_Returns200ForSuperAdmin()
    {
        await _adminClient.PostAsync($"/api/admin/events/{_publishedEventId}/suspend", null);

        // SuperAdmin can still see suspended events
        var response = await _adminClient.GetAsync($"/api/events/{_publishedEventId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_SuspendedEvent_NotReturnedForAnonymousUser()
    {
        await _adminClient.PostAsync($"/api/admin/events/{_publishedEventId}/suspend", null);

        var response = await _client.GetAsync("/api/events");
        var events = await response.Content.ReadFromJsonAsync<List<EventResponse>>();
        Assert.NotNull(events);
        Assert.DoesNotContain(events, e => e.Id == _publishedEventId);
    }

    // ── Booking a suspended event is rejected ─────────────────────────

    [Fact]
    public async Task BookSuspendedEvent_Returns400()
    {
        await _adminClient.PostAsync($"/api/admin/events/{_publishedEventId}/suspend", null);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "SuspAtt", "suspatt@ev.test", "Password1!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var response = await ApiClient.BookEventAsync(attendeeClient, _publishedEventId);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── Tag filter ────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_TagFilter_ReturnsOnlyEventsWithThatTag()
    {
        // Create event with tag 2 (Technology)
        await ApiClient.CreateEventAsync(_hostClient, "Tech Event Tag", tagIds: new List<int> { 2 });
        // Create event with tag 4 (Arts)
        await ApiClient.CreateEventAsync(_hostClient, "Arts Event Tag", tagIds: new List<int> { 4 });

        var response = await _client.GetAsync("/api/events?tagIds=2");
        var events = await response.Content.ReadFromJsonAsync<List<EventResponse>>();
        Assert.NotNull(events);
        Assert.NotEmpty(events);
        Assert.All(events, e => Assert.Contains("Technology", e.Tags));
    }

    // ── Date-range filter ─────────────────────────────────────────────

    [Fact]
    public async Task GetAll_DateRangeFilter_ReturnsOnlyEventsInRange()
    {
        var from = DateTime.UtcNow.AddDays(20);
        var to   = DateTime.UtcNow.AddDays(40);

        // This event falls inside the range (default daysFromNow=30)
        await ApiClient.CreateEventAsync(_hostClient, "InRange Event");
        // This event falls outside (5 days from now — before `from`)
        await ApiClient.CreateEventAsync(_hostClient, "OutRange Event", daysFromNow: 5);

        var response = await _client.GetAsync(
            $"/api/events?from={from:o}&to={to:o}");
        var events = await response.Content.ReadFromJsonAsync<List<EventResponse>>();
        Assert.NotNull(events);
        Assert.Contains(events, e => e.Title == "InRange Event");
        Assert.DoesNotContain(events, e => e.Title == "OutRange Event");
    }

    // ── Popularity sort ───────────────────────────────────────────────

    [Fact]
    public async Task GetAll_SortByPopularity_MostBookedFirst()
    {
        var unpopToken = await ApiClient.RegisterAndLoginAsync(
            _client, "PopHost1", "pophost1@ev.test", "Password1!");
        var unpopClient = ApiClient.WithToken(_factory, unpopToken);

        var popToken = await ApiClient.RegisterAndLoginAsync(
            _client, "PopHost2", "pophost2@ev.test", "Password1!");
        var popClient = ApiClient.WithToken(_factory, popToken);

        // Event with 0 bookings
        await ApiClient.CreateEventAsync(unpopClient, "Unpopular");

        // Event with 1 booking
        var popResp = await ApiClient.CreateEventAsync(popClient, "Popular");
        var popEv   = await popResp.Content.ReadFromJsonAsync<EventResponse>();
        var attToken = await ApiClient.RegisterAndLoginAsync(
            _client, "PopAtt", "popatt@ev.test", "Password1!");
        await ApiClient.BookEventAsync(ApiClient.WithToken(_factory, attToken), popEv!.Id);

        var response = await _client.GetAsync("/api/events?sortBy=popularity");
        var events   = await response.Content.ReadFromJsonAsync<List<EventResponse>>();
        Assert.NotNull(events);
        Assert.True(events.Count >= 2);

        // Popular event should come before unpopular (higher booking count first)
        var popularIndex   = events.FindIndex(e => e.Title == "Popular");
        var unpopularIndex = events.FindIndex(e => e.Title == "Unpopular");
        Assert.True(popularIndex < unpopularIndex,
            "Event with more bookings should appear before event with fewer bookings");
    }

    // ── Stats endpoint ────────────────────────────────────────────────

    [Fact]
    public async Task GetStats_AfterBooking_ReflectsCorrectCounts()
    {
        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "StatsAtt", "statsatt@ev.test", "Password1!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);
        await ApiClient.BookEventAsync(attendeeClient, _publishedEventId);

        var response = await _hostClient.GetAsync($"/api/events/{_publishedEventId}/stats");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var stats = await response.Content.ReadFromJsonAsync<EventStatsResponse>();
        Assert.NotNull(stats);
        Assert.Equal(1, stats.ConfirmedBookings);
    }

    // ── Publish guards ────────────────────────────────────────────────

    [Fact]
    public async Task Publish_ByNonOwner_Returns403()
    {
        var draftResp = await ApiClient.CreateEventAsync(_hostClient, "NotYours", draft: true);
        var draft = await draftResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(draft);

        var otherToken = await ApiClient.RegisterAndLoginAsync(
            _client, "OtherPublish", "otherpublish@ev.test", "Password1!");
        var otherClient = ApiClient.WithToken(_factory, otherToken);

        var response = await otherClient.PostAsync($"/api/events/{draft.Id}/publish", null);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── Delete ────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_ByNonOwner_Returns403()
    {
        var createResp = await ApiClient.CreateEventAsync(_hostClient, "Delete Guard");
        var ev = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(ev);

        var otherToken = await ApiClient.RegisterAndLoginAsync(
            _client, "DeleteOther", "deleteother@ev.test", "Password1!");
        var otherClient = ApiClient.WithToken(_factory, otherToken);

        var response = await otherClient.DeleteAsync($"/api/events/{ev.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
