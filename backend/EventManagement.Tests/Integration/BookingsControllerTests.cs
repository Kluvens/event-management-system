using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

public class BookingsControllerTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public BookingsControllerTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private async Task<(HttpClient authedClient, int eventId)> SetupHostAndEventAsync(
        string hostSuffix, int daysFromNow = 30, int capacity = 100, decimal price = 50m)
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, $"Host{hostSuffix}", $"host{hostSuffix}@book.test", "Pass!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);
        var createResp = await ApiClient.CreateEventAsync(hostClient,
            $"Event{hostSuffix}", daysFromNow: daysFromNow, capacity: capacity, price: price);
        var ev = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        return (hostClient, ev!.Id);
    }

    // ── GET /api/bookings/mine ────────────────────────────────────────

    [Fact]
    public async Task GetMyBookings_Returns200WithList()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "BookUser1", "bookuser1@book.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var response = await authed.GetAsync("/api/bookings/mine");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bookings = await response.Content.ReadFromJsonAsync<List<BookingResponse>>();
        Assert.NotNull(bookings);
    }

    [Fact]
    public async Task GetMyBookings_Unauthenticated_Returns401()
    {
        var response = await _client.GetAsync("/api/bookings/mine");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── POST /api/bookings ────────────────────────────────────────────

    [Fact]
    public async Task Create_ValidBooking_Returns201WithLoyaltyPoints()
    {
        var (_, eventId) = await SetupHostAndEventAsync("A", price: 100m);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeA", "attendeea@book.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var response = await ApiClient.BookEventAsync(attendeeClient, eventId);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var booking = await response.Content.ReadFromJsonAsync<BookingResponse>();
        Assert.NotNull(booking);
        Assert.Equal(eventId, booking.EventId);
        Assert.Equal("Confirmed", booking.Status);
        // 10 points per dollar (100 * 10 = 1000), no discount for Standard tier
        Assert.Equal(1000, booking.PointsEarned);
    }

    [Fact]
    public async Task Create_FullyBookedEvent_Returns400()
    {
        // Create event with capacity 1
        var (_, eventId) = await SetupHostAndEventAsync("B", capacity: 1);

        // First attendee books successfully
        var attendee1Token = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeB1", "attendeeb1@book.test", "Pass!");
        var attendee1 = ApiClient.WithToken(_factory, attendee1Token);
        var r1 = await ApiClient.BookEventAsync(attendee1, eventId);
        Assert.Equal(HttpStatusCode.Created, r1.StatusCode);

        // Second attendee gets 400
        var attendee2Token = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeB2", "attendeeb2@book.test", "Pass!");
        var attendee2 = ApiClient.WithToken(_factory, attendee2Token);
        var r2 = await ApiClient.BookEventAsync(attendee2, eventId);
        Assert.Equal(HttpStatusCode.BadRequest, r2.StatusCode);
    }

    [Fact]
    public async Task Create_CancelledEvent_Returns400()
    {
        var (hostClient, eventId) = await SetupHostAndEventAsync("C");
        await hostClient.PostAsync($"/api/events/{eventId}/cancel", null);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeC", "attendeec@book.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var response = await ApiClient.BookEventAsync(attendeeClient, eventId);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_DuplicateBooking_Returns409()
    {
        var (_, eventId) = await SetupHostAndEventAsync("D");

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeD", "attendeed@book.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        await ApiClient.BookEventAsync(attendeeClient, eventId);
        var response = await ApiClient.BookEventAsync(attendeeClient, eventId);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Create_LoyaltyDiscountApplied_ForBronzeTier()
    {
        // To get Bronze we need 1000 points → book a $100 event first
        var (_, event1Id) = await SetupHostAndEventAsync("E1", price: 100m);
        var (_, event2Id) = await SetupHostAndEventAsync("E2", price: 100m);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeE", "attendeee@book.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        // First booking: 1000 points earned (no discount yet, Standard tier)
        var r1 = await ApiClient.BookEventAsync(attendeeClient, event1Id);
        var b1 = await r1.Content.ReadFromJsonAsync<BookingResponse>();
        Assert.Equal(1000, b1!.PointsEarned);

        // Now at Bronze (1000 pts), 5% discount on $100 = $95, points = 950
        var r2 = await ApiClient.BookEventAsync(attendeeClient, event2Id);
        var b2 = await r2.Content.ReadFromJsonAsync<BookingResponse>();
        Assert.Equal(950, b2!.PointsEarned);
    }

    // ── DELETE /api/bookings/{id} ─────────────────────────────────────

    [Fact]
    public async Task Cancel_MoreThan7DaysBeforeEvent_Returns204()
    {
        var (_, eventId) = await SetupHostAndEventAsync("F", daysFromNow: 30);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeF", "attendeef@book.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var bookResp = await ApiClient.BookEventAsync(attendeeClient, eventId);
        var booking = await bookResp.Content.ReadFromJsonAsync<BookingResponse>();
        Assert.NotNull(booking);

        var cancelResp = await attendeeClient.DeleteAsync($"/api/bookings/{booking.Id}");
        Assert.Equal(HttpStatusCode.NoContent, cancelResp.StatusCode);
    }

    [Fact]
    public async Task Cancel_Within7DaysOfEvent_Returns400()
    {
        // Event starts in 3 days → within 7-day rule
        var (_, eventId) = await SetupHostAndEventAsync("G", daysFromNow: 3);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeG", "attendeeg@book.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var bookResp = await ApiClient.BookEventAsync(attendeeClient, eventId);
        var booking = await bookResp.Content.ReadFromJsonAsync<BookingResponse>();
        Assert.NotNull(booking);

        var cancelResp = await attendeeClient.DeleteAsync($"/api/bookings/{booking.Id}");
        Assert.Equal(HttpStatusCode.BadRequest, cancelResp.StatusCode);
    }

    [Fact]
    public async Task Cancel_Within7Days_ButEventCancelled_Returns204()
    {
        // Event starts in 3 days (within 7-day rule), but event is cancelled
        var (hostClient, eventId) = await SetupHostAndEventAsync("H", daysFromNow: 3);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeH", "attendeeh@book.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var bookResp = await ApiClient.BookEventAsync(attendeeClient, eventId);
        var booking = await bookResp.Content.ReadFromJsonAsync<BookingResponse>();
        Assert.NotNull(booking);

        // Host cancels the event — waives the 7-day rule
        await hostClient.PostAsync($"/api/events/{eventId}/cancel", null);

        var cancelResp = await attendeeClient.DeleteAsync($"/api/bookings/{booking.Id}");
        Assert.Equal(HttpStatusCode.NoContent, cancelResp.StatusCode);
    }

    [Fact]
    public async Task Cancel_AlreadyCancelledBooking_Returns400()
    {
        var (_, eventId) = await SetupHostAndEventAsync("I", daysFromNow: 30);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeI", "attendeei@book.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var bookResp = await ApiClient.BookEventAsync(attendeeClient, eventId);
        var booking = await bookResp.Content.ReadFromJsonAsync<BookingResponse>();
        Assert.NotNull(booking);

        await attendeeClient.DeleteAsync($"/api/bookings/{booking.Id}");
        var second = await attendeeClient.DeleteAsync($"/api/bookings/{booking.Id}");

        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
    }

    [Fact]
    public async Task Cancel_OtherUsersBooking_Returns403()
    {
        var (_, eventId) = await SetupHostAndEventAsync("J", daysFromNow: 30);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeJ", "attendeej@book.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var bookResp = await ApiClient.BookEventAsync(attendeeClient, eventId);
        var booking = await bookResp.Content.ReadFromJsonAsync<BookingResponse>();
        Assert.NotNull(booking);

        var otherToken = await ApiClient.RegisterAndLoginAsync(
            _client, "OtherJ", "otherj@book.test", "Pass!");
        var otherClient = ApiClient.WithToken(_factory, otherToken);

        var response = await otherClient.DeleteAsync($"/api/bookings/{booking.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Cancel_DeductsLoyaltyPoints()
    {
        var (_, eventId) = await SetupHostAndEventAsync("K", daysFromNow: 30, price: 100m);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeK", "attendeek@book.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var bookResp = await ApiClient.BookEventAsync(attendeeClient, eventId);
        var booking = await bookResp.Content.ReadFromJsonAsync<BookingResponse>();
        Assert.NotNull(booking);
        Assert.Equal(1000, booking.PointsEarned);

        await attendeeClient.DeleteAsync($"/api/bookings/{booking.Id}");

        // After cancellation, the booking list should show no active bookings
        var mineResp = await attendeeClient.GetAsync("/api/bookings/mine");
        var bookings = await mineResp.Content.ReadFromJsonAsync<List<BookingResponse>>();
        Assert.NotNull(bookings);
        var cancelled = bookings.FirstOrDefault(b => b.Id == booking.Id);
        Assert.NotNull(cancelled);
        Assert.Equal("Cancelled", cancelled.Status);
    }

    // ── DELETE /api/bookings/events/{eventId}/mine ────────────────────

    [Fact]
    public async Task CancelAllForEvent_MoreThan7Days_Returns204()
    {
        var (_, eventId) = await SetupHostAndEventAsync("L", daysFromNow: 30);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeL", "attendeel@book.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        await ApiClient.BookEventAsync(attendeeClient, eventId);

        var response = await attendeeClient.DeleteAsync($"/api/bookings/events/{eventId}/mine");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task CancelAllForEvent_NoActiveBookings_Returns404()
    {
        var (_, eventId) = await SetupHostAndEventAsync("M", daysFromNow: 30);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeM", "attendeem@book.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        // No booking made — should 404
        var response = await attendeeClient.DeleteAsync($"/api/bookings/events/{eventId}/mine");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CancelThenRebook_ReactivatesCancelledBooking()
    {
        var (_, eventId) = await SetupHostAndEventAsync("N", daysFromNow: 30);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AttendeeN", "attendeen@book.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var bookResp = await ApiClient.BookEventAsync(attendeeClient, eventId);
        var booking = await bookResp.Content.ReadFromJsonAsync<BookingResponse>();
        Assert.NotNull(booking);

        await attendeeClient.DeleteAsync($"/api/bookings/{booking.Id}");

        // Rebook the same event
        var rebookResp = await ApiClient.BookEventAsync(attendeeClient, eventId);
        Assert.Equal(HttpStatusCode.OK, rebookResp.StatusCode);

        var rebooked = await rebookResp.Content.ReadFromJsonAsync<BookingResponse>();
        Assert.Equal("Confirmed", rebooked!.Status);
    }
}
