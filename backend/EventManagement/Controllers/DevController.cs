using EventManagement.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

/// <summary>
/// Development-only endpoints for resetting test data.
/// All routes return 404 when ASPNETCORE_ENVIRONMENT != Development.
/// </summary>
[ApiController]
[Route("api/dev")]
public class DevController(AppDbContext db, IWebHostEnvironment env) : ControllerBase
{
    // ── Reset all user-generated data ──────────────────────────────

    /// <summary>
    /// Deletes every row from every user-generated table.
    /// Seeds and categories/tags are preserved.
    /// </summary>
    [Authorize(Roles = "Admin,SuperAdmin")]
    [HttpDelete("reset")]
    public async Task<IActionResult> Reset()
    {
        if (!env.IsDevelopment())
            return NotFound();

        await db.ReviewVotes.ExecuteDeleteAsync();
        await db.ReviewReplies.ExecuteDeleteAsync();
        await db.Reviews.ExecuteDeleteAsync();
        await db.Announcements.ExecuteDeleteAsync();
        await db.HostSubscriptions.ExecuteDeleteAsync();
        await db.EventTags.ExecuteDeleteAsync();
        await db.Bookings.ExecuteDeleteAsync();
        await db.Events.ExecuteDeleteAsync();
        await db.Users.ExecuteDeleteAsync();

        return Ok(new { message = "All data reset. Seeded categories and tags are intact." });
    }

    // ── Reset only bookings & reviews for one event ────────────────

    [Authorize(Roles = "Admin,SuperAdmin")]
    [HttpDelete("events/{eventId}")]
    public async Task<IActionResult> ResetEvent(int eventId)
    {
        if (!env.IsDevelopment())
            return NotFound();

        if (!await db.Events.AnyAsync(e => e.Id == eventId))
            return NotFound(new { message = "Event not found." });

        var reviewIds = await db.Reviews
            .Where(r => r.EventId == eventId)
            .Select(r => r.Id)
            .ToListAsync();

        await db.ReviewVotes.Where(v => reviewIds.Contains(v.ReviewId)).ExecuteDeleteAsync();
        await db.ReviewReplies.Where(r => reviewIds.Contains(r.ReviewId)).ExecuteDeleteAsync();
        await db.Reviews.Where(r => r.EventId == eventId).ExecuteDeleteAsync();
        await db.Announcements.Where(a => a.EventId == eventId).ExecuteDeleteAsync();
        await db.Bookings.Where(b => b.EventId == eventId).ExecuteDeleteAsync();

        return Ok(new { message = $"All bookings, reviews, and announcements for event {eventId} deleted." });
    }

    // ── Seed sample data ───────────────────────────────────────────

    /// <summary>
    /// Creates two users (host + attendee), two events, and one booking
    /// so you can immediately test all flows.
    /// </summary>
    [Authorize(Roles = "Admin,SuperAdmin")]
    [HttpPost("seed")]
    public async Task<IActionResult> Seed()
    {
        if (!env.IsDevelopment())
            return NotFound();

        if (await db.Users.AnyAsync())
            return Conflict(new { message = "Data already exists. Call DELETE /api/dev/reset first." });

        // Users
        var host = new EventManagement.Models.User
        {
            Name         = "Alice Host",
            Email        = "host@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password1!"),
            Role         = "Attendee"
        };
        var attendee = new EventManagement.Models.User
        {
            Name         = "Bob Attendee",
            Email        = "attendee@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password1!")
        };

        db.Users.AddRange(host, attendee);
        await db.SaveChangesAsync();

        // Events
        var upcoming = new EventManagement.Models.Event
        {
            Title       = "Tech Conference 2026",
            Description = "A full-day conference on modern software engineering.",
            Location    = "Sydney Convention Centre",
            StartDate   = DateTime.UtcNow.AddDays(30),
            EndDate     = DateTime.UtcNow.AddDays(30).AddHours(8),
            Capacity    = 200,
            Price       = 49.99m,
            IsPublic    = true,
            CategoryId  = 1,   // Conference
            CreatedById = host.Id
        };
        var past = new EventManagement.Models.Event
        {
            Title       = "Networking Mixer",
            Description = "Monthly networking event for professionals.",
            Location    = "CBD Rooftop Bar, Sydney",
            StartDate   = DateTime.UtcNow.AddDays(-10),
            EndDate     = DateTime.UtcNow.AddDays(-10).AddHours(3),
            Capacity    = 50,
            Price       = 0m,
            IsPublic    = true,
            CategoryId  = 5,   // Networking
            CreatedById = host.Id
        };

        db.Events.AddRange(upcoming, past);
        await db.SaveChangesAsync();

        // Tags for upcoming event
        db.EventTags.AddRange(
            new EventManagement.Models.EventTag { EventId = upcoming.Id, TagId = 2 },  // Technology
            new EventManagement.Models.EventTag { EventId = upcoming.Id, TagId = 7 }   // Education
        );

        // A booking for the past event (so Bob can leave a review)
        var booking = new EventManagement.Models.Booking
        {
            UserId   = attendee.Id,
            EventId  = past.Id,
            Status   = "Confirmed",
            PointsEarned = 0
        };
        db.Bookings.Add(booking);

        await db.SaveChangesAsync();

        return Ok(new
        {
            message  = "Sample data created.",
            host     = new { host.Id, host.Email,     password = "Password1!" },
            attendee = new { attendee.Id, attendee.Email, password = "Password1!" },
            upcomingEventId = upcoming.Id,
            pastEventId     = past.Id
        });
    }
}
