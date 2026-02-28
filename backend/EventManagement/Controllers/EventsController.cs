using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EventManagement.Services;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController(AppDbContext db, ICognitoUserResolver resolver)
    : AppControllerBase(resolver)
{
    private const string RoleAdmin       = "Admin";
    private const string RoleSuperAdmin  = "SuperAdmin";
    private const string StatusConfirmed = "Confirmed";
    private const string StatusCancelled = "Cancelled";
    private const string StatusPostponed = "Postponed";
    private const string StatusDraft     = "Draft";
    private const string StatusPublished = "Published";

    // ── List ───────────────────────────────────────────────────────

    /// <summary>
    /// List events. Anonymous users see only public non-draft events.
    /// sortBy: date (default) | popularity | price
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? location,
        [FromQuery] int? categoryId,
        [FromQuery] List<int>? tagIds,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? sortBy,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12)
    {
        int? userId = GetCurrentSub() is not null ? await GetCurrentUserIdAsync() : null;
        var role         = GetCurrentRole();
        var isSuperAdmin = role == RoleSuperAdmin;

        var isAdmin = role is RoleAdmin or RoleSuperAdmin;

        var query = db.Events
            .Include(e => e.CreatedBy)
            .Include(e => e.Category)
            .Include(e => e.Bookings)
            .Include(e => e.EventTags).ThenInclude(et => et.Tag)
            .AsQueryable();

        query = ApplyVisibilityFilter(query, userId, isAdmin, isSuperAdmin);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(e =>
                e.Title.Contains(search) ||
                e.Description.Contains(search) ||
                e.Location.Contains(search));

        if (!string.IsNullOrWhiteSpace(location))
            query = query.Where(e => e.Location.Contains(location));

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
            "price"      => query.OrderBy(e => (double)e.Price),
            _            => query.OrderBy(e => e.StartDate)
        };

        int total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => ToResponse(e, null))
            .ToListAsync();

        return Ok(new PagedEventResponse(items, total, page * pageSize < total));
    }

    // ── Single ─────────────────────────────────────────────────────

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id, [FromQuery] string? code = null)
    {
        int? userId = GetCurrentSub() is not null ? await GetCurrentUserIdAsync() : null;
        var role         = GetCurrentRole();
        var isSuperAdmin = role == RoleSuperAdmin;
        var isAdmin      = role == RoleAdmin;

        var ev = await db.Events
            .Include(e => e.CreatedBy)
            .Include(e => e.Category)
            .Include(e => e.Bookings)
            .Include(e => e.EventTags).ThenInclude(et => et.Tag)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (ev is null) return NotFound();
        if (ev.IsSuspended && !isSuperAdmin) return NotFound();

        var hasValidCode = !string.IsNullOrEmpty(code)
                           && !string.IsNullOrEmpty(ev.InviteCode)
                           && code == ev.InviteCode;

        if (!ev.IsPublic && ev.CreatedById != userId && !isAdmin && !isSuperAdmin && !hasValidCode)
            return NotFound();
        if (ev.Status == StatusDraft && ev.CreatedById != userId && !isAdmin && !isSuperAdmin)
            return NotFound();
        if (ev.Status == StatusCancelled && ev.CreatedById != userId && !isAdmin && !isSuperAdmin)
            return NotFound();

        // Only expose the invite code to the event owner
        var ownerInviteCode = (userId.HasValue && ev.CreatedById == userId.Value) ? ev.InviteCode : null;
        return Ok(ToResponse(ev, ownerInviteCode));
    }

    // ── Invite code ────────────────────────────────────────────────

    /// <summary>Generate (or regenerate) an invite code for a private event.</summary>
    [Authorize]
    [HttpPost("{id}/invite-code")]
    public async Task<IActionResult> GenerateInviteCode(int id)
    {
        var userId = await GetCurrentUserIdAsync();
        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId) return Forbid();

        ev.InviteCode = Guid.NewGuid().ToString("N"); // 32-char hex, no hyphens
        await db.SaveChangesAsync();
        return Ok(new { inviteCode = ev.InviteCode });
    }

    /// <summary>Revoke the invite code for a private event.</summary>
    [Authorize]
    [HttpDelete("{id}/invite-code")]
    public async Task<IActionResult> RevokeInviteCode(int id)
    {
        var userId = await GetCurrentUserIdAsync();
        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId) return Forbid();

        ev.InviteCode = null;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Stats (host / admin) ───────────────────────────────────────

    [Authorize]
    [HttpGet("{id}/stats")]
    public async Task<IActionResult> GetStats(int id)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var ev = await db.Events
            .Include(e => e.Bookings)
            .Include(e => e.Reviews)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin && role != RoleSuperAdmin) return Forbid();

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
        var userId = await GetCurrentUserIdAsync();

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
            CreatedById = userId,
            ImageUrl    = req.ImageUrl,
            Status      = req.Publish ? StatusPublished : StatusDraft
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

    // ── Publish ────────────────────────────────────────────────────

    [Authorize]
    [HttpPost("{id}/publish")]
    public async Task<IActionResult> Publish(int id)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin && role != RoleSuperAdmin) return Forbid();
        if (ev.Status != StatusDraft)
            return BadRequest(new { message = "Only Draft events can be published." });

        ev.Status = StatusPublished;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Update ─────────────────────────────────────────────────────

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateEventRequest req)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var ev = await db.Events.Include(e => e.EventTags).FirstOrDefaultAsync(e => e.Id == id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin && role != RoleSuperAdmin) return Forbid();

        ev.Title       = req.Title;
        ev.Description = req.Description;
        ev.Location    = req.Location;
        ev.StartDate   = req.StartDate;
        ev.EndDate     = req.EndDate;
        ev.Capacity    = req.Capacity;
        ev.Price       = req.Price;
        ev.IsPublic    = req.IsPublic;
        ev.CategoryId  = req.CategoryId;
        ev.ImageUrl    = req.ImageUrl;

        db.EventTags.RemoveRange(ev.EventTags);
        await db.SaveChangesAsync();
        await ApplyTagsAsync(ev.Id, req.TagIds);

        // Notify subscribers and bookers when a published/postponed event is updated
        if (ev.Status is StatusPublished or StatusPostponed)
        {
            var subscriberIds = await db.HostSubscriptions
                .Where(hs => hs.HostId == ev.CreatedById)
                .Select(hs => hs.SubscriberId)
                .ToListAsync();

            var bookerIds = await db.Bookings
                .Where(b => b.EventId == ev.Id && b.Status == StatusConfirmed)
                .Select(b => b.UserId)
                .ToListAsync();

            var recipients = subscriberIds
                .Union(bookerIds)
                .Distinct()
                .Where(uid => uid != ev.CreatedById)
                .ToList();

            db.Notifications.AddRange(recipients.Select(uid => new Notification
            {
                UserId  = uid,
                Type    = "EventUpdate",
                Title   = $"Event updated: {ev.Title}",
                Message = $"The organiser has updated details for \"{ev.Title}\". Check the event page for the latest information.",
                EventId = ev.Id,
            }));
            await db.SaveChangesAsync();
        }

        return NoContent();
    }

    // ── Cancel ─────────────────────────────────────────────────────

    [Authorize]
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin && role != RoleSuperAdmin) return Forbid();
        if (ev.Status == StatusCancelled)
            return BadRequest(new { message = "Event is already cancelled." });

        ev.Status = StatusCancelled;

        db.Announcements.Add(new Announcement
        {
            EventId = id,
            Title   = "Event Cancelled",
            Message = $"{ev.Title} has been cancelled."
        });

        // Notify all confirmed attendees
        var cancelAttendeeIds = await db.Bookings
            .Where(b => b.EventId == id && b.Status == StatusConfirmed)
            .Select(b => b.UserId)
            .Distinct()
            .ToListAsync();

        db.Notifications.AddRange(cancelAttendeeIds.Select(uid => new Notification
        {
            UserId  = uid,
            Type    = "EventCancelled",
            Title   = $"Event cancelled: {ev.Title}",
            Message = $"Unfortunately, \"{ev.Title}\" has been cancelled. We're sorry for the inconvenience.",
            EventId = id,
        }));

        await db.SaveChangesAsync();

        return NoContent();
    }

    // ── Postpone ───────────────────────────────────────────────────

    [Authorize]
    [HttpPost("{id}/postpone")]
    public async Task<IActionResult> Postpone(int id, PostponeEventRequest req)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin && role != RoleSuperAdmin) return Forbid();
        if (ev.Status == StatusCancelled)
            return BadRequest(new { message = "Cannot postpone a cancelled event." });

        ev.PostponedDate = ev.StartDate; // record original date
        ev.StartDate     = req.NewStartDate;
        ev.EndDate       = req.NewEndDate;
        ev.Status        = StatusPostponed;

        db.Announcements.Add(new Announcement
        {
            EventId = id,
            Title   = "Event Postponed",
            Message = $"{ev.Title} has been moved to {req.NewStartDate:MMM dd yyyy}."
        });

        // Notify all confirmed attendees
        var postponeAttendeeIds = await db.Bookings
            .Where(b => b.EventId == id && b.Status == StatusConfirmed)
            .Select(b => b.UserId)
            .Distinct()
            .ToListAsync();

        db.Notifications.AddRange(postponeAttendeeIds.Select(uid => new Notification
        {
            UserId  = uid,
            Type    = "EventPostponed",
            Title   = $"Event rescheduled: {ev.Title}",
            Message = $"\"{ev.Title}\" has been moved to {req.NewStartDate:MMM d, yyyy}. Your booking remains valid.",
            EventId = id,
        }));

        await db.SaveChangesAsync();

        return NoContent();
    }

    // ── Delete ─────────────────────────────────────────────────────

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin && role != RoleSuperAdmin) return Forbid();

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
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin && role != RoleSuperAdmin) return Forbid();

        var announcement = new Announcement
        {
            EventId = id,
            Title   = req.Title,
            Message = req.Message
        };

        db.Announcements.Add(announcement);

        // Fan-out in-app notification to all confirmed attendees
        var attendeeIds = await db.Bookings
            .Where(b => b.EventId == id && b.Status == StatusConfirmed)
            .Select(b => b.UserId)
            .Distinct()
            .ToListAsync();

        db.Notifications.AddRange(attendeeIds.Select(uid => new Notification
        {
            UserId  = uid,
            Type    = "Announcement",
            Title   = $"📢 {req.Title}",
            Message = req.Message,
            EventId = id,
        }));

        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAnnouncements), new { id },
            new AnnouncementResponse(announcement.Id, id, ev.Title,
                announcement.Title, announcement.Message, announcement.CreatedAt));
    }

    // ── Analytics ──────────────────────────────────────────────────

    [Authorize]
    [HttpGet("{id}/analytics")]
    public async Task<IActionResult> GetAnalytics(int id)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var ev = await db.Events
            .Include(e => e.Bookings)
            .Include(e => e.Reviews)
            .Include(e => e.WaitlistEntries)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != RoleAdmin && role != RoleSuperAdmin) return Forbid();

        var confirmed  = ev.Bookings.Count(b => b.Status == StatusConfirmed);
        var cancelled  = ev.Bookings.Count(b => b.Status == StatusCancelled);
        var revenue    = confirmed * ev.Price;
        var avgRating  = ev.Reviews.Count > 0 ? ev.Reviews.Average(r => r.Rating) : 0.0;
        var waitlist   = ev.WaitlistEntries.Count;

        // Daily confirmed bookings over past 30 days
        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-29));
        var daily = ev.Bookings
            .Where(b => b.Status == StatusConfirmed && DateOnly.FromDateTime(b.BookedAt) >= since)
            .GroupBy(b => DateOnly.FromDateTime(b.BookedAt))
            .Select(g => new DailyBookingCount(g.Key, g.Count()))
            .OrderBy(d => d.Date)
            .ToList();

        return Ok(new EventAnalyticsResponse(
            ev.Id, ev.Title, ev.Capacity,
            confirmed, cancelled, waitlist,
            ev.Capacity > 0 ? (double)confirmed / ev.Capacity * 100 : 0,
            revenue, avgRating, ev.Reviews.Count, daily));
    }

    // ── Waitlist ───────────────────────────────────────────────────

    [Authorize]
    [HttpGet("{id}/waitlist/position")]
    public async Task<IActionResult> GetWaitlistPosition(int id)
    {
        var userId = await GetCurrentUserIdAsync();

        var entry = await db.WaitlistEntries
            .FirstOrDefaultAsync(w => w.EventId == id && w.UserId == userId);

        if (entry is null) return NotFound();
        return Ok(new WaitlistPositionResponse(id, entry.Position, entry.JoinedAt));
    }

    [Authorize]
    [HttpPost("{id}/waitlist")]
    public async Task<IActionResult> JoinWaitlist(int id)
    {
        var userId = await GetCurrentUserIdAsync();

        var ev = await db.Events.Include(e => e.Bookings).FirstOrDefaultAsync(e => e.Id == id);
        if (ev is null) return NotFound();
        if (ev.IsSuspended) return BadRequest(new { message = "Event is unavailable." });
        if (ev.Status == StatusCancelled) return BadRequest(new { message = "Event is cancelled." });
        if (ev.Status == StatusDraft) return BadRequest(new { message = "Event is not published." });

        // Only allow joining waitlist if event is full
        var confirmedCount = ev.Bookings.Count(b => b.Status == StatusConfirmed);
        if (confirmedCount < ev.Capacity)
            return BadRequest(new { message = "Event still has available spots. Book directly." });

        // Check already has active booking
        if (await db.Bookings.AnyAsync(b => b.UserId == userId && b.EventId == id && b.Status == StatusConfirmed))
            return Conflict(new { message = "You already have a booking for this event." });

        if (await db.WaitlistEntries.AnyAsync(w => w.UserId == userId && w.EventId == id))
            return Conflict(new { message = "Already on waitlist." });

        var position = await db.WaitlistEntries.CountAsync(w => w.EventId == id) + 1;
        db.WaitlistEntries.Add(new WaitlistEntry { EventId = id, UserId = userId, Position = position });
        await db.SaveChangesAsync();

        return Created(string.Empty, new WaitlistPositionResponse(id, position, DateTime.UtcNow));
    }

    [Authorize]
    [HttpDelete("{id}/waitlist")]
    public async Task<IActionResult> LeaveWaitlist(int id)
    {
        var userId = await GetCurrentUserIdAsync();

        var entry = await db.WaitlistEntries
            .FirstOrDefaultAsync(w => w.EventId == id && w.UserId == userId);
        if (entry is null) return NotFound();

        var removedPosition = entry.Position;
        db.WaitlistEntries.Remove(entry);

        // Re-number entries after the removed one
        var subsequent = await db.WaitlistEntries
            .Where(w => w.EventId == id && w.Position > removedPosition)
            .ToListAsync();
        foreach (var w in subsequent) w.Position--;

        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers ────────────────────────────────────────────────────

    private static IQueryable<Event> ApplyVisibilityFilter(
        IQueryable<Event> query, int? userId, bool isAdmin, bool isSuperAdmin)
    {
        if (!isSuperAdmin)
            query = query.Where(e => !e.IsSuspended);

        if (isAdmin) return query;

        // Private events are only visible to their owner
        query = userId.HasValue
            ? query.Where(e => e.IsPublic || e.CreatedById == userId.Value)
            : query.Where(e => e.IsPublic);

        // Draft events are only visible to their owner
        query = userId.HasValue
            ? query.Where(e => e.Status != StatusDraft || e.CreatedById == userId.Value)
            : query.Where(e => e.Status != StatusDraft);

        // Cancelled events are not visible to the public (only owner/admin can see them)
        query = userId.HasValue
            ? query.Where(e => e.Status != StatusCancelled || e.CreatedById == userId.Value)
            : query.Where(e => e.Status != StatusCancelled);

        // Completed events (past end date) are hidden from the browse listing;
        // attendees access them via their bookings history
        query = query.Where(e => e.EndDate >= DateTime.UtcNow);

        return query;
    }

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

    internal static string ComputeDisplayStatus(Event e, int confirmedCount)
    {
        if (e.Status is StatusDraft or StatusCancelled or StatusPostponed) return e.Status;
        var now = DateTime.UtcNow;
        if (e.EndDate < now)              return "Completed";
        if (e.StartDate <= now)           return "Live";
        if (confirmedCount >= e.Capacity) return "SoldOut";
        return "Published";
    }

    internal static EventResponse ToResponse(Event e, string? inviteCode = null)
    {
        var confirmed = e.Bookings.Count(b => b.Status == StatusConfirmed);
        return new EventResponse(
            e.Id, e.Title, e.Description, e.Location,
            e.StartDate, e.EndDate, e.Capacity,
            confirmed,
            e.Price, e.IsPublic, e.Status,
            ComputeDisplayStatus(e, confirmed),
            e.PostponedDate,
            e.CreatedAt, e.CreatedById, e.CreatedBy.Name,
            e.CategoryId, e.Category.Name,
            e.EventTags.Select(et => et.Tag.Name).ToList(),
            e.ImageUrl,
            inviteCode);
    }
}
