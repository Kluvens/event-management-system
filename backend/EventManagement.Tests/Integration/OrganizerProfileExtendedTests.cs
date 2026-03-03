using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Integration tests for the organiser public profile endpoint covering:
/// - imageUrl field returned for each event in the profile (added for frontend cards)
/// - Visibility rules: draft and cancelled events must not appear
/// - Follower count accuracy after subscribe / unsubscribe
/// </summary>
public sealed class OrganizerProfileExtendedTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public OrganizerProfileExtendedTests()
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

    private async Task<(HttpClient hostClient, int hostId)> RegisterHostAsync(string suffix)
    {
        var (token, id) = await ApiClient.RegisterAndGetIdAsync(
            _client, $"OPEHost{suffix}", $"opehost{suffix}@ope.test", "Pass!");
        return (ApiClient.WithToken(_factory, token), id);
    }

    // ── imageUrl in OrganizerEventSummary ─────────────────────────────

    [Fact]
    public async Task GetPublicProfile_PublishedEventWithImage_ReturnsImageUrl()
    {
        var (hostClient, hostId) = await RegisterHostAsync("IMG");
        const string imageUrl = "https://images.unsplash.com/photo-abc123?auto=format";

        var start = DateTime.UtcNow.AddDays(30);
        var createResp = await hostClient.PostAsJsonAsync("/api/events",
            new CreateEventRequest(
                "Image Event", "desc", "Sydney",
                start, start.AddHours(2),
                100, 0m, true, 1, null, imageUrl));
        var ev = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(ev);
        await hostClient.PostAsync($"/api/events/{ev.Id}/publish", null);

        var response = await _client.GetAsync($"/api/organizers/{hostId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<OrganizerPublicProfile>();
        Assert.NotNull(profile);
        Assert.Single(profile.Events);
        Assert.Equal(imageUrl, profile.Events[0].ImageUrl);
    }

    [Fact]
    public async Task GetPublicProfile_PublishedEventWithoutImage_ReturnsNullImageUrl()
    {
        var (hostClient, hostId) = await RegisterHostAsync("NOIMG");

        // CreateEventAsync passes null for imageUrl by default
        var createResp = await ApiClient.CreateEventAsync(hostClient, "No Image Event");
        var ev = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(ev);

        var response = await _client.GetAsync($"/api/organizers/{hostId}");

        var profile = await response.Content.ReadFromJsonAsync<OrganizerPublicProfile>();
        Assert.NotNull(profile);
        Assert.Single(profile.Events);
        Assert.Null(profile.Events[0].ImageUrl);
    }

    // ── event visibility rules ────────────────────────────────────────

    [Fact]
    public async Task GetPublicProfile_DraftEvents_NotIncluded()
    {
        var (hostClient, hostId) = await RegisterHostAsync("DRAFT");

        // Create a draft event (do not publish)
        await ApiClient.CreateEventAsync(hostClient, "Draft Event", draft: true);

        var response = await _client.GetAsync($"/api/organizers/{hostId}");

        var profile = await response.Content.ReadFromJsonAsync<OrganizerPublicProfile>();
        Assert.NotNull(profile);
        Assert.Empty(profile.Events);
    }

    [Fact]
    public async Task GetPublicProfile_CancelledEvents_NotIncluded()
    {
        var (hostClient, hostId) = await RegisterHostAsync("CANC");

        var createResp = await ApiClient.CreateEventAsync(hostClient, "Will Cancel");
        var ev = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(ev);
        await hostClient.PostAsync($"/api/events/{ev.Id}/cancel", null);

        var response = await _client.GetAsync($"/api/organizers/{hostId}");

        var profile = await response.Content.ReadFromJsonAsync<OrganizerPublicProfile>();
        Assert.NotNull(profile);
        Assert.Empty(profile.Events);
    }

    [Fact]
    public async Task GetPublicProfile_MixedEventStates_OnlyPublishedCounted()
    {
        var (hostClient, hostId) = await RegisterHostAsync("MIX");

        // Two published events
        await ApiClient.CreateEventAsync(hostClient, "Published A");
        await ApiClient.CreateEventAsync(hostClient, "Published B");

        // One draft (never published)
        await ApiClient.CreateEventAsync(hostClient, "Draft Only", draft: true);

        // One published then cancelled
        var toCancel = await ApiClient.CreateEventAsync(hostClient, "Published then Cancelled");
        var cancelEv = await toCancel.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(cancelEv);
        await hostClient.PostAsync($"/api/events/{cancelEv.Id}/cancel", null);

        var response = await _client.GetAsync($"/api/organizers/{hostId}");

        var profile = await response.Content.ReadFromJsonAsync<OrganizerPublicProfile>();
        Assert.NotNull(profile);
        Assert.Equal(2, profile.Events.Count);
    }

    // ── follower count ────────────────────────────────────────────────

    [Fact]
    public async Task GetPublicProfile_NewOrganiser_HasZeroFollowers()
    {
        var (_, hostId) = await RegisterHostAsync("FZERO");

        var response = await _client.GetAsync($"/api/organizers/{hostId}");

        var profile = await response.Content.ReadFromJsonAsync<OrganizerPublicProfile>();
        Assert.NotNull(profile);
        Assert.Equal(0, profile.FollowerCount);
    }

    [Fact]
    public async Task GetPublicProfile_FollowerCount_IncreasesAfterSubscribe()
    {
        var (_, hostId) = await RegisterHostAsync("FINC");

        var followerToken = await ApiClient.RegisterAndLoginAsync(
            _client, "FollowerFINC", "followerfINC@ope.test", "Pass!");
        var followerClient = ApiClient.WithToken(_factory, followerToken);
        await followerClient.PostAsync($"/api/subscriptions/{hostId}", null);

        var response = await _client.GetAsync($"/api/organizers/{hostId}");

        var profile = await response.Content.ReadFromJsonAsync<OrganizerPublicProfile>();
        Assert.NotNull(profile);
        Assert.Equal(1, profile.FollowerCount);
    }

    [Fact]
    public async Task GetPublicProfile_FollowerCount_DecreasesAfterUnsubscribe()
    {
        var (_, hostId) = await RegisterHostAsync("FDEC");

        var followerToken = await ApiClient.RegisterAndLoginAsync(
            _client, "FollowerFDEC", "followerfDEC@ope.test", "Pass!");
        var followerClient = ApiClient.WithToken(_factory, followerToken);

        await followerClient.PostAsync($"/api/subscriptions/{hostId}", null);
        await followerClient.DeleteAsync($"/api/subscriptions/{hostId}");

        var response = await _client.GetAsync($"/api/organizers/{hostId}");

        var profile = await response.Content.ReadFromJsonAsync<OrganizerPublicProfile>();
        Assert.NotNull(profile);
        Assert.Equal(0, profile.FollowerCount);
    }

    [Fact]
    public async Task GetPublicProfile_MultipleFollowers_CountReflectsAll()
    {
        var (_, hostId) = await RegisterHostAsync("FMULTI");

        for (var i = 1; i <= 3; i++)
        {
            var token = await ApiClient.RegisterAndLoginAsync(
                _client, $"MultiFoll{i}", $"multiFoll{i}@ope.test", "Pass!");
            var client = ApiClient.WithToken(_factory, token);
            await client.PostAsync($"/api/subscriptions/{hostId}", null);
        }

        var response = await _client.GetAsync($"/api/organizers/{hostId}");

        var profile = await response.Content.ReadFromJsonAsync<OrganizerPublicProfile>();
        Assert.NotNull(profile);
        Assert.Equal(3, profile.FollowerCount);
    }
}
