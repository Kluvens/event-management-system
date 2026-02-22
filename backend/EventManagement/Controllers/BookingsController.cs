using System.Security.Claims;
using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize]
public class BookingsController(AppDbContext db) : ControllerBase
{
    [HttpGet("mine")]
    public async Task<IActionResult> GetMyBookings()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var bookings = await db.Bookings
            .Include(b => b.Event)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.BookedAt)
            .Select(b => new BookingResponse(
                b.Id,
                b.EventId,
                b.Event.Title,
                b.Event.Location,
                b.Event.StartDate,
                b.BookedAt,
                b.Status))
            .ToListAsync();

        return Ok(bookings);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateBookingRequest req)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var ev = await db.Events
            .Include(e => e.Bookings)
            .FirstOrDefaultAsync(e => e.Id == req.EventId);

        if (ev is null) return NotFound(new { message = "Event not found." });

        var confirmedCount = ev.Bookings.Count(b => b.Status == "Confirmed");
        if (confirmedCount >= ev.Capacity)
            return BadRequest(new { message = "Event is fully booked." });

        var existing = await db.Bookings
            .FirstOrDefaultAsync(b => b.UserId == userId && b.EventId == req.EventId);

        if (existing is not null)
        {
            if (existing.Status == "Confirmed")
                return Conflict(new { message = "You already have a booking for this event." });

            // Re-activate a cancelled booking
            existing.Status = "Confirmed";
            existing.BookedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Ok(new BookingResponse(
                existing.Id, ev.Id, ev.Title, ev.Location, ev.StartDate, existing.BookedAt, existing.Status));
        }

        var booking = new Booking
        {
            UserId = userId,
            EventId = req.EventId
        };

        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMyBookings), new BookingResponse(
            booking.Id, ev.Id, ev.Title, ev.Location, ev.StartDate, booking.BookedAt, booking.Status));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Cancel(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var booking = await db.Bookings.FindAsync(id);
        if (booking is null) return NotFound();
        if (booking.UserId != userId) return Forbid();

        booking.Status = "Cancelled";
        await db.SaveChangesAsync();
        return NoContent();
    }
}
