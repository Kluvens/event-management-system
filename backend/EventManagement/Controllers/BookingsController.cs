using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EventManagement.Services;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize]
public class BookingsController(AppDbContext db, ICognitoUserResolver resolver)
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
            .Select(b => new BookingResponse(
                b.Id, b.EventId, b.Event.Title, b.Event.Location,
                b.Event.StartDate, b.Event.EndDate, b.Event.Price,
                b.BookedAt, b.Status, b.PointsEarned,
                b.IsCheckedIn, b.CheckedInAt, b.CheckInToken))
            .ToListAsync();

        return Ok(bookings);
    }

    // ── Book ───────────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> Create(CreateBookingRequest req)
    {
        var userId = await GetCurrentUserIdAsync();

        var ev = await db.Events
            .Include(e => e.Bookings)
            .FirstOrDefaultAsync(e => e.Id == req.EventId);

        if (ev is null) return NotFound(new { message = "Event not found." });
        if (ev.IsSuspended)
            return BadRequest(new { message = "This event is currently unavailable." });
        if (ev.Status == StatusDraft)
            return BadRequest(new { message = "Cannot book a draft event." });
        if (ev.Status == StatusCancelled)
            return BadRequest(new { message = "Event has been cancelled." });

        var confirmedCount = ev.Bookings.Count(b => b.Status == StatusConfirmed);
        if (confirmedCount >= ev.Capacity)
            return BadRequest(new { message = "Event is fully booked." });

        var user = await db.Users.FindAsync(userId);
        if (user!.IsSuspended)
            return Forbid();

        var discountedPrice = ev.Price * (1 - user.LoyaltyDiscount);
        var pointsEarned = (int)(discountedPrice * 10);

        var existing = await db.Bookings
            .FirstOrDefaultAsync(b => b.UserId == userId && b.EventId == req.EventId);

        if (existing is not null)
        {
            if (existing.Status == StatusConfirmed)
                return Conflict(new { message = "You already have a booking for this event." });

            // Re-activate a cancelled booking
            existing.Status       = StatusConfirmed;
            existing.BookedAt     = DateTime.UtcNow;
            existing.PointsEarned = pointsEarned;
            existing.CheckInToken ??= Guid.NewGuid().ToString();
            user.LoyaltyPoints += pointsEarned;
            await db.SaveChangesAsync();

            return Ok(ToResponse(existing, ev));
        }

        var booking = new Booking
        {
            UserId       = userId,
            EventId      = req.EventId,
            PointsEarned = pointsEarned,
            CheckInToken = Guid.NewGuid().ToString()
        };

        user.LoyaltyPoints += pointsEarned;
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

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

        // Deduct loyalty points earned from this booking
        var user = await db.Users.FindAsync(userId);
        user!.LoyaltyPoints = Math.Max(0, user.LoyaltyPoints - booking.PointsEarned);
        booking.PointsEarned = 0;

        await db.SaveChangesAsync();
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
            user!.LoyaltyPoints = Math.Max(0, user.LoyaltyPoints - b.PointsEarned);
            b.PointsEarned = 0;
        }

        await db.SaveChangesAsync();
        return NoContent();
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
        b.IsCheckedIn, b.CheckedInAt, b.CheckInToken);
}
