using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EventManagement.Services;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/events/{eventId}/reviews")]
public class ReviewsController(AppDbContext db, ICognitoUserResolver resolver)
    : AppControllerBase(resolver)
{
    private const string StatusConfirmed = "Confirmed";

    // ── List reviews for an event ──────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll(int eventId, [FromQuery] string? sort)
    {
        if (!await db.Events.AnyAsync(e => e.Id == eventId)) return NotFound();

        var reviews = await db.Reviews
            .Include(r => r.User)
            .Include(r => r.Replies).ThenInclude(rp => rp.User)
            .Include(r => r.Votes)
            .Where(r => r.EventId == eventId)
            .ToListAsync();

        // Pinned review always first, then apply sort
        IEnumerable<Review> ordered = sort?.ToLower() switch
        {
            "highest"  => reviews.OrderByDescending(r => r.IsPinned).ThenByDescending(r => r.Rating),
            "lowest"   => reviews.OrderByDescending(r => r.IsPinned).ThenBy(r => r.Rating),
            _          => reviews.OrderByDescending(r => r.IsPinned).ThenByDescending(r => r.CreatedAt)
        };

        return Ok(ordered.Select(ToResponse));
    }

    // ── Create a review ────────────────────────────────────────────

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create(int eventId, CreateReviewRequest req)
    {
        if (req.Rating is < 1 or > 5)
            return BadRequest(new { message = "Rating must be between 1 and 5." });

        var userId = await GetCurrentUserIdAsync();
        var ev = await db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();

        // Must have attended (confirmed booking) and event must have started
        var hasAttended = await db.Bookings.AnyAsync(b =>
            b.UserId == userId && b.EventId == eventId && b.Status == StatusConfirmed);
        if (!hasAttended)
            return BadRequest(new { message = "You must have a confirmed booking to review this event." });

        if (ev.EndDate > DateTime.UtcNow)
            return BadRequest(new { message = "You can only review a completed event." });

        if (await db.Reviews.AnyAsync(r => r.EventId == eventId && r.UserId == userId))
            return Conflict(new { message = "You have already reviewed this event." });

        var review = new Review
        {
            EventId = eventId,
            UserId  = userId,
            Rating  = req.Rating,
            Comment = req.Comment
        };

        db.Reviews.Add(review);
        await db.SaveChangesAsync();

        await db.Entry(review).Reference(r => r.User).LoadAsync();
        return CreatedAtAction(nameof(GetAll), new { eventId }, ToResponse(review));
    }

    // ── Delete own review ──────────────────────────────────────────

    [Authorize]
    [HttpDelete("{reviewId}")]
    public async Task<IActionResult> Delete(int eventId, int reviewId)
    {
        var userId = await GetCurrentUserIdAsync();
        var review = await db.Reviews.FindAsync(reviewId);
        if (review is null || review.EventId != eventId) return NotFound();
        if (review.UserId != userId) return Forbid();

        db.Reviews.Remove(review);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Pin a review (host only) ───────────────────────────────────

    [Authorize]
    [HttpPost("{reviewId}/pin")]
    public async Task<IActionResult> Pin(int eventId, int reviewId)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        var ev = await db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != "Admin") return Forbid();

        // Unpin any existing pinned review
        var currentlyPinned = await db.Reviews
            .Where(r => r.EventId == eventId && r.IsPinned)
            .ToListAsync();
        currentlyPinned.ForEach(r => r.IsPinned = false);

        var review = await db.Reviews.FindAsync(reviewId);
        if (review is null || review.EventId != eventId) return NotFound();
        review.IsPinned = true;

        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Reply to a review ──────────────────────────────────────────

    [Authorize]
    [HttpPost("{reviewId}/replies")]
    public async Task<IActionResult> Reply(int eventId, int reviewId, ReviewReplyRequest req)
    {
        var userId = await GetCurrentUserIdAsync();
        var role   = GetCurrentRole();

        // Only the event organizer (or admin) can reply to reviews
        var ev = await db.Events.FindAsync(eventId);
        if (ev is null) return NotFound();
        if (ev.CreatedById != userId && role != "Admin" && role != "SuperAdmin")
            return Forbid();

        var review = await db.Reviews
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == reviewId && r.EventId == eventId);
        if (review is null) return NotFound();

        var reply = new ReviewReply
        {
            ReviewId = reviewId,
            UserId   = userId,
            Comment  = req.Comment
        };

        db.ReviewReplies.Add(reply);
        await db.SaveChangesAsync();
        await db.Entry(reply).Reference(rp => rp.User).LoadAsync();

        return CreatedAtAction(nameof(GetAll), new { eventId },
            new ReviewReplyResponse(reply.Id, reply.UserId, reply.User.Name, reply.Comment, reply.CreatedAt));
    }

    // ── Like / dislike a review ────────────────────────────────────

    [Authorize]
    [HttpPost("{reviewId}/vote")]
    public async Task<IActionResult> Vote(int eventId, int reviewId, VoteRequest req)
    {
        var userId = await GetCurrentUserIdAsync();

        if (!await db.Reviews.AnyAsync(r => r.Id == reviewId && r.EventId == eventId))
            return NotFound();

        var vote = await db.ReviewVotes.FindAsync(reviewId, userId);
        if (vote is null)
        {
            db.ReviewVotes.Add(new ReviewVote { ReviewId = reviewId, UserId = userId, IsLike = req.IsLike });
        }
        else
        {
            vote.IsLike = req.IsLike; // toggle / update
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helper ─────────────────────────────────────────────────────

    private static ReviewResponse ToResponse(Review r) => new(
        r.Id, r.EventId, r.UserId, r.User?.Name ?? string.Empty,
        r.Rating, r.Comment, r.IsPinned,
        r.Votes.Count(v => v.IsLike),
        r.Votes.Count(v => !v.IsLike),
        r.CreatedAt,
        r.Replies.Select(rp => new ReviewReplyResponse(
            rp.Id, rp.UserId, rp.User?.Name ?? string.Empty, rp.Comment, rp.CreatedAt)).ToList());
}
