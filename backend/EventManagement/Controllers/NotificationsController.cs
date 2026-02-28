using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(AppDbContext db, ICognitoUserResolver resolver)
    : AppControllerBase(resolver)
{
    // ── List my notifications ──────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        var userId = await GetCurrentUserIdAsync();

        var notifications = await db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new NotificationResponse(n.Id, n.Type, n.Title, n.Message, n.IsRead, n.CreatedAt, n.EventId))
            .ToListAsync();

        return Ok(notifications);
    }

    // ── Unread count ───────────────────────────────────────────────

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = await GetCurrentUserIdAsync();
        var count  = await db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
        return Ok(new UnreadCountResponse(count));
    }

    // ── Mark one as read ───────────────────────────────────────────

    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var userId = await GetCurrentUserIdAsync();
        var n = await db.Notifications.FindAsync(id);
        if (n is null || n.UserId != userId) return NotFound();
        n.IsRead = true;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Mark all as read ───────────────────────────────────────────

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = await GetCurrentUserIdAsync();
        await db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return NoContent();
    }
}
