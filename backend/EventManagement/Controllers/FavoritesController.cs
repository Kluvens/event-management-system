using EventManagement.Data;
using EventManagement.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EventManagement.Services;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/favorites")]
[Authorize]
public class FavoritesController(AppDbContext db, ICognitoUserResolver resolver)
    : AppControllerBase(resolver)
{
    // ── List my saved events ───────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetMyFavorites()
    {
        var userId = await GetCurrentUserIdAsync();

        var events = await db.UserFavorites
            .Where(uf => uf.UserId == userId && !uf.Event.IsSuspended)
            .OrderByDescending(uf => uf.SavedAt)
            .Include(uf => uf.Event).ThenInclude(e => e.CreatedBy)
            .Include(uf => uf.Event).ThenInclude(e => e.Category)
            .Include(uf => uf.Event).ThenInclude(e => e.Bookings)
            .Include(uf => uf.Event).ThenInclude(e => e.EventTags).ThenInclude(et => et.Tag)
            .Select(uf => uf.Event)
            .ToListAsync();

        return Ok(events.Select(EventsController.ToResponse));
    }

    // ── Get my saved event IDs (for fast heart-button state) ───────

    [HttpGet("ids")]
    public async Task<IActionResult> GetMyFavoriteIds()
    {
        var userId = await GetCurrentUserIdAsync();
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
        var userId = await GetCurrentUserIdAsync();

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
        var userId = await GetCurrentUserIdAsync();

        var fav = await db.UserFavorites.FindAsync(userId, eventId);
        if (fav is null) return NotFound();

        db.UserFavorites.Remove(fav);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
