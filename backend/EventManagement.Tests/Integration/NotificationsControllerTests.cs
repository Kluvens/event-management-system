using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Integration tests for in-app notifications:
/// fan-out on announcement, unread count, mark read, mark all read.
/// </summary>
public sealed class NotificationsControllerTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public NotificationsControllerTests()
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

    private async Task<(HttpClient client, int userId)> RegisterUserAsync(string suffix)
    {
        var (token, userId) = await ApiClient.RegisterAndGetIdAsync(
            _client, $"NUser{suffix}", $"nuser{suffix}@n.test", "Password1!");
        return (ApiClient.WithToken(_factory, token), userId);
    }

    // ── Empty notifications for new user ──────────────────────────────

    [Fact]
    public async Task GetMine_NewUser_ReturnsEmpty()
    {
        var (userClient, _) = await RegisterUserAsync("Empty");
        var resp = await userClient.GetFromJsonAsync<NotificationResponse[]>("/api/notifications");
        Assert.NotNull(resp);
        Assert.Empty(resp);
    }

    // ── Unread count is 0 for new user ────────────────────────────────

    [Fact]
    public async Task UnreadCount_NewUser_ReturnsZero()
    {
        var (userClient, _) = await RegisterUserAsync("UC0");
        var resp = await userClient.GetFromJsonAsync<UnreadCountResponse>("/api/notifications/unread-count");
        Assert.Equal(0, resp!.Count);
    }

    // ── Fan-out on announcement creates notifications ──────────────────

    [Fact]
    public async Task CreateAnnouncement_FansOutToAttendees()
    {
        // Host creates and publishes an event
        var (hostClient, _) = await RegisterUserAsync("HostFan");
        var evResp = await ApiClient.CreateEventAsync(hostClient, "FanEvent");
        var ev     = await evResp.Content.ReadFromJsonAsync<EventResponse>();

        // Two attendees book
        var (a1, _) = await RegisterUserAsync("FanA1");
        var (a2, _) = await RegisterUserAsync("FanA2");
        await ApiClient.BookEventAsync(a1, ev!.Id);
        await ApiClient.BookEventAsync(a2, ev.Id);

        // Host posts announcement
        var annoResp = await hostClient.PostAsJsonAsync(
            $"/api/events/{ev.Id}/announcements",
            new CreateAnnouncementRequest("Big News", "The venue changed."));
        Assert.Equal(HttpStatusCode.Created, annoResp.StatusCode);

        // Both attendees should have 1 unread notification
        var c1 = await a1.GetFromJsonAsync<UnreadCountResponse>("/api/notifications/unread-count");
        var c2 = await a2.GetFromJsonAsync<UnreadCountResponse>("/api/notifications/unread-count");
        Assert.Equal(1, c1!.Count);
        Assert.Equal(1, c2!.Count);
    }

    // ── Mark single notification as read ──────────────────────────────

    [Fact]
    public async Task MarkRead_DecreasesUnreadCount()
    {
        var (hostClient, _) = await RegisterUserAsync("HostMR");
        var evResp = await ApiClient.CreateEventAsync(hostClient, "MREvent");
        var ev     = await evResp.Content.ReadFromJsonAsync<EventResponse>();

        var (attendeeClient, _) = await RegisterUserAsync("AttMR");
        await ApiClient.BookEventAsync(attendeeClient, ev!.Id);

        await hostClient.PostAsJsonAsync(
            $"/api/events/{ev.Id}/announcements",
            new CreateAnnouncementRequest("Heads up", "Doors open early."));

        var notifications = await attendeeClient.GetFromJsonAsync<NotificationResponse[]>("/api/notifications");
        var n = notifications!.First();
        Assert.False(n.IsRead);

        await attendeeClient.PatchAsync($"/api/notifications/{n.Id}/read", null);

        var count = await attendeeClient.GetFromJsonAsync<UnreadCountResponse>("/api/notifications/unread-count");
        Assert.Equal(0, count!.Count);
    }

    // ── Mark all as read ──────────────────────────────────────────────

    [Fact]
    public async Task MarkAllRead_SetsAllToRead()
    {
        var (hostClient, _) = await RegisterUserAsync("HostMAR");
        var evResp = await ApiClient.CreateEventAsync(hostClient, "MAREvent");
        var ev     = await evResp.Content.ReadFromJsonAsync<EventResponse>();

        var (attendeeClient, _) = await RegisterUserAsync("AttMAR");
        await ApiClient.BookEventAsync(attendeeClient, ev!.Id);

        // Two announcements → two notifications
        await hostClient.PostAsJsonAsync($"/api/events/{ev.Id}/announcements",
            new CreateAnnouncementRequest("A1", "msg1"));
        await hostClient.PostAsJsonAsync($"/api/events/{ev.Id}/announcements",
            new CreateAnnouncementRequest("A2", "msg2"));

        var before = await attendeeClient.GetFromJsonAsync<UnreadCountResponse>("/api/notifications/unread-count");
        Assert.Equal(2, before!.Count);

        await attendeeClient.PatchAsync("/api/notifications/read-all", null);

        var after = await attendeeClient.GetFromJsonAsync<UnreadCountResponse>("/api/notifications/unread-count");
        Assert.Equal(0, after!.Count);
    }
}
