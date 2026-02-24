using System.Security.Claims;
using EventManagement.Data;
using EventManagement.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/favorites")]
[Authorize]
public class FavoritesController(AppDbContext db) : ControllerBase
{
    // ── List my saved events ───────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetMyFavorites()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var events = await db.UserFavorites
            .Where(uf => uf.UserId == userId)
            .OrderByDescending(uf => uf.SavedAt)
            .Select(uf => uf.Event)
            .Include(e => e.CreatedBy)
            .Include(e => e.Category)
            .Include(e => e.Bookings)
            .Include(e => e.EventTags).ThenInclude(et => et.Tag)
            .Where(e => !e.IsSuspended)
            .ToListAsync();

        return Ok(events.Select(EventsController.ToResponse));
    }

    // ── Get my saved event IDs (for fast heart-button state) ───────

    [HttpGet("ids")]
    public async Task<IActionResult> GetMyFavoriteIds()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var ids = await db.UserFavorites
            .Where(uf => uf.UserId == userId)
            .Select(uf => uf.EventId)
            .ToListAsync();
        return Ok(ids);
    }

    // ── Save an event ──────────────────────────────────────────────

    [HttpPost("{eventId:int}")]
    public async Task<IActionResult> Add(int eventId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        if (!await db.Events.AnyAsync(e => e.Id == eventId && !e.IsSuspended))
            return NotFound();

        if (await db.UserFavorites.AnyAsync(uf => uf.UserId == userId && uf.EventId == eventId))
            return Conflict(new { message = "Already in favourites." });

        db.UserFavorites.Add(new UserFavorite { UserId = userId, EventId = eventId });
        await db.SaveChangesAsync();
        return Created(string.Empty, null);
    }

    // ── Remove an event ────────────────────────────────────────────

    [HttpDelete("{eventId:int}")]
    public async Task<IActionResult> Remove(int eventId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var fav = await db.UserFavorites.FindAsync(userId, eventId);
        if (fav is null) return NotFound();

        db.UserFavorites.Remove(fav);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
