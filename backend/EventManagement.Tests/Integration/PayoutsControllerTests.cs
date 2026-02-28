using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Integration tests for /api/payouts.
///
/// Scenarios covered:
///   GET  /api/payouts/mine       — organiser lists their own requests
///   POST /api/payouts            — submit a new payout request
///   GET  /api/payouts            — admin lists all requests (with optional status filter)
///   PATCH /api/payouts/{id}      — admin approves or rejects a request
///
/// Each test class instance uses an isolated in-memory database, so tests
/// are independent of each other and of seed data.
/// </summary>
public sealed class PayoutsControllerTests : IAsyncLifetime, IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;       // unauthenticated

    private HttpClient _organiserClient = null!;
    private HttpClient _adminClient     = null!;
    private HttpClient _attendeeClient  = null!;

    public PayoutsControllerTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client  = _factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        // Organiser account
        var orgToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Org User", "org@payouts.test", "Pass!");
        _organiserClient = ApiClient.WithToken(_factory, orgToken);

        // SuperAdmin → promotes a regular user to Admin
        var saToken = await ApiClient.RegisterSuperAdminAsync(
            _client, "SuperAdmin", "sa@payouts.test", "Pass!",
            CustomWebApplicationFactory.TestAdminKey);
        var saClient = ApiClient.WithToken(_factory, saToken);

        var (_, adminId) = await ApiClient.RegisterAndGetIdAsync(
            _client, "Admin User", "admin@payouts.test", "Pass!");
        await saClient.PutAsJsonAsync($"/api/admin/users/{adminId}/role", new { role = "Admin" });
        var adminToken = await ApiClient.LoginAsync(_client, "admin@payouts.test", "Pass!");
        _adminClient = ApiClient.WithToken(_factory, adminToken);

        // Regular attendee (no organiser / admin privileges)
        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Attendee User", "attendee@payouts.test", "Pass!");
        _attendeeClient = ApiClient.WithToken(_factory, attendeeToken);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    public void Dispose()
    {
        _client.Dispose();
        _organiserClient?.Dispose();
        _adminClient?.Dispose();
        _attendeeClient?.Dispose();
        _factory.Dispose();
        GC.SuppressFinalize(this);
    }

    // ── GET /api/payouts/mine ─────────────────────────────────────────────

    [Fact]
    public async Task GetMine_Unauthenticated_Returns401()
    {
        var resp = await _client.GetAsync("/api/payouts/mine");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task GetMine_AuthenticatedUser_Returns200WithEmptyList()
    {
        var resp = await _organiserClient.GetAsync("/api/payouts/mine");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var list = await resp.Content.ReadFromJsonAsync<List<PayoutRequestResponse>>();
        Assert.NotNull(list);
        Assert.Empty(list);
    }

    [Fact]
    public async Task GetMine_ReturnsOnlyOwnRequests()
    {
        // Organiser submits a request
        await _organiserClient.PostAsJsonAsync("/api/payouts",
            new { amount = 200m, bankDetails = "BSB 123-456 Acc 999" });

        // Attendee also submits one
        await _attendeeClient.PostAsJsonAsync("/api/payouts",
            new { amount = 100m, bankDetails = "BSB 111-222 Acc 333" });

        var resp = await _organiserClient.GetAsync("/api/payouts/mine");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var list = await resp.Content.ReadFromJsonAsync<List<PayoutRequestResponse>>();
        Assert.NotNull(list);
        Assert.Single(list);
        Assert.Equal(200m, list[0].Amount);
    }

    // ── POST /api/payouts ─────────────────────────────────────────────────

    [Fact]
    public async Task Create_Unauthenticated_Returns401()
    {
        var resp = await _client.PostAsJsonAsync("/api/payouts",
            new { amount = 100m, bankDetails = "BSB 000" });
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Create_ValidRequest_Returns201()
    {
        var resp = await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(500m, "BSB 062-000 Acc 12345678"));

        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        var payout = await resp.Content.ReadFromJsonAsync<PayoutRequestResponse>();
        Assert.NotNull(payout);
        Assert.Equal(500m, payout.Amount);
        Assert.Equal("Pending", payout.Status);
        Assert.Null(payout.AdminNotes);
        Assert.Null(payout.ProcessedAt);
    }

    [Fact]
    public async Task Create_ZeroAmount_Returns400()
    {
        var resp = await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(0m, "BSB 000"));
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Create_NegativeAmount_Returns400()
    {
        var resp = await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(-50m, "BSB 000"));
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Create_EmptyBankDetails_Returns400()
    {
        var resp = await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(100m, ""));
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Create_DuplicatePending_Returns409()
    {
        // First request — ok
        var first = await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(100m, "BSB 001"));
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        // Second request while first is still Pending — conflict
        var second = await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(200m, "BSB 002"));
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Create_AfterPreviousApproved_Succeeds()
    {
        // Submit and approve first request
        var createResp = await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(100m, "BSB 001"));
        var payout = await createResp.Content.ReadFromJsonAsync<PayoutRequestResponse>();

        await _adminClient.PatchAsJsonAsync($"/api/payouts/{payout!.Id}",
            new ProcessPayoutRequest("Approved", null));

        // Now a second request should be allowed
        var second = await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(200m, "BSB 002"));
        Assert.Equal(HttpStatusCode.Created, second.StatusCode);
    }

    // ── GET /api/payouts (admin) ──────────────────────────────────────────

    [Fact]
    public async Task GetAll_Unauthenticated_Returns401()
    {
        var resp = await _client.GetAsync("/api/payouts");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task GetAll_RegularUser_Returns403()
    {
        var resp = await _attendeeClient.GetAsync("/api/payouts");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task GetAll_Admin_Returns200WithAllRequests()
    {
        await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(300m, "BSB 300"));
        await _attendeeClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(400m, "BSB 400"));

        var resp = await _adminClient.GetAsync("/api/payouts");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var list = await resp.Content.ReadFromJsonAsync<List<AdminPayoutResponse>>();
        Assert.NotNull(list);
        Assert.True(list.Count >= 2);
    }

    [Fact]
    public async Task GetAll_FilterByStatus_ReturnsOnlyMatchingRequests()
    {
        // Submit a request then approve it
        var createResp = await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(50m, "BSB 050"));
        var payout = await createResp.Content.ReadFromJsonAsync<PayoutRequestResponse>();

        await _adminClient.PatchAsJsonAsync($"/api/payouts/{payout!.Id}",
            new ProcessPayoutRequest("Approved", "Looks good"));

        // ?status=Approved should include our approved payout
        var approvedResp = await _adminClient.GetAsync("/api/payouts?status=Approved");
        var approved = await approvedResp.Content.ReadFromJsonAsync<List<AdminPayoutResponse>>();
        Assert.NotNull(approved);
        Assert.Contains(approved, p => p.Id == payout.Id && p.Status == "Approved");

        // ?status=Pending should not contain it
        var pendingResp = await _adminClient.GetAsync("/api/payouts?status=Pending");
        var pending = await pendingResp.Content.ReadFromJsonAsync<List<AdminPayoutResponse>>();
        Assert.DoesNotContain(pending!, p => p.Id == payout.Id);
    }

    // ── PATCH /api/payouts/{id} (admin) ───────────────────────────────────

    [Fact]
    public async Task Process_Unauthenticated_Returns401()
    {
        var resp = await _client.PatchAsJsonAsync("/api/payouts/1",
            new ProcessPayoutRequest("Approved", null));
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Process_RegularUser_Returns403()
    {
        var resp = await _attendeeClient.PatchAsJsonAsync("/api/payouts/1",
            new ProcessPayoutRequest("Approved", null));
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Process_Approve_Returns204()
    {
        var createResp = await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(750m, "BSB 750"));
        var payout = await createResp.Content.ReadFromJsonAsync<PayoutRequestResponse>();

        var resp = await _adminClient.PatchAsJsonAsync($"/api/payouts/{payout!.Id}",
            new ProcessPayoutRequest("Approved", "Funds transferred"));
        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);

        // Verify status was updated
        var all = await _adminClient.GetFromJsonAsync<List<AdminPayoutResponse>>("/api/payouts");
        var updated = all!.First(p => p.Id == payout.Id);
        Assert.Equal("Approved", updated.Status);
        Assert.Equal("Funds transferred", updated.AdminNotes);
        Assert.NotNull(updated.ProcessedAt);
    }

    [Fact]
    public async Task Process_Reject_Returns204()
    {
        var createResp = await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(100m, "BSB 100"));
        var payout = await createResp.Content.ReadFromJsonAsync<PayoutRequestResponse>();

        var resp = await _adminClient.PatchAsJsonAsync($"/api/payouts/{payout!.Id}",
            new ProcessPayoutRequest("Rejected", "Insufficient documentation"));
        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);

        var all = await _adminClient.GetFromJsonAsync<List<AdminPayoutResponse>>("/api/payouts");
        var updated = all!.First(p => p.Id == payout.Id);
        Assert.Equal("Rejected", updated.Status);
    }

    [Fact]
    public async Task Process_InvalidStatus_Returns400()
    {
        var createResp = await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(100m, "BSB 100"));
        var payout = await createResp.Content.ReadFromJsonAsync<PayoutRequestResponse>();

        var resp = await _adminClient.PatchAsJsonAsync($"/api/payouts/{payout!.Id}",
            new ProcessPayoutRequest("Pending", null));   // "Pending" is not a valid transition
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Process_NonExistentId_Returns404()
    {
        var resp = await _adminClient.PatchAsJsonAsync("/api/payouts/999999",
            new ProcessPayoutRequest("Approved", null));
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task Process_AlreadyApproved_Returns409()
    {
        var createResp = await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(100m, "BSB 100"));
        var payout = await createResp.Content.ReadFromJsonAsync<PayoutRequestResponse>();

        // Approve it once
        await _adminClient.PatchAsJsonAsync($"/api/payouts/{payout!.Id}",
            new ProcessPayoutRequest("Approved", null));

        // Attempt to approve again
        var second = await _adminClient.PatchAsJsonAsync($"/api/payouts/{payout.Id}",
            new ProcessPayoutRequest("Rejected", "Changed mind"));
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task AdminPayoutResponse_IncludesOrganizerName()
    {
        await _organiserClient.PostAsJsonAsync("/api/payouts",
            new CreatePayoutRequestRequest(888m, "BSB 888"));

        var resp = await _adminClient.GetAsync("/api/payouts");
        var list = await resp.Content.ReadFromJsonAsync<List<AdminPayoutResponse>>();

        var ours = list!.FirstOrDefault(p => p.Amount == 888m);
        Assert.NotNull(ours);
        Assert.False(string.IsNullOrWhiteSpace(ours.OrganizerName));
    }
}
