using System.Security.Claims;
using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController(AppDbContext db) : ControllerBase
{
    private const string RoleAdmin       = "Admin";
    private const string StatusConfirmed = "Confirmed";
    private const string StatusCancelled = "Cancelled";
    private const string StatusPostponed = "Postponed";

    // ── List ───────────────────────────────────────────────────────

    /// <summary>
    /// List events. Anonymous users see only public events.
    /// sortBy: date (default) | popularity | price
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] int? categoryId,
        [FromQuery] List<int>? tagIds,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? sortBy)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userId    = userIdStr is not null ? int.Parse(userIdStr) : (int?)null;

        var query = db.Events
            .Include(e => e.CreatedBy)
            .Include(e => e.Category)
            .Include(e => e.Bookings)
            .Include(e => e.EventTags).ThenInclude(et => et.Tag)
            .AsQueryable();

        // Visibility: unauthenticated → only public; authenticated → public + own private
        query = userId.HasValue
            ? query.Where(e => e.IsPublic || e.CreatedById == userId.Value)
            : query.Where(e => e.IsPublic);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(e =>
                e.Title.Contains(search) ||
                e.Description.Contains(search) ||
                e.Location.Contains(search));

        if (categoryId.HasValue)
            query = query.Where(e => e.CategoryId == categoryId.Value);

        if (tagIds is { Count: > 0 })
            query = query.Where(e => e.EventTags.Any(et => tagIds.Contains(et.TagId)));

        if (from.HasValue)
            query = query.Where(e => e.StartDate >= from.Value);

        if (to.HasValue)
            query = query.Where(e => e.StartDate <= to.Value);

        query = sortBy?.ToLower() switch
        {
            "popularity" => query.OrderByDescending(e => e.Bookings.Count(b => b.Status == StatusConfirmed)),
            "price"      => query.OrderBy(e => e.Price),
            _            => query.OrderBy(e => e.StartDate)
        };

        var events = await query
            .Select(e => ToResponse(e))
            .ToListAsync();

        return Ok(events);
    }

    // ── Single ─────────────────────────────────────────────────────

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userId    = userIdStr is not null ? int.Parse(userIdStr) : (int?)null;

        var ev = await db.Events
            .Include(e => e.CreatedBy)
            .Include(e => e.Category)
            .Include(e => e.Bookings)
            .Include(e => e.EventTags).ThenInclude(et => et.Tag)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (ev is null) return NotFound();
        if (!ev.IsPublic && ev.CreatedById != userId) return NotFound();

        return Ok(ToResponse(ev));
    }

    // ── Stats (host / admin) ───────────────────────────────────────

    [Authorize]
    [HttpGet("{id}/stats")]
    public async Task<IActionResult> GetStats(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role   = User.FindFirstValue(ClaimTypes.Role);

        var ev = await db.Events
            .Include(e => e.Bookings)
            .Include(e => e.Reviews)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin) return Forbid();

        var confirmed  = ev.Bookings.Count(b => b.Status == StatusConfirmed);
        var cancelled  = ev.Bookings.Count(b => b.Status == StatusCancelled);
        var revenue    = confirmed * ev.Price;
        var avgRating  = ev.Reviews.Count > 0 ? ev.Reviews.Average(r => r.Rating) : 0.0;

        return Ok(new EventStatsResponse(
            ev.Id, ev.Title, ev.Capacity,
            confirmed, cancelled,
            ev.Capacity > 0 ? (double)confirmed / ev.Capacity * 100 : 0,
            revenue, avgRating, ev.Reviews.Count));
    }

    // ── Create ─────────────────────────────────────────────────────

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create(CreateEventRequest req)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var ev = new Event
        {
            Title       = req.Title,
            Description = req.Description,
            Location    = req.Location,
            StartDate   = req.StartDate,
            EndDate     = req.EndDate,
            Capacity    = req.Capacity,
            Price       = req.Price,
            IsPublic    = req.IsPublic,
            CategoryId  = req.CategoryId,
            CreatedById = userId
        };

        db.Events.Add(ev);
        await db.SaveChangesAsync();

        await ApplyTagsAsync(ev.Id, req.TagIds);

        await db.Entry(ev).Reference(e => e.CreatedBy).LoadAsync();
        await db.Entry(ev).Reference(e => e.Category).LoadAsync();
        await db.Entry(ev).Collection(e => e.EventTags).Query()
            .Include(et => et.Tag).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = ev.Id }, ToResponse(ev));
    }

    // ── Update ─────────────────────────────────────────────────────

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateEventRequest req)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role   = User.FindFirstValue(ClaimTypes.Role);

        var ev = await db.Events.Include(e => e.EventTags).FirstOrDefaultAsync(e => e.Id == id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin) return Forbid();

        ev.Title       = req.Title;
        ev.Description = req.Description;
        ev.Location    = req.Location;
        ev.StartDate   = req.StartDate;
        ev.EndDate     = req.EndDate;
        ev.Capacity    = req.Capacity;
        ev.Price       = req.Price;
        ev.IsPublic    = req.IsPublic;
        ev.CategoryId  = req.CategoryId;

        db.EventTags.RemoveRange(ev.EventTags);
        await db.SaveChangesAsync();
        await ApplyTagsAsync(ev.Id, req.TagIds);

        return NoContent();
    }

    // ── Cancel ─────────────────────────────────────────────────────

    [Authorize]
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role   = User.FindFirstValue(ClaimTypes.Role);

        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin) return Forbid();
        if (ev.Status == StatusCancelled)
            return BadRequest(new { message = "Event is already cancelled." });

        ev.Status = StatusCancelled;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Postpone ───────────────────────────────────────────────────

    [Authorize]
    [HttpPost("{id}/postpone")]
    public async Task<IActionResult> Postpone(int id, PostponeEventRequest req)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role   = User.FindFirstValue(ClaimTypes.Role);

        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin) return Forbid();
        if (ev.Status == StatusCancelled)
            return BadRequest(new { message = "Cannot postpone a cancelled event." });

        ev.PostponedDate = ev.StartDate; // record original date
        ev.StartDate     = req.NewStartDate;
        ev.EndDate       = req.NewEndDate;
        ev.Status        = StatusPostponed;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Delete ─────────────────────────────────────────────────────

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role   = User.FindFirstValue(ClaimTypes.Role);

        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin) return Forbid();

        db.Events.Remove(ev);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Announcements ──────────────────────────────────────────────

    [HttpGet("{id}/announcements")]
    public async Task<IActionResult> GetAnnouncements(int id)
    {
        if (!await db.Events.AnyAsync(e => e.Id == id)) return NotFound();

        var list = await db.Announcements
            .Include(a => a.Event)
            .Where(a => a.EventId == id)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AnnouncementResponse(
                a.Id, a.EventId, a.Event.Title, a.Title, a.Message, a.CreatedAt))
            .ToListAsync();

        return Ok(list);
    }

    [Authorize]
    [HttpPost("{id}/announcements")]
    public async Task<IActionResult> CreateAnnouncement(int id, CreateAnnouncementRequest req)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role   = User.FindFirstValue(ClaimTypes.Role);

        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin) return Forbid();

        var announcement = new Announcement
        {
            EventId = id,
            Title   = req.Title,
            Message = req.Message
        };

        db.Announcements.Add(announcement);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAnnouncements), new { id },
            new AnnouncementResponse(announcement.Id, id, ev.Title,
                announcement.Title, announcement.Message, announcement.CreatedAt));
    }

    // ── Helpers ────────────────────────────────────────────────────

    private async Task ApplyTagsAsync(int eventId, List<int>? tagIds)
    {
        if (tagIds is null or { Count: 0 }) return;

        var validIds = await db.Tags
            .Where(t => tagIds.Contains(t.Id))
            .Select(t => t.Id)
            .ToListAsync();

        db.EventTags.AddRange(validIds.Select(tid => new EventTag { EventId = eventId, TagId = tid }));
        await db.SaveChangesAsync();
    }

    private static EventResponse ToResponse(Event e) => new(
        e.Id, e.Title, e.Description, e.Location,
        e.StartDate, e.EndDate, e.Capacity,
        e.Bookings.Count(b => b.Status == StatusConfirmed),
        e.Price, e.IsPublic, e.Status, e.PostponedDate,
        e.CreatedAt, e.CreatedById, e.CreatedBy.Name,
        e.CategoryId, e.Category.Name,
        e.EventTags.Select(et => et.Tag.Name).ToList());
}
