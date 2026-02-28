using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Models;
using EventManagement.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/payouts")]
[Authorize]
[EnableRateLimiting("api")]
public class PayoutsController(AppDbContext db, ICognitoUserResolver resolver)
    : AppControllerBase(resolver)
{
    // ── Organiser: list my payout requests ────────────────────────

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        var userId = await GetCurrentUserIdAsync();

        var payouts = await db.PayoutRequests
            .Where(p => p.OrganizerId == userId)
            .OrderByDescending(p => p.RequestedAt)
            .Select(p => new PayoutRequestResponse(
                p.Id, p.Amount, p.BankDetails, p.Status,
                p.AdminNotes, p.RequestedAt, p.ProcessedAt))
            .ToListAsync();

        return Ok(payouts);
    }

    // ── Organiser: submit a payout request ────────────────────────

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePayoutRequestRequest req)
    {
        if (req.Amount <= 0)
            return BadRequest("Amount must be greater than zero.");

        if (string.IsNullOrWhiteSpace(req.BankDetails))
            return BadRequest("Bank details are required.");

        var userId = await GetCurrentUserIdAsync();

        // Prevent duplicate pending requests
        var hasPending = await db.PayoutRequests
            .AnyAsync(p => p.OrganizerId == userId && p.Status == "Pending");

        if (hasPending)
            return Conflict("You already have a pending payout request.");

        var payout = new PayoutRequest
        {
            OrganizerId = userId,
            Amount      = req.Amount,
            BankDetails = req.BankDetails,
        };

        db.PayoutRequests.Add(payout);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMine), new PayoutRequestResponse(
            payout.Id, payout.Amount, payout.BankDetails, payout.Status,
            payout.AdminNotes, payout.RequestedAt, payout.ProcessedAt));
    }

    // ── Admin: list all payout requests ───────────────────────────

    [HttpGet]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {
        var query = db.PayoutRequests
            .Include(p => p.Organizer)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status);

        var payouts = await query
            .OrderByDescending(p => p.RequestedAt)
            .Select(p => new AdminPayoutResponse(
                p.Id, p.OrganizerId, p.Organizer.Name,
                p.Amount, p.BankDetails, p.Status,
                p.AdminNotes, p.RequestedAt, p.ProcessedAt))
            .ToListAsync();

        return Ok(payouts);
    }

    // ── Admin: approve or reject ───────────────────────────────────

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Process(int id, [FromBody] ProcessPayoutRequest req)
    {
        if (req.Status is not ("Approved" or "Rejected"))
            return BadRequest("Status must be 'Approved' or 'Rejected'.");

        var payout = await db.PayoutRequests.FindAsync(id);
        if (payout is null) return NotFound();
        if (payout.Status != "Pending")
            return Conflict("Only pending requests can be processed.");

        payout.Status      = req.Status;
        payout.AdminNotes  = req.AdminNotes;
        payout.ProcessedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }
}
