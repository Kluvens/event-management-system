using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Integration tests for GET /api/bookings/{id}/ics (calendar export).
/// </summary>
public sealed class CalendarIcsTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public CalendarIcsTests()
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

    private async Task<(HttpClient attendeeClient, int bookingId)> BookEventAsync(string suffix)
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, $"ICSHost{suffix}", $"icshost{suffix}@ics.test", "Password1!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);

        var evResp = await ApiClient.CreateEventAsync(hostClient, $"ICSEvent{suffix}");
        var ev     = await evResp.Content.ReadFromJsonAsync<EventResponse>();

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, $"ICSUser{suffix}", $"icsuser{suffix}@ics.test", "Password1!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        var bookResp = await ApiClient.BookEventAsync(attendeeClient, ev!.Id);
        var booking  = await bookResp.Content.ReadFromJsonAsync<BookingResponse>();

        return (attendeeClient, booking!.Id);
    }

    // ── Returns .ics with correct content-type ────────────────────────

    [Fact]
    public async Task DownloadIcs_ConfirmedBooking_ReturnsCalendarFile()
    {
        var (attendeeClient, bookingId) = await BookEventAsync("Ok");

        var resp = await attendeeClient.GetAsync($"/api/bookings/{bookingId}/ics");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.StartsWith("text/calendar", resp.Content.Headers.ContentType?.MediaType);

        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("BEGIN:VCALENDAR", body);
        Assert.Contains("BEGIN:VEVENT", body);
        Assert.Contains("END:VEVENT", body);
    }

    // ── Non-owner cannot download ─────────────────────────────────────

    [Fact]
    public async Task DownloadIcs_OtherUser_Returns403()
    {
        var (_, bookingId) = await BookEventAsync("Other");

        var otherToken = await ApiClient.RegisterAndLoginAsync(
            _client, "ICS Other", "icsother@ics.test", "Password1!");
        var otherClient = ApiClient.WithToken(_factory, otherToken);

        var resp = await otherClient.GetAsync($"/api/bookings/{bookingId}/ics");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}
