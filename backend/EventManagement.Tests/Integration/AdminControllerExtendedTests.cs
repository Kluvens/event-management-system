using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Extended coverage for /api/admin/* that complements AdminControllerTests.
/// Covers: filter parameters, FK-guarded deletes, wrong-key registration,
/// the stats ActiveEvents fix (was "Active", now "Published"), and
/// edge-case paths not exercised in the base tests.
/// </summary>
public sealed class AdminControllerExtendedTests : IAsyncLifetime, IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private HttpClient _adminClient = null!;
    private int _attendeeUserId;
    private int _testEventId;

    public AdminControllerExtendedTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        var saToken = await ApiClient.RegisterSuperAdminAsync(
            _client, "SA Ext", "saext@adm.test", "Password1!",
            CustomWebApplicationFactory.TestAdminKey);
        _adminClient = ApiClient.WithToken(_factory, saToken);

        var (_, id) = await ApiClient.RegisterAndGetIdAsync(
            _client, "AttExt", "attendeeext@adm.test", "Password1!");
        _attendeeUserId = id;

        var evResp = await ApiClient.CreateEventAsync(_adminClient, "Ext Event", price: 50m);
        var ev = await evResp.Content.ReadFromJsonAsync<EventIdOnly>();
        _testEventId = ev!.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    public void Dispose()
    {
        _adminClient?.Dispose();
        _client.Dispose();
        _factory.Dispose();
        GC.SuppressFinalize(this);
    }

    // ── POST /api/admin/register — wrong key ─────────────────────────

    [Fact]
    public async Task Register_WrongKey_Returns403()
    {
        var response = await _client.PostAsJsonAsync("/api/dev/admin/register", new
        {
            name = "Hacker",
            email = "hacker@adm.test",
            password = "Password1!",
            registrationKey = "wrong-key"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        // Register first time
        await _client.PostAsJsonAsync("/api/dev/admin/register", new
        {
            name = "Dup SA",
            email = "dupsa@adm.test",
            password = "Password1!",
            registrationKey = CustomWebApplicationFactory.TestAdminKey
        });

        // Second registration with same email
        var response = await _client.PostAsJsonAsync("/api/dev/admin/register", new
        {
            name = "Dup SA 2",
            email = "dupsa@adm.test",
            password = "Password1!",
            registrationKey = CustomWebApplicationFactory.TestAdminKey
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    // ── GET /api/admin/users — filter tests ──────────────────────────

    [Fact]
    public async Task GetUsers_FilterByRole_ReturnsOnlyMatchingRole()
    {
        var response = await _adminClient.GetAsync("/api/admin/users?role=SuperAdmin");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var users = await response.Content.ReadFromJsonAsync<List<AdminUserDto>>();
        Assert.NotNull(users);
        Assert.All(users, u => Assert.Equal("SuperAdmin", u.Role));
    }

    [Fact]
    public async Task GetUsers_FilterBySearch_ReturnsOnlyMatching()
    {
        var response = await _adminClient.GetAsync("/api/admin/users?search=AttExt");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var users = await response.Content.ReadFromJsonAsync<List<AdminUserDto>>();
        Assert.NotNull(users);
        Assert.NotEmpty(users);
        Assert.All(users, u =>
            Assert.True(u.Name.Contains("AttExt") || u.Email.Contains("AttExt")));
    }

    [Fact]
    public async Task GetUsers_FilterBySuspended_ReturnsSuspendedOnly()
    {
        // Suspend the attendee
        await _adminClient.PostAsync($"/api/admin/users/{_attendeeUserId}/suspend", null);

        var response = await _adminClient.GetAsync("/api/admin/users?isSuspended=true");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var users = await response.Content.ReadFromJsonAsync<List<AdminUserDto>>();
        Assert.NotNull(users);
        Assert.NotEmpty(users);
        Assert.All(users, u => Assert.True(u.IsSuspended));
    }

    // ── GET /api/admin/events — filter tests ─────────────────────────

    [Fact]
    public async Task GetEvents_FilterByStatus_Draft_ReturnsOnlyDrafts()
    {
        // Create a draft event
        var draftResp = await ApiClient.CreateEventAsync(_adminClient, "Ext Draft", draft: true);
        draftResp.EnsureSuccessStatusCode();

        var response = await _adminClient.GetAsync("/api/admin/events?status=Draft");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var events = await response.Content.ReadFromJsonAsync<List<AdminEventDto>>();
        Assert.NotNull(events);
        Assert.NotEmpty(events);
        Assert.All(events, e => Assert.Equal("Draft", e.Status));
    }

    [Fact]
    public async Task GetEvents_FilterByIsSuspended_ReturnsSuspendedOnly()
    {
        // Suspend the test event
        await _adminClient.PostAsync($"/api/admin/events/{_testEventId}/suspend", null);

        var response = await _adminClient.GetAsync("/api/admin/events?isSuspended=true");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var events = await response.Content.ReadFromJsonAsync<List<AdminEventDto>>();
        Assert.NotNull(events);
        Assert.NotEmpty(events);
        Assert.All(events, e => Assert.True(e.IsSuspended));
    }

    // ── GET /api/admin/bookings — filter tests ────────────────────────

    [Fact]
    public async Task GetBookings_FilterByEventId_ReturnsOnlyThatEvent()
    {
        // Book the test event
        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "BookFilter", "bookfilter@adm.test", "Password1!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);
        await ApiClient.BookEventAsync(attendeeClient, _testEventId);

        var response = await _adminClient.GetAsync($"/api/admin/bookings?eventId={_testEventId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bookings = await response.Content.ReadFromJsonAsync<List<AdminBookingDto>>();
        Assert.NotNull(bookings);
        Assert.NotEmpty(bookings);
        Assert.All(bookings, b => Assert.Equal(_testEventId, b.EventId));
    }

    [Fact]
    public async Task GetBookings_FilterByStatus_ReturnsOnlyConfirmed()
    {
        var response = await _adminClient.GetAsync("/api/admin/bookings?status=Confirmed");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bookings = await response.Content.ReadFromJsonAsync<List<AdminBookingDto>>();
        Assert.NotNull(bookings);
        Assert.All(bookings, b => Assert.Equal("Confirmed", b.Status));
    }

    // ── GET /api/admin/stats — verifies ActiveEvents counts Published ─

    [Fact]
    public async Task GetStats_ActiveEvents_CountsPublishedEvents()
    {
        var response = await _adminClient.GetAsync("/api/admin/stats");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var stats = await response.Content.ReadFromJsonAsync<AdminStatsDto>();
        Assert.NotNull(stats);
        // The Ext Event created in setup is Published (CreateEventAsync publishes by default)
        Assert.True(stats.ActiveEvents >= 1,
            $"Expected at least 1 active (Published) event, got {stats.ActiveEvents}");
    }

    // ── DELETE /api/admin/categories/{id} — FK guard ─────────────────

    [Fact]
    public async Task DeleteCategory_WithAssociatedEvents_Returns409()
    {
        // CategoryId=1 is "Conference" — the setup event uses it
        var response = await _adminClient.DeleteAsync("/api/admin/categories/1");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    // ── AdjustPoints — non-existent user ─────────────────────────────

    [Fact]
    public async Task AdjustPoints_NonExistentUser_Returns404()
    {
        var response = await _adminClient.PostAsJsonAsync(
            "/api/admin/users/999999/adjust-points", new { delta = 100 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── Suspend event / user — non-existent ──────────────────────────

    [Fact]
    public async Task SuspendUser_NonExistentUser_Returns404()
    {
        var response = await _adminClient.PostAsync("/api/admin/users/999999/suspend", null);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task SuspendEvent_NonExistentEvent_Returns404()
    {
        var response = await _adminClient.PostAsync("/api/admin/events/999999/suspend", null);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── ChangeRole — invalid role string ─────────────────────────────

    [Fact]
    public async Task ChangeRole_InvalidRole_Returns400()
    {
        var response = await _adminClient.PutAsJsonAsync(
            $"/api/admin/users/{_attendeeUserId}/role", new { role = "God" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}

// ── Local DTO shapes ─────────────────────────────────────────────────────────
file record EventIdOnly(int Id);
file record AdminUserDto(int Id, string Name, string Email, string Role, bool IsSuspended);
file record AdminEventDto(int Id, string Title, string Status, bool IsSuspended);
file record AdminBookingDto(int Id, int UserId, int EventId, string Status);
file record AdminStatsDto(
    int TotalUsers, int ActiveUsers, int SuspendedUsers,
    int TotalEvents, int ActiveEvents, int SuspendedEvents,
    int TotalBookings, int ConfirmedBookings, decimal TotalRevenue);
