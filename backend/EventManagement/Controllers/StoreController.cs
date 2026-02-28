using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Models;
using EventManagement.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/store")]
public class StoreController(AppDbContext db, ICognitoUserResolver resolver)
    : AppControllerBase(resolver)
{
    // ── Products ──────────────────────────────────────────────────────

    [HttpGet("products")]
    public async Task<IActionResult> GetProducts([FromQuery] string? category)
    {
        var query = db.StoreProducts.Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);

        var products = await query
            .OrderBy(p => p.Category)
            .ThenBy(p => p.PointCost)
            .ToListAsync();

        // Populate alreadyOwned if user is authenticated
        HashSet<int> ownedIds = [];
        var sub = GetCurrentSub();
        if (sub is not null)
        {
            var userId = await resolver.ResolveUserIdAsync(User);
            if (userId.HasValue)
            {
                ownedIds = (await db.UserPurchases
                    .Where(up => up.UserId == userId.Value)
                    .Select(up => up.ProductId)
                    .ToListAsync()).ToHashSet();
            }
        }

        var result = products.Select(p => ToProductResponse(p, ownedIds.Contains(p.Id)));
        return Ok(result);
    }

    // ── Purchase ──────────────────────────────────────────────────────

    [HttpPost("purchase")]
    [Authorize]
    public async Task<IActionResult> Purchase(PurchaseProductRequest req)
    {
        var userId = await GetCurrentUserIdAsync();

        var product = await db.StoreProducts.FindAsync(req.ProductId);
        if (product is null || !product.IsActive)
            return NotFound(new { message = "Product not found." });

        var user = await db.Users.FindAsync(userId);
        if (user!.LoyaltyPoints < product.PointCost)
            return BadRequest(new { message = "Not enough loyalty points." });

        var alreadyOwned = await db.UserPurchases
            .AnyAsync(up => up.UserId == userId && up.ProductId == product.Id);
        if (alreadyOwned)
            return Conflict(new { message = "You already own this item." });

        user.LoyaltyPoints -= product.PointCost;

        var purchase = new UserPurchase
        {
            UserId     = userId,
            ProductId  = product.Id,
            PointsSpent = product.PointCost
        };
        db.UserPurchases.Add(purchase);
        await db.SaveChangesAsync();

        return Ok(new PurchaseProductResponse(purchase.Id, product.Name, product.PointCost, user.LoyaltyPoints));
    }

    // ── My purchases ──────────────────────────────────────────────────

    [HttpGet("my-purchases")]
    [Authorize]
    public async Task<IActionResult> GetMyPurchases()
    {
        var userId = await GetCurrentUserIdAsync();

        var raw = await db.UserPurchases
            .Include(up => up.Product)
            .Where(up => up.UserId == userId)
            .OrderByDescending(up => up.PurchasedAt)
            .ToListAsync();

        var purchases = raw.Select(up =>
            new UserPurchaseResponse(up.Id, ToProductResponse(up.Product, true), up.PurchasedAt, up.PointsSpent));

        return Ok(purchases);
    }

    // ── Admin: create product ─────────────────────────────────────────

    [HttpPost("products")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> CreateProduct(CreateProductRequest req)
    {
        var product = new StoreProduct
        {
            Name        = req.Name,
            Description = req.Description,
            PointCost   = req.PointCost,
            Category    = req.Category,
            ImageUrl    = req.ImageUrl
        };
        db.StoreProducts.Add(product);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProducts), ToProductResponse(product, false));
    }

    // ── Admin: update product ─────────────────────────────────────────

    [HttpPut("products/{id}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> UpdateProduct(int id, UpdateProductRequest req)
    {
        var product = await db.StoreProducts.FindAsync(id);
        if (product is null) return NotFound();

        if (req.Name        is not null) product.Name        = req.Name;
        if (req.Description is not null) product.Description = req.Description;
        if (req.PointCost   is not null) product.PointCost   = req.PointCost.Value;
        if (req.Category    is not null) product.Category    = req.Category;
        if (req.ImageUrl    is not null) product.ImageUrl    = req.ImageUrl;
        if (req.IsActive    is not null) product.IsActive    = req.IsActive.Value;

        await db.SaveChangesAsync();
        return Ok(ToProductResponse(product, false));
    }

    // ── Admin: deactivate product ─────────────────────────────────────

    [HttpDelete("products/{id}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> DeactivateProduct(int id)
    {
        var product = await db.StoreProducts.FindAsync(id);
        if (product is null) return NotFound();

        product.IsActive = false;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helper ────────────────────────────────────────────────────────

    private static StoreProductResponse ToProductResponse(StoreProduct p, bool alreadyOwned) =>
        new(p.Id, p.Name, p.Description, p.PointCost, p.Category, p.ImageUrl, p.IsActive, alreadyOwned);
}
