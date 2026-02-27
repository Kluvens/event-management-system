using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Integration tests for /api/store/* endpoints.
///
/// Key scenarios verified:
///  - GET /api/store/products is publicly accessible; AlreadyOwned flag is accurate
///  - Category filter works
///  - Purchase deducts loyalty points and returns remaining balance
///  - Duplicate purchase returns 409
///  - Insufficient points returns 400
///  - Admin-only CRUD: create, update, deactivate products
///  - Deactivated products are hidden from the public listing
///  - Unauthenticated / wrong-role requests receive 401 / 403
/// </summary>
public sealed class StoreControllerTests : IAsyncLifetime, IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;          // unauthenticated

    private HttpClient _adminClient  = null!;
    private HttpClient _userClient   = null!;
    private int        _userId;

    // A product created in InitializeAsync and reused across tests
    private StoreApiProduct _testProduct = null!;

    public StoreControllerTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client  = _factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        // SuperAdmin — registered via key-protected endpoint
        var saResp = await _client.PostAsJsonAsync("/api/dev/admin/register", new
        {
            name            = "Store Admin",
            email           = "storeadmin@store.test",
            password        = "Pass!",
            registrationKey = CustomWebApplicationFactory.TestAdminKey
        });
        saResp.EnsureSuccessStatusCode();
        var saBody = await saResp.Content.ReadFromJsonAsync<StoreAuthBody>();
        _adminClient = ApiClient.WithToken(_factory, saBody!.Token);

        // Regular user with enough loyalty points to buy things
        var (userToken, userId) = await ApiClient.RegisterAndGetIdAsync(
            _client, "Store User", "storeuser@store.test", "Pass!");
        _userId     = userId;
        _userClient = ApiClient.WithToken(_factory, userToken);

        // Give the user 10 000 points via admin
        await _adminClient.PostAsJsonAsync(
            $"/api/admin/users/{_userId}/adjust-points", new { delta = 10000 });

        // Create one product for tests that need an existing product
        var createResp = await _adminClient.PostAsJsonAsync("/api/store/products", new
        {
            name        = "Test Badge",
            description = "A badge for testing.",
            pointCost   = 500,
            category    = "Badge",
            imageUrl    = (string?)null
        });
        createResp.EnsureSuccessStatusCode();
        _testProduct = (await createResp.Content.ReadFromJsonAsync<StoreApiProduct>())!;
    }

    public Task DisposeAsync()
    {
        _adminClient?.Dispose();
        _userClient?.Dispose();
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        GC.SuppressFinalize(this);
    }

    // ── GET /api/store/products ────────────────────────────────────────

    [Fact]
    public async Task GetProducts_Unauthenticated_Returns200WithList()
    {
        var response = await _client.GetAsync("/api/store/products");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var products = await response.Content.ReadFromJsonAsync<List<StoreApiProduct>>();
        Assert.NotNull(products);
        Assert.True(products.Count > 0, "Expected at least the test product to be present.");
    }

    [Fact]
    public async Task GetProducts_CategoryFilter_ReturnsOnlyMatchingCategory()
    {
        var response = await _client.GetAsync("/api/store/products?category=Badge");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var products = await response.Content.ReadFromJsonAsync<List<StoreApiProduct>>();
        Assert.NotNull(products);
        Assert.All(products, p => Assert.Equal("Badge", p.Category));
    }

    [Fact]
    public async Task GetProducts_AuthenticatedBeforePurchase_AlreadyOwnedIsFalse()
    {
        var response = await _userClient.GetAsync("/api/store/products");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var products = await response.Content.ReadFromJsonAsync<List<StoreApiProduct>>();
        Assert.NotNull(products);
        var product = products.FirstOrDefault(p => p.Id == _testProduct.Id);
        Assert.NotNull(product);
        Assert.False(product.AlreadyOwned);
    }

    [Fact]
    public async Task GetProducts_AfterPurchase_AlreadyOwnedIsTrue()
    {
        // Purchase the product
        var purchaseResp = await _userClient.PostAsJsonAsync(
            "/api/store/purchase", new { productId = _testProduct.Id });
        Assert.Equal(HttpStatusCode.OK, purchaseResp.StatusCode);

        // Verify AlreadyOwned flag flips
        var listResp = await _userClient.GetAsync("/api/store/products");
        var products  = await listResp.Content.ReadFromJsonAsync<List<StoreApiProduct>>();
        Assert.NotNull(products);
        var product = products.First(p => p.Id == _testProduct.Id);
        Assert.True(product.AlreadyOwned);
    }

    // ── POST /api/store/purchase ──────────────────────────────────────

    [Fact]
    public async Task Purchase_Unauthenticated_Returns401()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/store/purchase", new { productId = _testProduct.Id });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Purchase_NonExistentProduct_Returns404()
    {
        var response = await _userClient.PostAsJsonAsync(
            "/api/store/purchase", new { productId = 99999 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Purchase_InsufficientPoints_Returns400()
    {
        // Register a user with zero points
        var poorToken = await ApiClient.RegisterAndLoginAsync(
            _client, "PoorUser", "poor@store.test", "Pass!");
        var poorClient = ApiClient.WithToken(_factory, poorToken);

        var response = await poorClient.PostAsJsonAsync(
            "/api/store/purchase", new { productId = _testProduct.Id });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Purchase_Success_Returns200WithCorrectDetails()
    {
        var response = await _userClient.PostAsJsonAsync(
            "/api/store/purchase", new { productId = _testProduct.Id });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<StorePurchaseResult>();
        Assert.NotNull(result);
        Assert.Equal(_testProduct.Name, result.ProductName);
        Assert.Equal(_testProduct.PointCost, result.PointsSpent);
        Assert.Equal(10000 - _testProduct.PointCost, result.RemainingPoints);
    }

    [Fact]
    public async Task Purchase_Success_DeductsPointsFromUser()
    {
        // Use a dedicated user so point balance is predictable
        var (token, id) = await ApiClient.RegisterAndGetIdAsync(
            _client, "DeductUser", "deduct@store.test", "Pass!");
        await _adminClient.PostAsJsonAsync(
            $"/api/admin/users/{id}/adjust-points", new { delta = 2000 });
        var client = ApiClient.WithToken(_factory, token);

        var resp = await client.PostAsJsonAsync(
            "/api/store/purchase", new { productId = _testProduct.Id });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var result = await resp.Content.ReadFromJsonAsync<StorePurchaseResult>();
        Assert.Equal(2000 - _testProduct.PointCost, result!.RemainingPoints);
    }

    [Fact]
    public async Task Purchase_DuplicatePurchase_Returns409()
    {
        // Use dedicated user to avoid interference from other tests
        var (token, id) = await ApiClient.RegisterAndGetIdAsync(
            _client, "DupUser", "dup@store.test", "Pass!");
        await _adminClient.PostAsJsonAsync(
            $"/api/admin/users/{id}/adjust-points", new { delta = 5000 });
        var client = ApiClient.WithToken(_factory, token);

        var first = await client.PostAsJsonAsync(
            "/api/store/purchase", new { productId = _testProduct.Id });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await client.PostAsJsonAsync(
            "/api/store/purchase", new { productId = _testProduct.Id });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    // ── GET /api/store/my-purchases ───────────────────────────────────

    [Fact]
    public async Task GetMyPurchases_Unauthenticated_Returns401()
    {
        var response = await _client.GetAsync("/api/store/my-purchases");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetMyPurchases_NoItemsOwned_Returns200EmptyList()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "NoPurchases", "nopurchases@store.test", "Pass!");
        var client = ApiClient.WithToken(_factory, token);

        var response = await client.GetAsync("/api/store/my-purchases");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var purchases = await response.Content.ReadFromJsonAsync<List<StoreUserPurchase>>();
        Assert.NotNull(purchases);
        Assert.Empty(purchases);
    }

    [Fact]
    public async Task GetMyPurchases_AfterPurchase_ContainsPurchasedItem()
    {
        var (token, id) = await ApiClient.RegisterAndGetIdAsync(
            _client, "PurchaseHistUser", "purchasehistory@store.test", "Pass!");
        await _adminClient.PostAsJsonAsync(
            $"/api/admin/users/{id}/adjust-points", new { delta = 5000 });
        var client = ApiClient.WithToken(_factory, token);

        await client.PostAsJsonAsync("/api/store/purchase", new { productId = _testProduct.Id });

        var response = await client.GetAsync("/api/store/my-purchases");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var purchases = await response.Content.ReadFromJsonAsync<List<StoreUserPurchase>>();
        Assert.NotNull(purchases);
        Assert.Single(purchases);
        Assert.Equal(_testProduct.Id, purchases[0].Product.Id);
        Assert.Equal(_testProduct.PointCost, purchases[0].PointsSpent);
    }

    // ── Admin: POST /api/store/products ───────────────────────────────

    [Fact]
    public async Task AdminCreateProduct_Attendee_Returns403()
    {
        var response = await _userClient.PostAsJsonAsync("/api/store/products", new
        {
            name        = "Unauthorized Product",
            description = "Should be rejected.",
            pointCost   = 100,
            category    = "Badge"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminCreateProduct_Admin_Returns201WithProduct()
    {
        var response = await _adminClient.PostAsJsonAsync("/api/store/products", new
        {
            name        = "New Admin Product",
            description = "Created by admin.",
            pointCost   = 750,
            category    = "Cosmetic"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var product = await response.Content.ReadFromJsonAsync<StoreApiProduct>();
        Assert.NotNull(product);
        Assert.Equal("New Admin Product", product.Name);
        Assert.Equal(750, product.PointCost);
        Assert.Equal("Cosmetic", product.Category);
        Assert.True(product.IsActive);
    }

    // ── Admin: PUT /api/store/products/{id} ───────────────────────────

    [Fact]
    public async Task AdminUpdateProduct_Attendee_Returns403()
    {
        var response = await _userClient.PutAsJsonAsync(
            $"/api/store/products/{_testProduct.Id}", new { name = "Hacked" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminUpdateProduct_Admin_Returns200WithUpdatedFields()
    {
        // Create a product to update
        var createResp = await _adminClient.PostAsJsonAsync("/api/store/products", new
        {
            name        = "Original Name",
            description = "Original.",
            pointCost   = 100,
            category    = "Feature"
        });
        var created = await createResp.Content.ReadFromJsonAsync<StoreApiProduct>();

        var updateResp = await _adminClient.PutAsJsonAsync(
            $"/api/store/products/{created!.Id}", new
            {
                name      = "Updated Name",
                pointCost = 200
            });

        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);
        var updated = await updateResp.Content.ReadFromJsonAsync<StoreApiProduct>();
        Assert.NotNull(updated);
        Assert.Equal("Updated Name", updated.Name);
        Assert.Equal(200, updated.PointCost);
    }

    // ── Admin: DELETE /api/store/products/{id} ────────────────────────

    [Fact]
    public async Task AdminDeactivateProduct_Attendee_Returns403()
    {
        var response = await _userClient.DeleteAsync(
            $"/api/store/products/{_testProduct.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminDeactivateProduct_Admin_Returns204()
    {
        // Create a disposable product
        var createResp = await _adminClient.PostAsJsonAsync("/api/store/products", new
        {
            name        = "To Deactivate",
            description = "Will be deactivated.",
            pointCost   = 100,
            category    = "Perk"
        });
        var product = await createResp.Content.ReadFromJsonAsync<StoreApiProduct>();

        var deleteResp = await _adminClient.DeleteAsync(
            $"/api/store/products/{product!.Id}");

        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);
    }

    [Fact]
    public async Task AdminDeactivateProduct_HidesProductFromPublicList()
    {
        // Create then deactivate
        var createResp = await _adminClient.PostAsJsonAsync("/api/store/products", new
        {
            name        = "Hidden Product",
            description = "Should disappear.",
            pointCost   = 100,
            category    = "Collectible"
        });
        var product = await createResp.Content.ReadFromJsonAsync<StoreApiProduct>();
        await _adminClient.DeleteAsync($"/api/store/products/{product!.Id}");

        // Public list should not contain deactivated product
        var listResp = await _client.GetAsync("/api/store/products");
        var products  = await listResp.Content.ReadFromJsonAsync<List<StoreApiProduct>>();
        Assert.NotNull(products);
        Assert.DoesNotContain(products, p => p.Id == product.Id);
    }

    [Fact]
    public async Task Purchase_DeactivatedProduct_Returns404()
    {
        // Create, deactivate, then try to purchase
        var createResp = await _adminClient.PostAsJsonAsync("/api/store/products", new
        {
            name        = "Deactivated Purchase Target",
            description = "Cannot be purchased.",
            pointCost   = 100,
            category    = "Badge"
        });
        var product = await createResp.Content.ReadFromJsonAsync<StoreApiProduct>();
        await _adminClient.DeleteAsync($"/api/store/products/{product!.Id}");

        var (token, id) = await ApiClient.RegisterAndGetIdAsync(
            _client, "DeactBuyUser", "deactbuy@store.test", "Pass!");
        await _adminClient.PostAsJsonAsync(
            $"/api/admin/users/{id}/adjust-points", new { delta = 5000 });
        var client = ApiClient.WithToken(_factory, token);

        var purchaseResp = await client.PostAsJsonAsync(
            "/api/store/purchase", new { productId = product.Id });
        Assert.Equal(HttpStatusCode.NotFound, purchaseResp.StatusCode);
    }
}

// ── Local DTO stubs (mirror backend response shapes) ─────────────────────────

internal record StoreAuthBody(string Token, int UserId);

internal record StoreApiProduct(
    int Id, string Name, string Description, int PointCost,
    string Category, string? ImageUrl, bool IsActive, bool AlreadyOwned);

internal record StorePurchaseResult(
    int PurchaseId, string ProductName, int PointsSpent, int RemainingPoints);

internal record StoreUserPurchase(
    int Id, StoreApiProduct Product, DateTime PurchasedAt, int PointsSpent);
