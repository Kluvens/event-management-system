using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Extended coverage for /api/bookings/* that complements BookingsControllerTests.
/// Covers: suspended-user booking guard, non-owner check-in rejection,
/// invalid QR token handling, and suspended-event booking guard.
/// </summary>
public sealed class BookingsControllerExtendedTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public BookingsControllerExtendedTests()
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

    // ── Helpers ───────────────────────────────────────────────────────

    private async Task<HttpClient> MakeAdminClientAsync()
    {
        var token = await ApiClient.RegisterSuperAdminAsync(
            _client, "SA Booking", "sabooking@bk.test", "Password1!",
            CustomWebApplicationFactory.TestAdminKey);
        return ApiClient.WithToken(_factory, token);
    }

    private async Task<(HttpClient hostClient, int eventId)> SetupPublishedEventAsync(
        string suffix, int capacity = 50, decimal price = 0m)
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, $"BKHost{suffix}", $"bkhost{suffix}@bk.test", "Password1!");
        var hostClient = ApiClient.WithToken(_factory, token);
        var resp = await ApiClient.CreateEventAsync(hostClient, $"BKEvent{suffix}",
            capacity: capacity, price: price);
        var ev = await resp.Content.ReadFromJsonAsync<EventResponse>();
        return (hostClient, ev!.Id);
    }

    // ── Suspended user cannot book ────────────────────────────────────

    [Fact]
    public async Task Create_SuspendedUser_Returns403()
    {
        var (_, eventId) = await SetupPublishedEventAsync("SU");
        var adminClient = await MakeAdminClientAsync();

        var (attendeeToken, attendeeId) = await ApiClient.RegisterAndGetIdAsync(
            _client, "SuspUser", "suspuser@bk.test", "Password1!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        // Suspend the attendee
        await adminClient.PostAsync($"/api/admin/users/{attendeeId}/suspend", null);

        var response = await ApiClient.BookEventAsync(attendeeClient, eventId);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── Suspended event cannot be booked ─────────────────────────────

    [Fact]
    public async Task Create_SuspendedEvent_Returns400()
    {
        var (_, eventId) = await SetupPublishedEventAsync("SE");
        var adminClient = await MakeAdminClientAsync();

        await adminClient.PostAsync($"/api/admin/events/{eventId}/suspend", null);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttSuspEvent", "attsuspevent@bk.test", "Password1!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var response = await ApiClient.BookEventAsync(attendeeClient, eventId);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── Non-owner cannot check in via booking ID ──────────────────────

    [Fact]
    public async Task Checkin_ByNonOwner_Returns403()
    {
        var (_, eventId) = await SetupPublishedEventAsync("NCI");

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttNCI", "attnci@bk.test", "Password1!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);
        var bookResp = await ApiClient.BookEventAsync(attendeeClient, eventId);
        var booking = await bookResp.Content.ReadFromJsonAsync<BookingResponse>();

        // A third party (neither organiser nor admin) attempts check-in
        var otherToken = await ApiClient.RegisterAndLoginAsync(
            _client, "OtherNCI", "othernci@bk.test", "Password1!");
        var otherClient = ApiClient.WithToken(_factory, otherToken);

        var response = await otherClient.PostAsync(
            $"/api/bookings/{booking!.Id}/checkin", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── Non-owner cannot check in via QR token ────────────────────────

    [Fact]
    public async Task CheckinViaToken_ByNonOwner_Returns403()
    {
        var (_, eventId) = await SetupPublishedEventAsync("NCIT");

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttNCIT", "attncit@bk.test", "Password1!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);
        var bookResp = await ApiClient.BookEventAsync(attendeeClient, eventId);
        var booking = await bookResp.Content.ReadFromJsonAsync<BookingResponse>();

        var otherToken = await ApiClient.RegisterAndLoginAsync(
            _client, "OtherNCIT", "otherncit@bk.test", "Password1!");
        var otherClient = ApiClient.WithToken(_factory, otherToken);

        var response = await otherClient.PostAsync(
            $"/api/bookings/checkin/{booking!.CheckInToken}", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── Invalid QR token returns 404 ─────────────────────────────────

    [Fact]
    public async Task GetCheckinInfo_InvalidToken_Returns404()
    {
        // GET /checkin/{token} is under the class-level [Authorize], so we need any valid token
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "TokenLookup", "tokenlookup@bk.test", "Password1!");
        var authed = ApiClient.WithToken(_factory, token);

        var response = await authed.GetAsync("/api/bookings/checkin/totally-fake-token");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CheckinViaToken_InvalidToken_Returns404()
    {
        var (hostClient, _) = await SetupPublishedEventAsync("INVT");

        var response = await hostClient.PostAsync(
            "/api/bookings/checkin/totally-fake-token", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── Cancelled booking cannot be checked in ────────────────────────

    [Fact]
    public async Task Checkin_CancelledBooking_Returns400()
    {
        var (hostClient, eventId) = await SetupPublishedEventAsync("CXCI", price: 0m);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "CXCIAtt", "cxciatt@bk.test", "Password1!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var bookResp = await ApiClient.BookEventAsync(attendeeClient, eventId);
        var booking  = await bookResp.Content.ReadFromJsonAsync<BookingResponse>();

        // Host cancels the event, then attendee cancels their booking
        await hostClient.PostAsync($"/api/events/{eventId}/cancel", null);
        await attendeeClient.DeleteAsync($"/api/bookings/{booking!.Id}");

        // Now host tries to check in the cancelled booking
        var response = await hostClient.PostAsync(
            $"/api/bookings/{booking.Id}/checkin", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── Booking a non-existent event ──────────────────────────────────

    [Fact]
    public async Task Create_NonExistentEvent_Returns404()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "GhostAtt", "ghostatt@bk.test", "Password1!");
        var authed = ApiClient.WithToken(_factory, token);

        var response = await ApiClient.BookEventAsync(authed, 999999);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── Cancel non-existent booking ───────────────────────────────────

    [Fact]
    public async Task Cancel_NonExistentBooking_Returns404()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "GhostCancel", "ghostcancel@bk.test", "Password1!");
        var authed = ApiClient.WithToken(_factory, token);

        var response = await authed.DeleteAsync("/api/bookings/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
