using System.Net;
using System.Net.Http.Json;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Integration tests for /api/admin/* endpoints.
///
/// Key scenarios verified:
///  - Admin role can access every administration endpoint (was SuperAdmin-only before)
///  - SuperAdmin still has access to every endpoint
///  - Unauthenticated requests receive 401
///  - Attendee requests receive 403
///  - Existing guards (cannot suspend/change SuperAdmin) still hold for Admin callers
/// </summary>
public sealed class AdminControllerTests : IAsyncLifetime, IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;          // unauthenticated
    private HttpClient _superAdminClient = null!;
    private HttpClient _adminClient = null!;
    private HttpClient _attendeeClient = null!;

    // IDs set up during InitializeAsync, used across multiple tests
    private int _superAdminUserId;
    private int _attendeeUserId;
    private int _testEventId;

    public AdminControllerTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        // SuperAdmin — registered via key-protected endpoint
        var saResp = await _client.PostAsJsonAsync("/api/admin/register", new
        {
            name = "Super Admin",
            email = "sa@test.com",
            password = "Password1!",
            registrationKey = CustomWebApplicationFactory.TestAdminKey
        });
        saResp.EnsureSuccessStatusCode();
        var saBody = await saResp.Content.ReadFromJsonAsync<AuthBody>();
        _superAdminUserId = saBody!.UserId;
        _superAdminClient = ApiClient.WithToken(_factory, saBody.Token);

        // Regular user promoted to Admin by SuperAdmin
        var (_, adminId) = await ApiClient.RegisterAndGetIdAsync(
            _client, "Admin User", "admin@test.com", "Password1!");
        await _superAdminClient.PutAsJsonAsync(
            $"/api/admin/users/{adminId}/role", new { role = "Admin" });
        var adminToken = await ApiClient.LoginAsync(_client, "admin@test.com", "Password1!");
        _adminClient = ApiClient.WithToken(_factory, adminToken);

        // Regular attendee
        var (_, attendeeId) = await ApiClient.RegisterAndGetIdAsync(
            _client, "Attendee User", "attendee@test.com", "Password1!");
        var attendeeToken = await ApiClient.LoginAsync(_client, "attendee@test.com", "Password1!");
        _attendeeClient = ApiClient.WithToken(_factory, attendeeToken);
        _attendeeUserId = attendeeId;

        // An event for event-related tests — created by the Admin user
        var evResp = await ApiClient.CreateEventAsync(_adminClient);
        evResp.EnsureSuccessStatusCode();
        var ev = await evResp.Content.ReadFromJsonAsync<EventIdBody>();
        _testEventId = ev!.Id;
    }

    public Task DisposeAsync()
    {
        _superAdminClient?.Dispose();
        _adminClient?.Dispose();
        _attendeeClient?.Dispose();
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        GC.SuppressFinalize(this);
    }

    // ── GET /api/admin/users — authorization boundary ─────────────────

    [Fact]
    public async Task GetUsers_NoAuth_Returns401()
    {
        var response = await _client.GetAsync("/api/admin/users");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetUsers_AttendeeToken_Returns403()
    {
        var response = await _attendeeClient.GetAsync("/api/admin/users");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetUsers_AdminToken_Returns200WithUserList()
    {
        var response = await _adminClient.GetAsync("/api/admin/users");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var users = await response.Content.ReadFromJsonAsync<List<object>>();
        Assert.NotNull(users);
        Assert.NotEmpty(users);
    }

    [Fact]
    public async Task GetUsers_SuperAdminToken_Returns200()
    {
        var response = await _superAdminClient.GetAsync("/api/admin/users");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ── GET /api/admin/users/{id} ─────────────────────────────────────

    [Fact]
    public async Task GetUser_AdminToken_Returns200()
    {
        var response = await _adminClient.GetAsync($"/api/admin/users/{_attendeeUserId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetUser_AdminToken_NonexistentId_Returns404()
    {
        var response = await _adminClient.GetAsync("/api/admin/users/999999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── POST /api/admin/users/{id}/suspend ────────────────────────────

    [Fact]
    public async Task SuspendUser_AdminToken_SuspendsAttendee_Returns204()
    {
        // Use a dedicated user so this test doesn't interfere with others
        var (_, victimId) = await ApiClient.RegisterAndGetIdAsync(
            _client, "Victim", "victim-suspend@test.com", "Password1!");

        var response = await _adminClient.PostAsync(
            $"/api/admin/users/{victimId}/suspend", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task SuspendUser_AdminToken_TargetIsSuperAdmin_Returns400()
    {
        var response = await _adminClient.PostAsync(
            $"/api/admin/users/{_superAdminUserId}/suspend", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SuspendUser_NoAuth_Returns401()
    {
        var response = await _client.PostAsync(
            $"/api/admin/users/{_attendeeUserId}/suspend", null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── POST /api/admin/users/{id}/unsuspend ──────────────────────────

    [Fact]
    public async Task UnsuspendUser_AdminToken_Returns204()
    {
        var (_, victimId) = await ApiClient.RegisterAndGetIdAsync(
            _client, "Victim2", "victim-unsuspend@test.com", "Password1!");
        await _adminClient.PostAsync($"/api/admin/users/{victimId}/suspend", null);

        var response = await _adminClient.PostAsync(
            $"/api/admin/users/{victimId}/unsuspend", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // ── PUT /api/admin/users/{id}/role ────────────────────────────────

    [Fact]
    public async Task ChangeRole_AdminToken_CanPromoteAttendeeToAdmin()
    {
        var (_, targetId) = await ApiClient.RegisterAndGetIdAsync(
            _client, "Promotee", "promotee@test.com", "Password1!");

        var response = await _adminClient.PutAsJsonAsync(
            $"/api/admin/users/{targetId}/role", new { role = "Admin" });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task ChangeRole_AdminToken_CanDemoteAdminToAttendee()
    {
        var (_, targetId) = await ApiClient.RegisterAndGetIdAsync(
            _client, "Demotee", "demotee@test.com", "Password1!");
        await _superAdminClient.PutAsJsonAsync(
            $"/api/admin/users/{targetId}/role", new { role = "Admin" });

        var response = await _adminClient.PutAsJsonAsync(
            $"/api/admin/users/{targetId}/role", new { role = "Attendee" });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task ChangeRole_AdminToken_TargetIsSuperAdmin_Returns400()
    {
        var response = await _adminClient.PutAsJsonAsync(
            $"/api/admin/users/{_superAdminUserId}/role", new { role = "Attendee" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ChangeRole_NoAuth_Returns401()
    {
        var response = await _client.PutAsJsonAsync(
            $"/api/admin/users/{_attendeeUserId}/role", new { role = "Admin" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── POST /api/admin/users/{id}/adjust-points ──────────────────────

    [Fact]
    public async Task AdjustPoints_AdminToken_AddsPoints_ReturnsUpdatedTotal()
    {
        var response = await _adminClient.PostAsJsonAsync(
            $"/api/admin/users/{_attendeeUserId}/adjust-points", new { delta = 500 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<PointsBody>();
        Assert.NotNull(body);
        Assert.Equal(500, body.LoyaltyPoints);
    }

    [Fact]
    public async Task AdjustPoints_AdminToken_DeductsPoints_FloorsAtZero()
    {
        var response = await _adminClient.PostAsJsonAsync(
            $"/api/admin/users/{_attendeeUserId}/adjust-points", new { delta = -99999 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<PointsBody>();
        Assert.NotNull(body);
        Assert.Equal(0, body.LoyaltyPoints);
    }

    [Fact]
    public async Task AdjustPoints_NoAuth_Returns401()
    {
        var response = await _client.PostAsJsonAsync(
            $"/api/admin/users/{_attendeeUserId}/adjust-points", new { delta = 100 });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AdjustPoints_AttendeeToken_Returns403()
    {
        var response = await _attendeeClient.PostAsJsonAsync(
            $"/api/admin/users/{_attendeeUserId}/adjust-points", new { delta = 100 });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── GET /api/admin/events ─────────────────────────────────────────

    [Fact]
    public async Task GetEvents_AdminToken_ReturnsAllEvents()
    {
        var response = await _adminClient.GetAsync("/api/admin/events");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var events = await response.Content.ReadFromJsonAsync<List<object>>();
        Assert.NotNull(events);
        Assert.NotEmpty(events); // _testEventId was created in setup
    }

    [Fact]
    public async Task GetEvents_NoAuth_Returns401()
    {
        var response = await _client.GetAsync("/api/admin/events");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetEvents_AttendeeToken_Returns403()
    {
        var response = await _attendeeClient.GetAsync("/api/admin/events");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── POST /api/admin/events/{id}/suspend & unsuspend ──────────────

    [Fact]
    public async Task SuspendEvent_AdminToken_Returns204()
    {
        var response = await _adminClient.PostAsync(
            $"/api/admin/events/{_testEventId}/suspend", null);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task UnsuspendEvent_AdminToken_Returns204()
    {
        await _adminClient.PostAsync($"/api/admin/events/{_testEventId}/suspend", null);

        var response = await _adminClient.PostAsync(
            $"/api/admin/events/{_testEventId}/unsuspend", null);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task SuspendEvent_NoAuth_Returns401()
    {
        var response = await _client.PostAsync(
            $"/api/admin/events/{_testEventId}/suspend", null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── GET /api/admin/bookings ───────────────────────────────────────

    [Fact]
    public async Task GetBookings_AdminToken_Returns200()
    {
        var response = await _adminClient.GetAsync("/api/admin/bookings");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bookings = await response.Content.ReadFromJsonAsync<List<object>>();
        Assert.NotNull(bookings);
    }

    [Fact]
    public async Task GetBookings_NoAuth_Returns401()
    {
        var response = await _client.GetAsync("/api/admin/bookings");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── GET /api/admin/stats ──────────────────────────────────────────

    [Fact]
    public async Task GetStats_AdminToken_Returns200WithCounts()
    {
        var response = await _adminClient.GetAsync("/api/admin/stats");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<StatsBody>();
        Assert.NotNull(body);
        Assert.True(body.TotalUsers > 0);
        Assert.True(body.TotalEvents > 0);
    }

    [Fact]
    public async Task GetStats_NoAuth_Returns401()
    {
        var response = await _client.GetAsync("/api/admin/stats");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetStats_AttendeeToken_Returns403()
    {
        var response = await _attendeeClient.GetAsync("/api/admin/stats");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── POST /api/admin/categories ────────────────────────────────────

    [Fact]
    public async Task CreateCategory_AdminToken_Returns201()
    {
        var response = await _adminClient.PostAsJsonAsync(
            "/api/admin/categories", new { name = "Test Category" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<CategoryBody>();
        Assert.NotNull(body);
        Assert.Equal("Test Category", body.Name);
    }

    [Fact]
    public async Task CreateCategory_NoAuth_Returns401()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/admin/categories", new { name = "Unauthorized Category" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── PUT /api/admin/categories/{id} ────────────────────────────────

    [Fact]
    public async Task UpdateCategory_AdminToken_Returns204()
    {
        var createResp = await _adminClient.PostAsJsonAsync(
            "/api/admin/categories", new { name = "Category To Rename" });
        var cat = await createResp.Content.ReadFromJsonAsync<CategoryBody>();
        Assert.NotNull(cat);

        var response = await _adminClient.PutAsJsonAsync(
            $"/api/admin/categories/{cat.Id}", new { name = "Renamed Category" });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // ── DELETE /api/admin/categories/{id} ─────────────────────────────

    [Fact]
    public async Task DeleteCategory_AdminToken_Returns204()
    {
        var createResp = await _adminClient.PostAsJsonAsync(
            "/api/admin/categories", new { name = "Category To Delete" });
        var cat = await createResp.Content.ReadFromJsonAsync<CategoryBody>();
        Assert.NotNull(cat);

        var response = await _adminClient.DeleteAsync($"/api/admin/categories/{cat.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // ── POST /api/admin/tags ──────────────────────────────────────────

    [Fact]
    public async Task CreateTag_AdminToken_Returns201()
    {
        var response = await _adminClient.PostAsJsonAsync(
            "/api/admin/tags", new { name = "TestTag" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<TagBody>();
        Assert.NotNull(body);
        Assert.Equal("TestTag", body.Name);
    }

    [Fact]
    public async Task CreateTag_NoAuth_Returns401()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/admin/tags", new { name = "UnauthorizedTag" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── DELETE /api/admin/tags/{id} ───────────────────────────────────

    [Fact]
    public async Task DeleteTag_AdminToken_Returns204()
    {
        var createResp = await _adminClient.PostAsJsonAsync(
            "/api/admin/tags", new { name = "TagToDelete" });
        var tag = await createResp.Content.ReadFromJsonAsync<TagBody>();
        Assert.NotNull(tag);

        var response = await _adminClient.DeleteAsync($"/api/admin/tags/{tag.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}

// ── Local response records ────────────────────────────────────────────────────

file record AuthBody(string Token, int UserId);
file record EventIdBody(int Id);
file record PointsBody(int UserId, int LoyaltyPoints, string LoyaltyTier);
file record StatsBody(int TotalUsers, int TotalEvents, int TotalBookings);
file record CategoryBody(int Id, string Name);
file record TagBody(int Id, string Name);
