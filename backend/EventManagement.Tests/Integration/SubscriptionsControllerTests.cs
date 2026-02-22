using System.Net;
using System.Net.Http.Json;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

public class SubscriptionsControllerTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SubscriptionsControllerTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    // ── GET /api/subscriptions ────────────────────────────────────────

    [Fact]
    public async Task GetMySubscriptions_Returns200WithList()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "SubUser1", "subuser1@sub.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var response = await authed.GetAsync("/api/subscriptions");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetMySubscriptions_Unauthenticated_Returns401()
    {
        var response = await _client.GetAsync("/api/subscriptions");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── POST /api/subscriptions/{hostId} ─────────────────────────────

    [Fact]
    public async Task Subscribe_ValidHost_Returns204()
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "SubHost1", "subhost1@sub.test", "Pass!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);

        // Get host ID by calling subscriptions/subscribers (need another way...)
        // Register a subscriber
        var subscriberToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Subscriber1", "subscriber1@sub.test", "Pass!");
        var subscriberClient = ApiClient.WithToken(_factory, subscriberToken);

        // Get host's user ID from login response
        var loginResp = await _client.PostAsJsonAsync("/api/auth/login",
            new { Email = "subhost1@sub.test", Password = "Pass!" });
        var auth = await loginResp.Content.ReadFromJsonAsync<EventManagement.DTOs.AuthResponse>();

        var response = await subscriberClient.PostAsync(
            $"/api/subscriptions/{auth!.UserId}", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Subscribe_ToSelf_Returns400()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "SelfSub", "selfsub@sub.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var loginResp = await _client.PostAsJsonAsync("/api/auth/login",
            new { Email = "selfsub@sub.test", Password = "Pass!" });
        var auth = await loginResp.Content.ReadFromJsonAsync<EventManagement.DTOs.AuthResponse>();

        var response = await authed.PostAsync($"/api/subscriptions/{auth!.UserId}", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Subscribe_NonexistentHost_Returns404()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "SubNoHost", "subnohost@sub.test", "Pass!");
        var authed = ApiClient.WithToken(_factory, token);

        var response = await authed.PostAsync("/api/subscriptions/999999", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Subscribe_AlreadySubscribed_Returns409()
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "SubHost2", "subhost2@sub.test", "Pass!");
        _ = ApiClient.WithToken(_factory, hostToken);

        var loginResp = await _client.PostAsJsonAsync("/api/auth/login",
            new { Email = "subhost2@sub.test", Password = "Pass!" });
        var hostAuth = await loginResp.Content.ReadFromJsonAsync<EventManagement.DTOs.AuthResponse>();

        var subscriberToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Subscriber2", "subscriber2@sub.test", "Pass!");
        var subscriberClient = ApiClient.WithToken(_factory, subscriberToken);

        await subscriberClient.PostAsync($"/api/subscriptions/{hostAuth!.UserId}", null);
        var response = await subscriberClient.PostAsync(
            $"/api/subscriptions/{hostAuth.UserId}", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    // ── DELETE /api/subscriptions/{hostId} ────────────────────────────

    [Fact]
    public async Task Unsubscribe_Returns204()
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "SubHost3", "subhost3@sub.test", "Pass!");
        _ = ApiClient.WithToken(_factory, hostToken);

        var loginResp = await _client.PostAsJsonAsync("/api/auth/login",
            new { Email = "subhost3@sub.test", Password = "Pass!" });
        var hostAuth = await loginResp.Content.ReadFromJsonAsync<EventManagement.DTOs.AuthResponse>();

        var subscriberToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Subscriber3", "subscriber3@sub.test", "Pass!");
        var subscriberClient = ApiClient.WithToken(_factory, subscriberToken);

        await subscriberClient.PostAsync($"/api/subscriptions/{hostAuth!.UserId}", null);

        var response = await subscriberClient.DeleteAsync(
            $"/api/subscriptions/{hostAuth.UserId}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Unsubscribe_NotSubscribed_Returns404()
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "SubHost4", "subhost4@sub.test", "Pass!");
        _ = ApiClient.WithToken(_factory, hostToken);

        var loginResp = await _client.PostAsJsonAsync("/api/auth/login",
            new { Email = "subhost4@sub.test", Password = "Pass!" });
        var hostAuth = await loginResp.Content.ReadFromJsonAsync<EventManagement.DTOs.AuthResponse>();

        var subscriberToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Subscriber4", "subscriber4@sub.test", "Pass!");
        var subscriberClient = ApiClient.WithToken(_factory, subscriberToken);

        var response = await subscriberClient.DeleteAsync(
            $"/api/subscriptions/{hostAuth!.UserId}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── GET /api/subscriptions/subscribers ───────────────────────────

    [Fact]
    public async Task GetMySubscribers_Returns200WithList()
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "SubHost5", "subhost5@sub.test", "Pass!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);

        var loginResp = await _client.PostAsJsonAsync("/api/auth/login",
            new { Email = "subhost5@sub.test", Password = "Pass!" });
        var hostAuth = await loginResp.Content.ReadFromJsonAsync<EventManagement.DTOs.AuthResponse>();

        // A subscriber subscribes
        var subscriberToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Subscriber5", "subscriber5@sub.test", "Pass!");
        var subscriberClient = ApiClient.WithToken(_factory, subscriberToken);
        await subscriberClient.PostAsync($"/api/subscriptions/{hostAuth!.UserId}", null);

        var response = await hostClient.GetAsync("/api/subscriptions/subscribers");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
