using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

public sealed class OrganizersControllerTests : IAsyncLifetime, IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private HttpClient _hostClient = null!;
    private HttpClient _attendeeClient = null!;
    private int _hostId;
    private int _eventId;
    private int _bookingId;

    public OrganizersControllerTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        var (hostToken, hostId) = await ApiClient.RegisterAndGetIdAsync(
            _client, "OrgHost", "orghost@org.test", "Pass!");
        _hostId = hostId;
        _hostClient = ApiClient.WithToken(_factory, hostToken);

        var createResp = await ApiClient.CreateEventAsync(
            _hostClient, "Org Conference", price: 100m, capacity: 50);
        var ev = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        _eventId = ev!.Id;

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "OrgAttendee", "orgattendee@org.test", "Pass!");
        _attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var bookResp = await ApiClient.BookEventAsync(_attendeeClient, _eventId);
        var booking = await bookResp.Content.ReadFromJsonAsync<BookingResponse>();
        _bookingId = booking!.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    public void Dispose()
    {
        _hostClient?.Dispose();
        _attendeeClient?.Dispose();
        _client.Dispose();
        _factory.Dispose();
        GC.SuppressFinalize(this);
    }

    // ── GET /api/organizers/{id} ──────────────────────────────────────

    [Fact]
    public async Task GetPublicProfile_ExistingOrganizer_Returns200()
    {
        var response = await _client.GetAsync($"/api/organizers/{_hostId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<OrganizerPublicProfile>();
        Assert.NotNull(profile);
        Assert.Equal("OrgHost", profile.Name);
        Assert.Single(profile.Events); // one published event
    }

    [Fact]
    public async Task GetPublicProfile_NonExistent_Returns404()
    {
        var response = await _client.GetAsync("/api/organizers/999999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── GET /api/organizers/me/dashboard ─────────────────────────────

    [Fact]
    public async Task GetDashboard_Returns200_WithCorrectCounts()
    {
        var response = await _hostClient.GetAsync("/api/organizers/me/dashboard");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dashboard = await response.Content.ReadFromJsonAsync<OrganizerDashboard>();
        Assert.NotNull(dashboard);
        Assert.Equal(1, dashboard.TotalEvents);
        Assert.Equal(1, dashboard.TotalAttendees);
        Assert.Equal(100m, dashboard.TotalRevenue); // 1 confirmed × $100
    }

    [Fact]
    public async Task GetDashboard_Anonymous_Returns401()
    {
        var response = await _client.GetAsync("/api/organizers/me/dashboard");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── PUT /api/organizers/me/profile ───────────────────────────────

    [Fact]
    public async Task UpdateProfile_Returns204_AndPersistsChanges()
    {
        var resp = await _hostClient.PutAsJsonAsync("/api/organizers/me/profile",
            new { Bio = "My new bio", Website = "https://host.com",
                  TwitterHandle = (string?)null, InstagramHandle = (string?)null });

        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);

        var profileResp = await _client.GetAsync($"/api/organizers/{_hostId}");
        var profile = await profileResp.Content.ReadFromJsonAsync<OrganizerPublicProfile>();
        Assert.Equal("My new bio", profile!.Bio);
        Assert.Equal("https://host.com", profile.Website);
    }

    [Fact]
    public async Task UpdateProfile_Anonymous_Returns401()
    {
        var resp = await _client.PutAsJsonAsync("/api/organizers/me/profile",
            new { Bio = "Hacker" });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // ── GET /api/organizers/me/events/{eventId}/attendees ─────────────

    [Fact]
    public async Task GetAttendees_ByOwner_Returns200_WithAttendee()
    {
        var response = await _hostClient.GetAsync(
            $"/api/organizers/me/events/{_eventId}/attendees");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var attendees = await response.Content.ReadFromJsonAsync<List<AttendeeInfo>>();
        Assert.NotNull(attendees);
        Assert.Single(attendees);
        Assert.Equal("OrgAttendee", attendees[0].Name);
    }

    [Fact]
    public async Task GetAttendees_ByNonOwner_Returns403()
    {
        var response = await _attendeeClient.GetAsync(
            $"/api/organizers/me/events/{_eventId}/attendees");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAttendees_NonExistentEvent_Returns404()
    {
        var response = await _hostClient.GetAsync(
            "/api/organizers/me/events/999999/attendees");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── GET /api/organizers/me/events/{eventId}/attendees/export ─────

    [Fact]
    public async Task ExportAttendees_Returns200_WithCsvContentType()
    {
        var response = await _hostClient.GetAsync(
            $"/api/organizers/me/events/{_eventId}/attendees/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task ExportAttendees_ByNonOwner_Returns403()
    {
        var response = await _attendeeClient.GetAsync(
            $"/api/organizers/me/events/{_eventId}/attendees/export");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── DELETE /api/organizers/me/events/{eventId}/bookings/{bookingId}

    [Fact]
    public async Task OrganizerRefund_Returns204_AndCancelsBooking()
    {
        var resp = await _hostClient.DeleteAsync(
            $"/api/organizers/me/events/{_eventId}/bookings/{_bookingId}");

        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);

        var mineResp = await _attendeeClient.GetAsync("/api/bookings/mine");
        var bookings = await mineResp.Content.ReadFromJsonAsync<List<BookingResponse>>();
        Assert.Equal("Cancelled", bookings!.First(b => b.Id == _bookingId).Status);
    }

    [Fact]
    public async Task OrganizerRefund_AlreadyCancelled_Returns400()
    {
        await _hostClient.DeleteAsync(
            $"/api/organizers/me/events/{_eventId}/bookings/{_bookingId}");

        var resp = await _hostClient.DeleteAsync(
            $"/api/organizers/me/events/{_eventId}/bookings/{_bookingId}");

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task OrganizerRefund_ByNonOwner_Returns403()
    {
        var resp = await _attendeeClient.DeleteAsync(
            $"/api/organizers/me/events/{_eventId}/bookings/{_bookingId}");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}
