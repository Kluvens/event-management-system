using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Integration tests for waitlist: join, position, leave, auto-promotion on cancellation.
/// </summary>
public sealed class WaitlistControllerTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public WaitlistControllerTests()
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

    // ── Helpers ────────────────────────────────────────────────────────

    private async Task<(HttpClient client, string token)> RegisterUserAsync(string suffix)
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, $"WLUser{suffix}", $"wluser{suffix}@wl.test", "Password1!");
        return (ApiClient.WithToken(_factory, token), token);
    }

    private async Task<(HttpClient hostClient, int eventId)> SetupFullEventAsync(
        string suffix, int capacity = 1)
    {
        var (hostClient, _) = await RegisterUserAsync($"Host{suffix}");
        var resp = await ApiClient.CreateEventAsync(hostClient, $"WLEvent{suffix}",
            capacity: capacity, price: 0m);
        var ev = await resp.Content.ReadFromJsonAsync<EventResponse>();

        // Fill the event completely so it's sold out
        for (int i = 0; i < capacity; i++)
        {
            var (attendeeClient, _) = await RegisterUserAsync($"Fill{suffix}{i}");
            await ApiClient.BookEventAsync(attendeeClient, ev!.Id);
        }

        return (hostClient, ev!.Id);
    }

    // ── Cannot join if spots still available ──────────────────────────

    [Fact]
    public async Task Join_EventNotFull_Returns400()
    {
        var (_, eventId) = await SetupFullEventAsync("NotFull", capacity: 10);
        // event has capacity 10 but only the setup fills it with 10; create a new event with only 1 booked
        var (userClient, _) = await RegisterUserAsync("JNF");
        var (hostClient, _) = await RegisterUserAsync("HostJNF");
        var evResp = await ApiClient.CreateEventAsync(hostClient, "JNFEvent", capacity: 5);
        var freshEv = await evResp.Content.ReadFromJsonAsync<EventResponse>();
        // book one spot so there are still 4 free
        await ApiClient.BookEventAsync(userClient, freshEv!.Id);

        var (waiter, _) = await RegisterUserAsync("WaiterJNF");
        var resp = await waiter.PostAsync($"/api/events/{freshEv.Id}/waitlist", null);

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    // ── Can join when sold out ─────────────────────────────────────────

    [Fact]
    public async Task Join_SoldOut_Returns201WithPosition()
    {
        var (_, eventId) = await SetupFullEventAsync("SO");
        var (waiter, _) = await RegisterUserAsync("WaiterSO");

        var resp = await waiter.PostAsync($"/api/events/{eventId}/waitlist", null);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

        var pos = await resp.Content.ReadFromJsonAsync<WaitlistPositionResponse>();
        Assert.Equal(1, pos!.Position);
    }

    // ── Cannot join twice ──────────────────────────────────────────────

    [Fact]
    public async Task Join_Twice_Returns409()
    {
        var (_, eventId) = await SetupFullEventAsync("TwiceJoin");
        var (waiter, _) = await RegisterUserAsync("WaiterTJ");

        await waiter.PostAsync($"/api/events/{eventId}/waitlist", null);
        var resp = await waiter.PostAsync($"/api/events/{eventId}/waitlist", null);

        Assert.Equal(HttpStatusCode.Conflict, resp.StatusCode);
    }

    // ── Position endpoint returns correct data ─────────────────────────

    [Fact]
    public async Task GetPosition_AfterJoin_ReturnsPosition()
    {
        var (_, eventId) = await SetupFullEventAsync("Pos");
        var (waiter, _) = await RegisterUserAsync("WaiterPos");
        await waiter.PostAsync($"/api/events/{eventId}/waitlist", null);

        var resp = await waiter.GetAsync($"/api/events/{eventId}/waitlist/position");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var pos = await resp.Content.ReadFromJsonAsync<WaitlistPositionResponse>();
        Assert.Equal(1, pos!.Position);
    }

    // ── Leave waitlist ─────────────────────────────────────────────────

    [Fact]
    public async Task Leave_AfterJoin_Returns204AndPositionNotFound()
    {
        var (_, eventId) = await SetupFullEventAsync("Leave");
        var (waiter, _) = await RegisterUserAsync("WaiterLeave");
        await waiter.PostAsync($"/api/events/{eventId}/waitlist", null);

        var leaveResp = await waiter.DeleteAsync($"/api/events/{eventId}/waitlist");
        Assert.Equal(HttpStatusCode.NoContent, leaveResp.StatusCode);

        var posResp = await waiter.GetAsync($"/api/events/{eventId}/waitlist/position");
        Assert.Equal(HttpStatusCode.NotFound, posResp.StatusCode);
    }

    // ── Auto-promotion on cancellation ────────────────────────────────

    [Fact]
    public async Task Cancel_WithWaitlisted_PromotesNext()
    {
        // Create event with capacity 1
        var (hostClient, _) = await RegisterUserAsync("HostAP");
        var evResp = await ApiClient.CreateEventAsync(hostClient, "APEvent", capacity: 1);
        var ev = await evResp.Content.ReadFromJsonAsync<EventResponse>();

        // Book the only slot
        var (bookerClient, _) = await RegisterUserAsync("BookerAP");
        var bookResp = await ApiClient.BookEventAsync(bookerClient, ev!.Id);
        var booking  = await bookResp.Content.ReadFromJsonAsync<BookingResponse>();

        // Someone joins the waitlist
        var (waiterClient, _) = await RegisterUserAsync("WaiterAP");
        await waiterClient.PostAsync($"/api/events/{ev.Id}/waitlist", null);

        // Cancel the booking (event is 30 days away, so 7-day rule doesn't apply)
        await bookerClient.DeleteAsync($"/api/bookings/{booking!.Id}");

        // Waiter should now have a confirmed booking and no longer be on waitlist
        var myBookings = await waiterClient.GetFromJsonAsync<BookingResponse[]>("/api/bookings/mine");
        var promoted   = myBookings?.FirstOrDefault(b => b.EventId == ev.Id && b.Status == "Confirmed");
        Assert.NotNull(promoted);

        var posResp = await waiterClient.GetAsync($"/api/events/{ev.Id}/waitlist/position");
        Assert.Equal(HttpStatusCode.NotFound, posResp.StatusCode);
    }
}
