using System.Text;
using EventManagement.Data;
using EventManagement.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EventManagement.Services;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/organizers")]
public class OrganizersController(AppDbContext db, ICognitoUserResolver resolver)
    : AppControllerBase(resolver)
{
    private const string StatusConfirmed = "Confirmed";
    private const string StatusCancelled = "Cancelled";

    // ── Public profile ─────────────────────────────────────────────

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetPublicProfile(int id)
    {
        var organizer = await db.Users.FindAsync(id);
        if (organizer is null) return NotFound();

        var followerCount = await db.HostSubscriptions.CountAsync(hs => hs.HostId == id);

        var events = await db.Events
            .Include(e => e.Bookings)
            .Where(e => e.CreatedById == id && e.Status != "Draft" && e.Status != StatusCancelled)
            .OrderByDescending(e => e.StartDate)
            .Select(e => new OrganizerEventSummary(
                e.Id,
                e.Title,
                ComputeDisplayStatus(e, e.Bookings.Count(b => b.Status == StatusConfirmed)),
                e.StartDate,
                e.Bookings.Count(b => b.Status == StatusConfirmed),
                e.Capacity))
            .ToListAsync();

        return Ok(new OrganizerPublicProfile(
            organizer.Id,
            organizer.Name,
            organizer.Bio,
            organizer.Website,
            organizer.TwitterHandle,
            organizer.InstagramHandle,
            followerCount,
            organizer.CreatedAt,
            events));
    }

    // ── Private dashboard ──────────────────────────────────────────

    [Authorize]
    [HttpGet("me/dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var userId = await GetCurrentUserIdAsync();

        var events = await db.Events
            .Include(e => e.Bookings)
            .Where(e => e.CreatedById == userId)
            .ToListAsync();

        var totalAttendees = events.Sum(e => e.Bookings.Count(b => b.Status == StatusConfirmed));
        var totalRevenue   = events.Sum(e => e.Bookings.Count(b => b.Status == StatusConfirmed) * e.Price);
        var totalCheckedIn = events.Sum(e => e.Bookings.Count(b => b.IsCheckedIn));

        var now = DateTime.UtcNow;

        var upcoming = events
            .Where(e => e.EndDate >= now && e.Status != StatusCancelled)
            .OrderBy(e => e.StartDate)
            .Select(e => ToEventStats(e))
            .ToList();

        var recent = events
            .Where(e => e.EndDate < now)
            .OrderByDescending(e => e.EndDate)
            .Select(e => ToEventStats(e))
            .ToList();

        return Ok(new OrganizerDashboard(
            events.Count, totalAttendees, totalRevenue, totalCheckedIn, upcoming, recent));
    }

    // ── Update profile ─────────────────────────────────────────────

    [Authorize]
    [HttpPut("me/profile")]
    public async Task<IActionResult> UpdateProfile(UpdateOrganizerProfileRequest req)
    {
        var userId = await GetCurrentUserIdAsync();
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.Name)) user.Name = req.Name.Trim();
        user.Bio             = req.Bio;
        user.Website         = req.Website;
        user.TwitterHandle   = req.TwitterHandle;
        user.InstagramHandle = req.InstagramHandle;

        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Attendee list ──────────────────────────────────────────────

    [Authorize]
    [HttpGet("me/events/{eventId}/attendees")]
    public async Task<IActionResult> GetAttendees(int eventId)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var ev = await db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != "Admin" && role != "SuperAdmin") return Forbid();

        var attendees = await db.Bookings
            .Include(b => b.User)
            .Where(b => b.EventId == eventId)
            .OrderBy(b => b.BookedAt)
            .Select(b => new AttendeeInfo(
                b.Id,
                b.UserId,
                b.User.Name,
                b.User.Email,
                b.BookedAt,
                b.Status,
                b.IsCheckedIn,
                b.CheckedInAt,
                b.CheckInToken))
            .ToListAsync();

        return Ok(attendees);
    }

    // ── CSV export ─────────────────────────────────────────────────

    [Authorize]
    [HttpGet("me/events/{eventId}/attendees/export")]
    public async Task<IActionResult> ExportAttendees(int eventId)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var ev = await db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != "Admin" && role != "SuperAdmin") return Forbid();

        var bookings = await db.Bookings
            .Include(b => b.User)
            .Where(b => b.EventId == eventId)
            .OrderBy(b => b.BookedAt)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("BookingId,Name,Email,BookedAt,Status,CheckedIn,CheckedInAt");
        foreach (var b in bookings)
        {
            sb.AppendLine(string.Join(",",
                b.Id,
                $"\"{b.User.Name}\"",
                b.User.Email,
                b.BookedAt.ToString("o"),
                b.Status,
                b.IsCheckedIn,
                b.CheckedInAt?.ToString("o") ?? ""));
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"attendees-event-{eventId}.csv");
    }

    // ── Organizer refund ───────────────────────────────────────────

    [Authorize]
    [HttpDelete("me/events/{eventId}/bookings/{bookingId}")]
    public async Task<IActionResult> OrganizerRefund(int eventId, int bookingId)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var ev = await db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != "Admin" && role != "SuperAdmin") return Forbid();

        var booking = await db.Bookings.Include(b => b.User).FirstOrDefaultAsync(
            b => b.Id == bookingId && b.EventId == eventId);
        if (booking is null) return NotFound();
        if (booking.Status == StatusCancelled)
            return BadRequest(new { message = "Booking is already cancelled." });

        booking.Status = StatusCancelled;
        booking.User.LoyaltyPoints = Math.Max(0, booking.User.LoyaltyPoints - booking.PointsEarned);
        booking.PointsEarned = 0;

        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers ────────────────────────────────────────────────────

    private static string ComputeDisplayStatus(Models.Event e, int confirmedCount)
    {
        if (e.Status is "Draft" or StatusCancelled or "Postponed") return e.Status;
        var now = DateTime.UtcNow;
        if (e.EndDate < now)              return "Completed";
        if (e.StartDate <= now)           return "Live";
        if (confirmedCount >= e.Capacity) return "SoldOut";
        return "Published";
    }

    private static OrganizerEventStats ToEventStats(Models.Event e)
    {
        var confirmed  = e.Bookings.Count(b => b.Status == StatusConfirmed);
        var checkedIn  = e.Bookings.Count(b => b.IsCheckedIn);
        var revenue    = confirmed * e.Price;
        return new OrganizerEventStats(
            e.Id, e.Title,
            ComputeDisplayStatus(e, confirmed),
            e.StartDate, confirmed, e.Capacity, revenue, checkedIn,
            e.Location, e.Price, e.ImageUrl);
    }
}
