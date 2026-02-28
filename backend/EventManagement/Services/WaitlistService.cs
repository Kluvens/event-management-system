using EventManagement.Data;
using EventManagement.Models;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Services;

public interface IWaitlistService
{
    /// <summary>
    /// Promotes the first person on the waitlist for an event (if any) to a confirmed booking.
    /// Call this after a confirmed booking is cancelled.
    /// </summary>
    Task PromoteNextAsync(int eventId);
}

public class WaitlistService(AppDbContext db) : IWaitlistService
{
    public async Task PromoteNextAsync(int eventId)
    {
        var ev = await db.Events.FindAsync(eventId);
        if (ev is null) return;

        var next = await db.WaitlistEntries
            .Include(w => w.User)
            .Where(w => w.EventId == eventId)
            .OrderBy(w => w.Position)
            .FirstOrDefaultAsync();

        if (next is null) return;

        // Check if event actually has a free slot
        var confirmed = await db.Bookings.CountAsync(b => b.EventId == eventId && b.Status == "Confirmed");
        if (confirmed >= ev.Capacity) return;

        // Promote: create or re-activate booking
        var existing = await db.Bookings
            .FirstOrDefaultAsync(b => b.UserId == next.UserId && b.EventId == eventId);

        var user = next.User;
        var discountedPrice = ev.Price * (1 - user.LoyaltyDiscount);
        var pointsEarned    = (int)(discountedPrice * 10);

        if (existing is not null)
        {
            existing.Status       = "Confirmed";
            existing.BookedAt     = DateTime.UtcNow;
            existing.PointsEarned = pointsEarned;
            existing.CheckInToken ??= Guid.NewGuid().ToString();
        }
        else
        {
            db.Bookings.Add(new Booking
            {
                UserId       = next.UserId,
                EventId      = eventId,
                PointsEarned = pointsEarned,
                CheckInToken = Guid.NewGuid().ToString(),
            });
        }

        user.LoyaltyPoints += pointsEarned;

        // Remove from waitlist and re-number remaining entries
        var removedPosition = next.Position;
        db.WaitlistEntries.Remove(next);

        var subsequent = await db.WaitlistEntries
            .Where(w => w.EventId == eventId && w.Position > removedPosition)
            .ToListAsync();
        foreach (var w in subsequent) w.Position--;

        // Notify the promoted user
        db.Notifications.Add(new Notification
        {
            UserId  = next.UserId,
            Type    = "WaitlistPromotion",
            Title   = "Spot available — you're in!",
            Message = $"You've been promoted from the waitlist for \"{ev.Title}\". You now have a confirmed booking.",
            EventId = eventId,
        });

        await db.SaveChangesAsync();
    }
}
