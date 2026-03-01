using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using EventManagement.Services;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize]
[EnableRateLimiting("booking")]
public class BookingsController(
    AppDbContext db,
    ICognitoUserResolver resolver,
    IWaitlistService waitlist,
    AppMetrics metrics)
    : AppControllerBase(resolver)
{
    private const string StatusConfirmed = "Confirmed";
    private const string StatusCancelled = "Cancelled";
    private const string StatusDraft     = "Draft";

    // ── My bookings ────────────────────────────────────────────────

    [HttpGet("mine")]
    public async Task<IActionResult> GetMyBookings()
    {
        var userId = await GetCurrentUserIdAsync();

        var bookings = await db.Bookings
            .Include(b => b.Event)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.BookedAt)
            .ToListAsync();

        // Award loyalty points for completed events — points are intentionally deferred
        // until after the event ends so a user cannot earn points, spend them in the store,
        // then cancel the booking for a refund.
        var now = DateTime.UtcNow;
        var user = await db.Users.FindAsync(userId);
        bool anyAwarded = false;
        foreach (var b in bookings)
        {
            if (b.Status == StatusConfirmed && !b.ArePointsAwarded && b.Event.EndDate < now)
            {
                user!.LoyaltyPoints += b.PointsEarned;
                b.ArePointsAwarded = true;
                anyAwarded = true;
            }
        }
        if (anyAwarded) await db.SaveChangesAsync();

        return Ok(bookings.Select(b => new BookingResponse(
            b.Id, b.EventId, b.Event.Title, b.Event.Location,
            b.Event.StartDate, b.Event.EndDate, b.Event.Price,
            b.BookedAt, b.Status, b.PointsEarned,
            b.IsCheckedIn, b.CheckedInAt, b.CheckInToken, b.Event.ImageUrl)));
    }

    // ── Book ───────────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> Create(CreateBookingRequest req)
    {
        var userId = await GetCurrentUserIdAsync();

        var ev = await db.Events
            .Include(e => e.Bookings)
            .FirstOrDefaultAsync(e => e.Id == req.EventId);

        if (ev is null) { metrics.BookingFailed(req.EventId, userId, "EventNotFound"); return NotFound(new { message = "Event not found." }); }
        if (ev.IsSuspended)
            { metrics.BookingFailed(ev.Id, userId, "EventSuspended"); return BadRequest(new { message = "This event is currently unavailable." }); }
        if (ev.Status == StatusDraft)
            { metrics.BookingFailed(ev.Id, userId, "EventDraft"); return BadRequest(new { message = "Cannot book a draft event." }); }
        if (ev.Status == StatusCancelled)
            { metrics.BookingFailed(ev.Id, userId, "EventCancelled"); return BadRequest(new { message = "Event has been cancelled." }); }
        if (ev.StartDate <= DateTime.UtcNow)
            { metrics.BookingFailed(ev.Id, userId, "SalesEnded"); return BadRequest(new { message = "Ticket sales are closed — this event has already started." }); }

        var confirmedCount = ev.Bookings.Count(b => b.Status == StatusConfirmed);
        if (confirmedCount >= ev.Capacity)
            { metrics.BookingFailed(ev.Id, userId, "EventFullyBooked"); return BadRequest(new { message = "Event is fully booked." }); }

        var user = await db.Users.FindAsync(userId);
        if (user!.IsSuspended)
            return Forbid();

        var discountedPrice = ev.Price * (1 - user.LoyaltyDiscount);
        var pointsEarned = (int)(discountedPrice * 10);

        // A confirmed booking already exists — block duplicate
        var existingConfirmed = await db.Bookings
            .AnyAsync(b => b.UserId == userId && b.EventId == req.EventId && b.Status == StatusConfirmed);
        if (existingConfirmed)
            return Conflict(new { message = "You already have a booking for this event." });

        // Cancelled bookings are final. A re-book creates a fresh record so
        // the history of each booking remains distinct and unambiguous.
        var booking = new Booking
        {
            UserId       = userId,
            EventId      = req.EventId,
            PointsEarned = pointsEarned,
            CheckInToken = Guid.NewGuid().ToString()
            // ArePointsAwarded stays false — points credited after event completes
        };

        // Points are NOT awarded at booking time. They are credited lazily in
        // GetMyBookings once the event's EndDate has passed, preventing the
        // earn-spend-cancel refund loop.
        db.Bookings.Add(booking);

        db.Notifications.Add(new Notification
        {
            UserId  = userId,
            Type    = "BookingConfirmation",
            Title   = "Booking confirmed!",
            Message = $"You're going to \"{ev.Title}\" on {ev.StartDate:MMM d, yyyy}. You'll earn {pointsEarned} loyalty points once the event concludes.",
            EventId = ev.Id,
        });

        await db.SaveChangesAsync();
        metrics.BookingCreated(ev.Id, userId, ev.Price);
        return CreatedAtAction(nameof(GetMyBookings), ToResponse(booking, ev));
    }

    // ── Cancel single booking ──────────────────────────────────────

    /// <summary>
    /// Cancels a booking. Enforces the 7-day rule: cannot cancel within 7 days
    /// of the event unless the event itself has been cancelled.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Cancel(int id)
    {
        var userId = await GetCurrentUserIdAsync();

        var booking = await db.Bookings.Include(b => b.Event).FirstOrDefaultAsync(b => b.Id == id);
        if (booking is null) return NotFound();
        if (booking.UserId != userId) return Forbid();
        if (booking.Status == StatusCancelled)
            return BadRequest(new { message = "Booking is already cancelled." });

        // 7-day rule — waived if the event itself was cancelled
        if (booking.Event.Status != StatusCancelled &&
            booking.Event.StartDate <= DateTime.UtcNow.AddDays(7))
            return BadRequest(new { message = "Bookings can only be cancelled more than 7 days before the event." });

        booking.Status = StatusCancelled;

        // Only claw back points if they were already credited (i.e. the event had completed
        // and GetMyBookings had awarded them). If the event hasn't finished yet, points were
        // never credited, so there is nothing to deduct.
        var user = await db.Users.FindAsync(userId);
        if (booking.ArePointsAwarded)
        {
            user!.LoyaltyPoints = Math.Max(0, user.LoyaltyPoints - booking.PointsEarned);
            booking.PointsEarned = 0;
            booking.ArePointsAwarded = false;
        }

        await db.SaveChangesAsync();
        await waitlist.PromoteNextAsync(booking.EventId);
        return NoContent();
    }

    // ── Mass-cancel all my bookings for one event ──────────────────

    [HttpDelete("events/{eventId}/mine")]
    public async Task<IActionResult> CancelAllForEvent(int eventId)
    {
        var userId = await GetCurrentUserIdAsync();

        var bookings = await db.Bookings
            .Include(b => b.Event)
            .Where(b => b.UserId == userId && b.EventId == eventId && b.Status == StatusConfirmed)
            .ToListAsync();

        if (bookings.Count == 0)
            return NotFound(new { message = "No active bookings found for this event." });

        var firstBooking = bookings[0];

        // Apply 7-day rule unless the event is cancelled
        if (firstBooking.Event.Status != StatusCancelled &&
            firstBooking.Event.StartDate <= DateTime.UtcNow.AddDays(7))
            return BadRequest(new { message = "Bookings can only be cancelled more than 7 days before the event." });

        var user = await db.Users.FindAsync(userId);
        foreach (var b in bookings)
        {
            b.Status = StatusCancelled;
            if (b.ArePointsAwarded)
            {
                user!.LoyaltyPoints = Math.Max(0, user.LoyaltyPoints - b.PointsEarned);
                b.PointsEarned = 0;
                b.ArePointsAwarded = false;
            }
        }

        await db.SaveChangesAsync();
        await waitlist.PromoteNextAsync(eventId);
        return NoContent();
    }

    // ── Calendar export (.ics) ─────────────────────────────────────

    [HttpGet("{id}/ics")]
    public async Task<IActionResult> DownloadIcs(int id)
    {
        var userId = await GetCurrentUserIdAsync();

        var booking = await db.Bookings
            .Include(b => b.Event)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking is null) return NotFound();
        if (booking.UserId != userId) return Forbid();
        if (booking.Status == StatusCancelled)
            return BadRequest(new { message = "Booking is cancelled." });

        var ev    = booking.Event;
        var uid   = $"booking-{booking.Id}@eventhub";
        var start = ev.StartDate.ToString("yyyyMMddTHHmmssZ");
        var end   = ev.EndDate.ToString("yyyyMMddTHHmmssZ");
        var now   = DateTime.UtcNow.ToString("yyyyMMddTHHmmssZ");
        var desc  = ev.Description.Replace("\r", "").Replace("\n", "\\n");

        var ics = $"BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//EventHub//EventHub//EN\r\nBEGIN:VEVENT\r\nUID:{uid}\r\nDTSTAMP:{now}\r\nDTSTART:{start}\r\nDTEND:{end}\r\nSUMMARY:{ev.Title}\r\nLOCATION:{ev.Location}\r\nDESCRIPTION:{desc}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        var bytes = System.Text.Encoding.UTF8.GetBytes(ics);
        return File(bytes, "text/calendar", $"event-{ev.Id}.ics");
    }

    // ── Check-in by booking ID ──────────────────────────────────────

    [HttpPost("{id}/checkin")]
    public async Task<IActionResult> CheckIn(int id)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var booking = await db.Bookings.Include(b => b.Event).FirstOrDefaultAsync(b => b.Id == id);
        if (booking is null) return NotFound();

        if (booking.Event.CreatedById != userId && role != "Admin" && role != "SuperAdmin")
            return Forbid();

        if (booking.Status == StatusCancelled)
            return BadRequest(new { message = "Cannot check in a cancelled booking." });
        if (booking.IsCheckedIn)
            return BadRequest(new { message = "Already checked in." });

        booking.IsCheckedIn = true;
        booking.CheckedInAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Check-in via QR token ──────────────────────────────────────

    [HttpGet("checkin/{token}")]
    public async Task<IActionResult> GetCheckinInfo(string token)
    {
        var booking = await db.Bookings
            .Include(b => b.User)
            .Include(b => b.Event)
            .FirstOrDefaultAsync(b => b.CheckInToken == token);

        if (booking is null) return NotFound();

        return Ok(new CheckInInfo(
            booking.Id, booking.UserId, booking.User.Name,
            booking.Event.Title, booking.IsCheckedIn, booking.CheckedInAt));
    }

    [HttpPost("checkin/{token}")]
    public async Task<IActionResult> CheckInViaToken(string token)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var booking = await db.Bookings
            .Include(b => b.Event)
            .FirstOrDefaultAsync(b => b.CheckInToken == token);

        if (booking is null) return NotFound();

        if (booking.Event.CreatedById != userId && role != "Admin" && role != "SuperAdmin")
            return Forbid();

        if (booking.Status == StatusCancelled)
            return BadRequest(new { message = "Cannot check in a cancelled booking." });
        if (booking.IsCheckedIn)
            return BadRequest(new { message = "Already checked in." });

        booking.IsCheckedIn = true;
        booking.CheckedInAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helper ─────────────────────────────────────────────────────

    private static BookingResponse ToResponse(Booking b, Event ev) => new(
        b.Id, ev.Id, ev.Title, ev.Location, ev.StartDate, ev.EndDate,
        ev.Price, b.BookedAt, b.Status, b.PointsEarned,
        b.IsCheckedIn, b.CheckedInAt, b.CheckInToken, ev.ImageUrl);
}
