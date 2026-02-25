using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Integration tests for GET /api/events/{id}/analytics.
/// </summary>
public sealed class AnalyticsControllerTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AnalyticsControllerTests()
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

    private async Task<(HttpClient hostClient, int eventId)> SetupEventAsync(string suffix, int capacity = 10)
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, $"AnHost{suffix}", $"anhost{suffix}@an.test", "Password1!");
        var hostClient = ApiClient.WithToken(_factory, token);
        var evResp = await ApiClient.CreateEventAsync(hostClient, $"AnEvent{suffix}", capacity: capacity);
        var ev = await evResp.Content.ReadFromJsonAsync<EventResponse>();
        return (hostClient, ev!.Id);
    }

    // ── Non-owner is forbidden ─────────────────────────────────────────

    [Fact]
    public async Task GetAnalytics_NonOwner_Returns403()
    {
        var (_, eventId) = await SetupEventAsync("NOwn");
        var otherToken = await ApiClient.RegisterAndLoginAsync(
            _client, "AnOther", "another@an.test", "Password1!");
        var otherClient = ApiClient.WithToken(_factory, otherToken);

        var resp = await otherClient.GetAsync($"/api/events/{eventId}/analytics");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ── Owner sees correct data ────────────────────────────────────────

    [Fact]
    public async Task GetAnalytics_Owner_ReturnsCorrectCounts()
    {
        var (hostClient, eventId) = await SetupEventAsync("Owner", capacity: 5);

        // Book 2 attendees
        for (int i = 0; i < 2; i++)
        {
            var token = await ApiClient.RegisterAndLoginAsync(
                _client, $"AnAtt{i}", $"anatt{i}@an.test", "Password1!");
            var c = ApiClient.WithToken(_factory, token);
            await ApiClient.BookEventAsync(c, eventId);
        }

        var analytics = await hostClient.GetFromJsonAsync<EventAnalyticsResponse>(
            $"/api/events/{eventId}/analytics");

        Assert.NotNull(analytics);
        Assert.Equal(2, analytics.ConfirmedBookings);
        Assert.Equal(0, analytics.CancelledBookings);
        Assert.Equal(0, analytics.WaitlistCount);
        Assert.Equal(5, analytics.TotalCapacity);
    }

    // ── Waitlist count is included ─────────────────────────────────────

    [Fact]
    public async Task GetAnalytics_WithWaitlist_ReturnsWaitlistCount()
    {
        // Create event with capacity 1 and fill it
        var (hostClient, eventId) = await SetupEventAsync("WL", capacity: 1);

        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "AnWLFill", "anwlfill@an.test", "Password1!");
        var booker = ApiClient.WithToken(_factory, token);
        await ApiClient.BookEventAsync(booker, eventId);

        // Two people join waitlist
        for (int i = 0; i < 2; i++)
        {
            var wToken = await ApiClient.RegisterAndLoginAsync(
                _client, $"AnWaiter{i}", $"anwaiter{i}@an.test", "Password1!");
            var wClient = ApiClient.WithToken(_factory, wToken);
            await wClient.PostAsync($"/api/events/{eventId}/waitlist", null);
        }

        var analytics = await hostClient.GetFromJsonAsync<EventAnalyticsResponse>(
            $"/api/events/{eventId}/analytics");

        Assert.Equal(2, analytics!.WaitlistCount);
    }
}
