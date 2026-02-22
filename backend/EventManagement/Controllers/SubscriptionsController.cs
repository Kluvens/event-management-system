using System.Security.Claims;
using EventManagement.Data;
using EventManagement.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/subscriptions")]
[Authorize]
public class SubscriptionsController(AppDbContext db) : ControllerBase
{
    // ── Hosts I follow ─────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetMySubscriptions()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var hosts = await db.HostSubscriptions
            .Include(hs => hs.Host)
            .Where(hs => hs.SubscriberId == userId)
            .OrderBy(hs => hs.Host.Name)
            .Select(hs => new { hs.HostId, hs.Host.Name, hs.SubscribedAt })
            .ToListAsync();

        return Ok(hosts);
    }

    // ── Subscribe to a host ────────────────────────────────────────

    [HttpPost("{hostId}")]
    public async Task<IActionResult> Subscribe(int hostId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        if (userId == hostId)
            return BadRequest(new { message = "You cannot subscribe to yourself." });

        if (!await db.Users.AnyAsync(u => u.Id == hostId))
            return NotFound(new { message = "Host not found." });

        if (await db.HostSubscriptions.AnyAsync(hs => hs.SubscriberId == userId && hs.HostId == hostId))
            return Conflict(new { message = "Already subscribed." });

        db.HostSubscriptions.Add(new HostSubscription { SubscriberId = userId, HostId = hostId });
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Unsubscribe ────────────────────────────────────────────────

    [HttpDelete("{hostId}")]
    public async Task<IActionResult> Unsubscribe(int hostId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var sub = await db.HostSubscriptions.FindAsync(userId, hostId);
        if (sub is null) return NotFound();

        db.HostSubscriptions.Remove(sub);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── My subscribers (visible to me as a host) ───────────────────

    [HttpGet("subscribers")]
    public async Task<IActionResult> GetMySubscribers()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var subscribers = await db.HostSubscriptions
            .Include(hs => hs.Subscriber)
            .Where(hs => hs.HostId == userId)
            .OrderBy(hs => hs.Subscriber.Name)
            .Select(hs => new { hs.SubscriberId, hs.Subscriber.Name, hs.SubscribedAt })
            .ToListAsync();

        return Ok(subscribers);
    }
}
