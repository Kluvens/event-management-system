using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Models;
using EventManagement.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController(AppDbContext db, AuthService auth, IConfiguration config) : ControllerBase
{
    private const string RoleSuperAdmin = "SuperAdmin";
    private const string StatusConfirmed = "Confirmed";

    // ── Registration ───────────────────────────────────────────────

    /// <summary>
    /// Register a new SuperAdmin. Requires the admin registration key configured in appsettings.
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register(AdminRegisterRequest req)
    {
        var configuredKey = config["AdminSettings:RegistrationKey"]!;
        var result = await auth.RegisterSuperAdminAsync(req, configuredKey);

        if (result is null)
        {
            // Distinguish wrong key from duplicate email
            if (req.RegistrationKey != configuredKey)
                return Unauthorized(new { message = "Invalid registration key." });
            return Conflict(new { message = "Email already in use." });
        }

        return Ok(result);
    }

    // ── Users ──────────────────────────────────────────────────────

    /// <summary>
    /// List all users. Optional filters: search (name/email), role, isSuspended.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search,
        [FromQuery] string? role,
        [FromQuery] bool? isSuspended)
    {
        var query = db.Users
            .Include(u => u.CreatedEvents)
            .Include(u => u.Bookings)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u => u.Name.Contains(search) || u.Email.Contains(search));

        if (!string.IsNullOrWhiteSpace(role))
            query = query.Where(u => u.Role == role);

        if (isSuspended.HasValue)
            query = query.Where(u => u.IsSuspended == isSuspended.Value);

        var users = await query
            .OrderBy(u => u.CreatedAt)
            .Select(u => new AdminUserListItem(
                u.Id, u.Name, u.Email, u.Role, u.IsSuspended,
                u.LoyaltyPoints, u.LoyaltyTier, u.CreatedAt,
                u.CreatedEvents.Count,
                u.Bookings.Count(b => b.Status == StatusConfirmed)))
            .ToListAsync();

        return Ok(users);
    }

    /// <summary>
    /// Get detailed profile for a single user including recent activity.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpGet("users/{id:int}")]
    public async Task<IActionResult> GetUser(int id)
    {
        var user = await db.Users
            .Include(u => u.CreatedEvents)
            .Include(u => u.Bookings).ThenInclude(b => b.Event)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null) return NotFound();

        var recentBookings = user.Bookings
            .OrderByDescending(b => b.BookedAt)
            .Take(10)
            .Select(b => new AdminUserBooking(b.Id, b.EventId, b.Event.Title, b.Status, b.BookedAt))
            .ToList();

        var recentEvents = user.CreatedEvents
            .OrderByDescending(e => e.CreatedAt)
            .Take(10)
            .Select(e => new AdminUserEvent(
                e.Id, e.Title, e.Status, e.StartDate,
                e.Bookings.Count(b => b.Status == StatusConfirmed)))
            .ToList();

        return Ok(new AdminUserDetail(
            user.Id, user.Name, user.Email, user.Role, user.IsSuspended,
            user.LoyaltyPoints, user.LoyaltyTier, user.CreatedAt,
            user.CreatedEvents.Count,
            user.Bookings.Count(b => b.Status == StatusConfirmed),
            recentBookings, recentEvents));
    }

    /// <summary>
    /// Suspend a user. Suspended users cannot log in.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpPost("users/{id:int}/suspend")]
    public async Task<IActionResult> SuspendUser(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();
        if (user.Role == RoleSuperAdmin)
            return BadRequest(new { message = "Cannot suspend another SuperAdmin." });

        user.IsSuspended = true;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Unsuspend a user, restoring their ability to log in.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpPost("users/{id:int}/unsuspend")]
    public async Task<IActionResult> UnsuspendUser(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();

        user.IsSuspended = false;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Change a user's role. Valid roles: "Attendee", "Admin".
    /// SuperAdmins cannot be demoted via this endpoint.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpPut("users/{id:int}/role")]
    public async Task<IActionResult> ChangeRole(int id, ChangeRoleRequest req)
    {
        if (req.Role != "Attendee" && req.Role != "Admin")
            return BadRequest(new { message = "Role must be 'Attendee' or 'Admin'." });

        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();
        if (user.Role == RoleSuperAdmin)
            return BadRequest(new { message = "Cannot change the role of a SuperAdmin." });

        user.Role = req.Role;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Adjust a user's loyalty points by a delta (positive to add, negative to deduct).
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpPost("users/{id:int}/adjust-points")]
    public async Task<IActionResult> AdjustPoints(int id, AdjustPointsRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();

        user.LoyaltyPoints = Math.Max(0, user.LoyaltyPoints + req.Delta);
        await db.SaveChangesAsync();
        return Ok(new { userId = user.Id, loyaltyPoints = user.LoyaltyPoints, loyaltyTier = user.LoyaltyTier });
    }

    // ── Events ─────────────────────────────────────────────────────

    /// <summary>
    /// List ALL events regardless of visibility, status, or suspension.
    /// Optional filters: search, isSuspended, status.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpGet("events")]
    public async Task<IActionResult> GetEvents(
        [FromQuery] string? search,
        [FromQuery] bool? isSuspended,
        [FromQuery] string? status)
    {
        var query = db.Events
            .Include(e => e.CreatedBy)
            .Include(e => e.Category)
            .Include(e => e.Bookings)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(e => e.Title.Contains(search) || e.Description.Contains(search));

        if (isSuspended.HasValue)
            query = query.Where(e => e.IsSuspended == isSuspended.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(e => e.Status == status);

        var events = await query
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new AdminEventListItem(
                e.Id, e.Title, e.Status, e.IsSuspended, e.IsPublic,
                e.CreatedById, e.CreatedBy.Name, e.Category.Name,
                e.StartDate, e.EndDate, e.Capacity,
                e.Bookings.Count(b => b.Status == StatusConfirmed),
                e.Price, e.CreatedAt))
            .ToListAsync();

        return Ok(events);
    }

    /// <summary>
    /// Suspend an event. Suspended events are hidden from all public listings and cannot be booked.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpPost("events/{id:int}/suspend")]
    public async Task<IActionResult> SuspendEvent(int id)
    {
        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();

        ev.IsSuspended = true;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Unsuspend an event, making it visible and bookable again.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpPost("events/{id:int}/unsuspend")]
    public async Task<IActionResult> UnsuspendEvent(int id)
    {
        var ev = await db.Events.FindAsync(id);
        if (ev is null) return NotFound();

        ev.IsSuspended = false;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Bookings ───────────────────────────────────────────────────

    /// <summary>
    /// List all bookings system-wide. Optional filters: userId, eventId, status.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpGet("bookings")]
    public async Task<IActionResult> GetBookings(
        [FromQuery] int? userId,
        [FromQuery] int? eventId,
        [FromQuery] string? status)
    {
        var query = db.Bookings
            .Include(b => b.User)
            .Include(b => b.Event)
            .AsQueryable();

        if (userId.HasValue)
            query = query.Where(b => b.UserId == userId.Value);

        if (eventId.HasValue)
            query = query.Where(b => b.EventId == eventId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(b => b.Status == status);

        var bookings = await query
            .OrderByDescending(b => b.BookedAt)
            .Select(b => new AdminBookingItem(
                b.Id, b.UserId, b.User.Name,
                b.EventId, b.Event.Title,
                b.Status, b.BookedAt, b.PointsEarned, b.Event.Price))
            .ToListAsync();

        return Ok(bookings);
    }

    // ── Categories ─────────────────────────────────────────────────

    /// <summary>
    /// Create a new event category.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory(CreateCategoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Category name is required." });

        if (await db.Categories.AnyAsync(c => c.Name == req.Name))
            return Conflict(new { message = "A category with that name already exists." });

        var category = new Category { Name = req.Name };
        db.Categories.Add(category);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(CreateCategory), new { id = category.Id },
            new { id = category.Id, name = category.Name });
    }

    /// <summary>
    /// Update a category's name.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpPut("categories/{id:int}")]
    public async Task<IActionResult> UpdateCategory(int id, UpdateCategoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Category name is required." });

        var category = await db.Categories.FindAsync(id);
        if (category is null) return NotFound();

        if (await db.Categories.AnyAsync(c => c.Name == req.Name && c.Id != id))
            return Conflict(new { message = "A category with that name already exists." });

        category.Name = req.Name;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Delete a category. Blocked if any events currently use it.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpDelete("categories/{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var category = await db.Categories.FindAsync(id);
        if (category is null) return NotFound();

        if (await db.Events.AnyAsync(e => e.CategoryId == id))
            return Conflict(new { message = "Cannot delete a category that has associated events." });

        db.Categories.Remove(category);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Tags ───────────────────────────────────────────────────────

    /// <summary>
    /// Create a new tag.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpPost("tags")]
    public async Task<IActionResult> CreateTag(CreateTagRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Tag name is required." });

        if (await db.Tags.AnyAsync(t => t.Name == req.Name))
            return Conflict(new { message = "A tag with that name already exists." });

        var tag = new Tag { Name = req.Name };
        db.Tags.Add(tag);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(CreateTag), new { id = tag.Id },
            new { id = tag.Id, name = tag.Name });
    }

    /// <summary>
    /// Delete a tag. Also removes all event-tag associations.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpDelete("tags/{id:int}")]
    public async Task<IActionResult> DeleteTag(int id)
    {
        var tag = await db.Tags.FindAsync(id);
        if (tag is null) return NotFound();

        // Remove all event associations first
        var eventTags = await db.EventTags.Where(et => et.TagId == id).ToListAsync();
        db.EventTags.RemoveRange(eventTags);
        db.Tags.Remove(tag);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Stats ──────────────────────────────────────────────────────

    /// <summary>
    /// System-wide statistics dashboard.
    /// </summary>
    [Authorize(Roles = RoleSuperAdmin)]
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalUsers     = await db.Users.CountAsync();
        var activeUsers    = await db.Users.CountAsync(u => !u.IsSuspended);
        var suspendedUsers = await db.Users.CountAsync(u => u.IsSuspended);

        var totalEvents     = await db.Events.CountAsync();
        var activeEvents    = await db.Events.CountAsync(e => !e.IsSuspended && e.Status == "Active");
        var suspendedEvents = await db.Events.CountAsync(e => e.IsSuspended);

        var totalBookings     = await db.Bookings.CountAsync();
        var confirmedBookings = await db.Bookings.CountAsync(b => b.Status == StatusConfirmed);
        var totalRevenue      = await db.Bookings
            .Where(b => b.Status == StatusConfirmed)
            .SumAsync(b => b.Event.Price);

        return Ok(new AdminStatsResponse(
            totalUsers, activeUsers, suspendedUsers,
            totalEvents, activeEvents, suspendedEvents,
            totalBookings, confirmedBookings, totalRevenue));
    }
}
