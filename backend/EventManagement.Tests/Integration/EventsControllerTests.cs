using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

public sealed class EventsControllerTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public EventsControllerTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        GC.SuppressFinalize(this);
    }

    // ── GET /api/events ───────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsOnlyPublicEventsForAnonymousUser()
    {
        // Host creates one public and one private event
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Host1", "host1@events.test", "Pass!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);

        await ApiClient.CreateEventAsync(hostClient, "Public Event", isPublic: true);
        await ApiClient.CreateEventAsync(hostClient, "Private Event", isPublic: false);

        var response = await _client.GetAsync("/api/events");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var events = await response.Content.ReadFromJsonAsync<List<EventResponse>>();
        Assert.NotNull(events);
        Assert.DoesNotContain(events, e => e.Title == "Private Event");
    }

    [Fact]
    public async Task GetAll_AuthenticatedOwner_SeesBothPublicAndOwnPrivate()
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Host2", "host2@events.test", "Pass!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);

        await ApiClient.CreateEventAsync(hostClient, "Pub2", isPublic: true);
        await ApiClient.CreateEventAsync(hostClient, "Priv2", isPublic: false);

        var response = await hostClient.GetAsync("/api/events");
        var events = await response.Content.ReadFromJsonAsync<List<EventResponse>>();
        Assert.NotNull(events);
        Assert.Contains(events, e => e.Title == "Pub2");
        Assert.Contains(events, e => e.Title == "Priv2");
    }

    [Fact]
    public async Task GetAll_SearchFilter_ReturnsMatchingEvents()
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Host3", "host3@events.test", "Pass!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);

        await ApiClient.CreateEventAsync(hostClient, "Unique XYZ Conference",
            description: "Advanced topics", location: "Melbourne");

        var response = await _client.GetAsync("/api/events?search=XYZ");
        var events = await response.Content.ReadFromJsonAsync<List<EventResponse>>();
        Assert.NotNull(events);
        Assert.Contains(events, e => e.Title.Contains("XYZ"));
    }

    [Fact]
    public async Task GetAll_CategoryFilter_ReturnsOnlyThatCategory()
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Host4", "host4@events.test", "Pass!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);

        // Category 2 = Workshop, Category 3 = Concert
        await ApiClient.CreateEventAsync(hostClient, "Workshop Event", categoryId: 2);
        await ApiClient.CreateEventAsync(hostClient, "Concert Event", categoryId: 3);

        var response = await _client.GetAsync("/api/events?categoryId=2");
        var events = await response.Content.ReadFromJsonAsync<List<EventResponse>>();
        Assert.NotNull(events);
        Assert.All(events, e => Assert.Equal(2, e.CategoryId));
    }

    [Fact]
    public async Task GetAll_SortByPrice_ReturnsCheapestFirst()
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Host5", "host5@events.test", "Pass!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);

        await ApiClient.CreateEventAsync(hostClient, "Expensive", price: 200m);
        await ApiClient.CreateEventAsync(hostClient, "Cheap", price: 10m);

        var response = await _client.GetAsync("/api/events?sortBy=price");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var events = await response.Content.ReadFromJsonAsync<List<EventResponse>>();
        Assert.NotNull(events);

        // Prices should be non-decreasing
        for (int i = 1; i < events.Count; i++)
            Assert.True(events[i].Price >= events[i - 1].Price);
    }

    // ── GET /api/events/{id} ──────────────────────────────────────────

    [Fact]
    public async Task GetById_ExistingPublicEvent_Returns200()
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Host6", "host6@events.test", "Pass!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);

        var createResp = await ApiClient.CreateEventAsync(hostClient, "Single Event");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        var response = await _client.GetAsync($"/api/events/{created.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var ev = await response.Content.ReadFromJsonAsync<EventResponse>();
        Assert.Equal("Single Event", ev!.Title);
    }

    [Fact]
    public async Task GetById_NotFound_Returns404()
    {
        var response = await _client.GetAsync("/api/events/999999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetById_PrivateEvent_OtherUser_Returns404()
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Host7", "host7@events.test", "Pass!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);

        var createResp = await ApiClient.CreateEventAsync(hostClient, "My Secret", isPublic: false);
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        // Another user tries to access it
        var otherToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Other7", "other7@events.test", "Pass!");
        var otherClient = ApiClient.WithToken(_factory, otherToken);

        var response = await otherClient.GetAsync($"/api/events/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── POST /api/events ──────────────────────────────────────────────

    [Fact]
    public async Task Create_Authenticated_Returns201()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Creator", "creator@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var response = await ApiClient.CreateEventAsync(authed, "My Conference",
            price: 49.99m, isPublic: true, categoryId: 1, draft: true);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var ev = await response.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(ev);
        Assert.Equal("My Conference", ev.Title);
        Assert.Equal(49.99m, ev.Price);
        Assert.Equal("Draft", ev.Status);
    }

    [Fact]
    public async Task Create_Unauthenticated_Returns401()
    {
        var response = await ApiClient.CreateEventAsync(_client, "Anon Event");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithTags_ReturnsEventWithTagNames()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Tagger", "tagger@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var response = await ApiClient.CreateEventAsync(authed, "Tech Talk",
            tagIds: new List<int> { 2, 7 }); // Technology + Education

        var ev = await response.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(ev);
        Assert.Contains("Technology", ev.Tags);
        Assert.Contains("Education", ev.Tags);
    }

    // ── PUT /api/events/{id} ──────────────────────────────────────────

    [Fact]
    public async Task Update_ByOwner_Returns204()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Updater", "updater@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var createResp = await ApiClient.CreateEventAsync(authed, "Old Title");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        var start = DateTime.UtcNow.AddDays(30);
        var updateResp = await authed.PutAsJsonAsync($"/api/events/{created.Id}",
            new UpdateEventRequest("New Title", "Desc", "Location",
                start, start.AddHours(2), 100, 0m, true, 1, null));

        Assert.Equal(HttpStatusCode.NoContent, updateResp.StatusCode);

        var getResp = await _client.GetAsync($"/api/events/{created.Id}");
        var updated = await getResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.Equal("New Title", updated!.Title);
    }

    [Fact]
    public async Task Update_ByNonOwner_Returns403()
    {
        var ownerToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Owner8", "owner8@events.test", "Pass!");
        var ownerClient = ApiClient.WithToken(_factory, ownerToken);

        var createResp = await ApiClient.CreateEventAsync(ownerClient, "Owner's Event");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        var otherToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Other8", "other8@events.test", "Pass!");
        var otherClient = ApiClient.WithToken(_factory, otherToken);

        var start = DateTime.UtcNow.AddDays(30);
        var response = await otherClient.PutAsJsonAsync($"/api/events/{created.Id}",
            new UpdateEventRequest("Hijacked", "Desc", "Loc",
                start, start.AddHours(2), 100, 0m, true, 1, null));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── POST /api/events/{id}/cancel ──────────────────────────────────

    [Fact]
    public async Task Cancel_ByOwner_Returns204AndSetsStatusCancelled()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Canceller", "canceller@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var createResp = await ApiClient.CreateEventAsync(authed, "Event to Cancel");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        var cancelResp = await authed.PostAsync($"/api/events/{created.Id}/cancel", null);
        Assert.Equal(HttpStatusCode.NoContent, cancelResp.StatusCode);

        var getResp = await authed.GetAsync($"/api/events/{created.Id}");
        var ev = await getResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.Equal("Cancelled", ev!.Status);
    }

    [Fact]
    public async Task Cancel_AlreadyCancelled_Returns400()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Canceller2", "canceller2@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var createResp = await ApiClient.CreateEventAsync(authed, "Double Cancel");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        await authed.PostAsync($"/api/events/{created.Id}/cancel", null);
        var response = await authed.PostAsync($"/api/events/{created.Id}/cancel", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── POST /api/events/{id}/postpone ────────────────────────────────

    [Fact]
    public async Task Postpone_ByOwner_Returns204AndSetsStatusPostponed()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Postponer", "postponer@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var createResp = await ApiClient.CreateEventAsync(authed, "Event to Postpone");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        var newStart = DateTime.UtcNow.AddDays(60);
        var postponeResp = await authed.PostAsJsonAsync(
            $"/api/events/{created.Id}/postpone",
            new PostponeEventRequest(newStart, newStart.AddHours(2)));

        Assert.Equal(HttpStatusCode.NoContent, postponeResp.StatusCode);

        var getResp = await authed.GetAsync($"/api/events/{created.Id}");
        var ev = await getResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.Equal("Postponed", ev!.Status);
        Assert.NotNull(ev.PostponedDate);
    }

    [Fact]
    public async Task Postpone_CancelledEvent_Returns400()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "PostpCan", "postpcan@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var createResp = await ApiClient.CreateEventAsync(authed, "Cancel Then Postpone");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        await authed.PostAsync($"/api/events/{created.Id}/cancel", null);

        var newStart = DateTime.UtcNow.AddDays(60);
        var response = await authed.PostAsJsonAsync(
            $"/api/events/{created.Id}/postpone",
            new PostponeEventRequest(newStart, newStart.AddHours(2)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── GET /api/events/{id}/stats ────────────────────────────────────

    [Fact]
    public async Task GetStats_ByOwner_Returns200()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "StatsOwner", "statsowner@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var createResp = await ApiClient.CreateEventAsync(authed, "Stats Event");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        var response = await authed.GetAsync($"/api/events/{created.Id}/stats");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var stats = await response.Content.ReadFromJsonAsync<EventStatsResponse>();
        Assert.NotNull(stats);
        Assert.Equal(created.Id, stats.EventId);
        Assert.Equal(0, stats.ConfirmedBookings);
    }

    [Fact]
    public async Task GetStats_ByNonOwner_Returns403()
    {
        var ownerToken = await ApiClient.RegisterAndLoginAsync(
            _client, "StatsOwner2", "statsowner2@events.test", "Pass!");
        var ownerClient = ApiClient.WithToken(_factory, ownerToken);

        var createResp = await ApiClient.CreateEventAsync(ownerClient, "Stats Event 2");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        var otherToken = await ApiClient.RegisterAndLoginAsync(
            _client, "StatsOther", "statsother@events.test", "Pass!");
        var otherClient = ApiClient.WithToken(_factory, otherToken);

        var response = await otherClient.GetAsync($"/api/events/{created.Id}/stats");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── DELETE /api/events/{id} ───────────────────────────────────────

    [Fact]
    public async Task Delete_ByOwner_Returns204()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Deleter", "deleter@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var createResp = await ApiClient.CreateEventAsync(authed, "To Delete");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        var deleteResp = await authed.DeleteAsync($"/api/events/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        var getResp = await _client.GetAsync($"/api/events/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResp.StatusCode);
    }

    // ── Announcements ─────────────────────────────────────────────────

    [Fact]
    public async Task GetAnnouncements_Returns200WithList()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Announcer", "announcer@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var createResp = await ApiClient.CreateEventAsync(authed, "Announce Event");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        var response = await _client.GetAsync($"/api/events/{created.Id}/announcements");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task CreateAnnouncement_ByOwner_Returns201()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Announcer2", "announcer2@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var createResp = await ApiClient.CreateEventAsync(authed, "Announce Event 2");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        var response = await authed.PostAsJsonAsync(
            $"/api/events/{created.Id}/announcements",
            new { Title = "Important Update", Message = "Check the schedule." });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task CreateAnnouncement_ByNonOwner_Returns403()
    {
        var ownerToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AnnouncerOwner", "announcerowner@events.test", "Pass!");
        var ownerClient = ApiClient.WithToken(_factory, ownerToken);

        var createResp = await ApiClient.CreateEventAsync(ownerClient, "Announce Event 3");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        var otherToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AnnouncerOther", "announcerother@events.test", "Pass!");
        var otherClient = ApiClient.WithToken(_factory, otherToken);

        var response = await otherClient.PostAsJsonAsync(
            $"/api/events/{created.Id}/announcements",
            new { Title = "Hack", Message = "Hacked!" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── Draft / Publish lifecycle ─────────────────────────────────────

    [Fact]
    public async Task Create_DefaultsToDraft_NotVisibleToPublic()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "DraftHost", "drafthost@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        // Create without publishing
        var createResp = await ApiClient.CreateEventAsync(authed, "Secret Draft", draft: true);
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);
        Assert.Equal("Draft", created.Status);

        // Anonymous user cannot see it in the listing
        var allResp = await _client.GetAsync("/api/events");
        var events = await allResp.Content.ReadFromJsonAsync<List<EventResponse>>();
        Assert.DoesNotContain(events!, e => e.Id == created.Id);

        // Anonymous user gets 404 on direct access
        var getResp = await _client.GetAsync($"/api/events/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResp.StatusCode);
    }

    [Fact]
    public async Task Publish_DraftEvent_Returns204_AndEventBecomesVisible()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Publisher", "publisher@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var createResp = await ApiClient.CreateEventAsync(authed, "To Publish", draft: true);
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        // Not yet visible to the public
        var before = await _client.GetAsync($"/api/events/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, before.StatusCode);

        // Publish
        var publishResp = await authed.PostAsync($"/api/events/{created.Id}/publish", null);
        Assert.Equal(HttpStatusCode.NoContent, publishResp.StatusCode);

        // Now visible and status is Published
        var after = await _client.GetAsync($"/api/events/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, after.StatusCode);
        var ev = await after.Content.ReadFromJsonAsync<EventResponse>();
        Assert.Equal("Published", ev!.Status);
    }

    [Fact]
    public async Task Publish_NonDraftEvent_Returns400()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Publisher2", "publisher2@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        // CreateEventAsync auto-publishes by default
        var createResp = await ApiClient.CreateEventAsync(authed, "Already Published");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        // Trying to publish again should fail
        var resp = await authed.PostAsync($"/api/events/{created.Id}/publish", null);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Cancel_AutoPostsAnnouncement()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "CancelAnn", "cancelann@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var createResp = await ApiClient.CreateEventAsync(authed, "Cancel Announce");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        await authed.PostAsync($"/api/events/{created.Id}/cancel", null);

        var annResp = await authed.GetAsync($"/api/events/{created.Id}/announcements");
        var announcements = await annResp.Content.ReadFromJsonAsync<List<AnnouncementResponse>>();
        Assert.NotNull(announcements);
        Assert.Contains(announcements, a => a.Title == "Event Cancelled");
    }

    [Fact]
    public async Task Postpone_AutoPostsAnnouncement()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "PostpAnn", "postpann@events.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var createResp = await ApiClient.CreateEventAsync(authed, "Postpone Announce");
        var created = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(created);

        var newStart = DateTime.UtcNow.AddDays(60);
        await authed.PostAsJsonAsync($"/api/events/{created.Id}/postpone",
            new PostponeEventRequest(newStart, newStart.AddHours(2)));

        var annResp = await authed.GetAsync($"/api/events/{created.Id}/announcements");
        var announcements = await annResp.Content.ReadFromJsonAsync<List<AnnouncementResponse>>();
        Assert.NotNull(announcements);
        Assert.Contains(announcements, a => a.Title == "Event Postponed");
    }
}
