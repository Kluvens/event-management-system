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
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] int? categoryId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var query = db.Events
            .Include(e => e.CreatedBy)
            .Include(e => e.Category)
            .Include(e => e.Bookings)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(e =>
                e.Title.Contains(search) ||
                e.Description.Contains(search) ||
                e.Location.Contains(search));

        if (categoryId.HasValue)
            query = query.Where(e => e.CategoryId == categoryId.Value);

        if (from.HasValue)
            query = query.Where(e => e.StartDate >= from.Value);

        if (to.HasValue)
            query = query.Where(e => e.StartDate <= to.Value);

        var events = await query
            .OrderBy(e => e.StartDate)
            .Select(e => new EventResponse(
                e.Id,
                e.Title,
                e.Description,
                e.Location,
                e.StartDate,
                e.EndDate,
                e.Capacity,
                e.Bookings.Count(b => b.Status == "Confirmed"),
                e.CreatedAt,
                e.CreatedById,
                e.CreatedBy.Name,
                e.CategoryId,
                e.Category.Name))
            .ToListAsync();

        return Ok(events);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var e = await db.Events
            .Include(e => e.CreatedBy)
            .Include(e => e.Category)
            .Include(e => e.Bookings)
            .Where(e => e.Id == id)
            .Select(e => new EventResponse(
                e.Id,
                e.Title,
                e.Description,
                e.Location,
                e.StartDate,
                e.EndDate,
                e.Capacity,
                e.Bookings.Count(b => b.Status == "Confirmed"),
                e.CreatedAt,
                e.CreatedById,
                e.CreatedBy.Name,
                e.CategoryId,
                e.Category.Name))
            .FirstOrDefaultAsync();

        if (e is null) return NotFound();
        return Ok(e);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create(CreateEventRequest req)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var ev = new Event
        {
            Title = req.Title,
            Description = req.Description,
            Location = req.Location,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            Capacity = req.Capacity,
            CategoryId = req.CategoryId,
            CreatedById = userId
        };

        db.Events.Add(ev);
        await db.SaveChangesAsync();

        await db.Entry(ev).Reference(e => e.CreatedBy).LoadAsync();
        await db.Entry(ev).Reference(e => e.Category).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = ev.Id }, new EventResponse(
            ev.Id, ev.Title, ev.Description, ev.Location,
            ev.StartDate, ev.EndDate, ev.Capacity, 0,
            ev.CreatedAt, ev.CreatedById, ev.CreatedBy.Name,
            ev.CategoryId, ev.Category.Name));
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateEventRequest req)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = User.FindFirstValue(ClaimTypes.Role);

        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != "Admin") return Forbid();

        ev.Title = req.Title;
        ev.Description = req.Description;
        ev.Location = req.Location;
        ev.StartDate = req.StartDate;
        ev.EndDate = req.EndDate;
        ev.Capacity = req.Capacity;
        ev.CategoryId = req.CategoryId;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = User.FindFirstValue(ClaimTypes.Role);

        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != "Admin") return Forbid();

        db.Events.Remove(ev);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
