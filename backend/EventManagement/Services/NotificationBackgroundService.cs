using EventManagement.Data;
using EventManagement.Models;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Services;

/// <summary>
/// Background service that runs hourly and sends:
/// - EventReminder: 24 h before an event starts (to confirmed attendees)
/// - ReviewReminder: 24 h after an event ends   (to checked-in attendees who haven't reviewed)
/// </summary>
public class NotificationBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<NotificationBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Run once on startup, then every hour
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendScheduledNotificationsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in NotificationBackgroundService");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task SendScheduledNotificationsAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTime.UtcNow;

        await SendEventRemindersAsync(db, now, ct);
        await SendReviewRemindersAsync(db, now, ct);

        await db.SaveChangesAsync(ct);
    }

    // ── Event reminders ────────────────────────────────────────────────
    // Send to confirmed attendees of events starting in 23–25 hours.
    // Deduplication: skip if we already sent an EventReminder for this event+user.

    private static async Task SendEventRemindersAsync(AppDbContext db, DateTime now, CancellationToken ct)
    {
        var windowStart = now.AddHours(23);
        var windowEnd   = now.AddHours(25);

        var events = await db.Events
            .Where(e => e.StartDate >= windowStart && e.StartDate <= windowEnd
                        && (e.Status == "Published" || e.Status == "Postponed"))
            .ToListAsync(ct);

        if (events.Count == 0) return;

        foreach (var ev in events)
        {
            var attendeeIds = await db.Bookings
                .Where(b => b.EventId == ev.Id && b.Status == "Confirmed")
                .Select(b => b.UserId)
                .Distinct()
                .ToListAsync(ct);

            if (attendeeIds.Count == 0) continue;

            // Skip users who already received a reminder for this event
            var alreadyNotified = await db.Notifications
                .Where(n => n.EventId == ev.Id && n.Type == "EventReminder")
                .Select(n => n.UserId)
                .ToListAsync(ct);

            var toNotify = attendeeIds.Except(alreadyNotified).ToList();
            if (toNotify.Count == 0) continue;

            db.Notifications.AddRange(toNotify.Select(uid => new Notification
            {
                UserId  = uid,
                Type    = "EventReminder",
                Title   = $"Reminder: \"{ev.Title}\" is tomorrow",
                Message = $"Your event starts on {ev.StartDate:MMM d} at {ev.StartDate:h:mm tt} UTC. See you there!",
                EventId = ev.Id,
            }));
        }
    }

    // ── Review reminders ───────────────────────────────────────────────
    // Send to checked-in attendees of events that ended 23–25 hours ago
    // who haven't reviewed yet and haven't already received a ReviewReminder.

    private static async Task SendReviewRemindersAsync(AppDbContext db, DateTime now, CancellationToken ct)
    {
        var windowStart = now.AddHours(-25);
        var windowEnd   = now.AddHours(-23);

        var events = await db.Events
            .Where(e => e.EndDate >= windowStart && e.EndDate <= windowEnd)
            .ToListAsync(ct);

        if (events.Count == 0) return;

        foreach (var ev in events)
        {
            var checkedInIds = await db.Bookings
                .Where(b => b.EventId == ev.Id && b.Status == "Confirmed" && b.IsCheckedIn)
                .Select(b => b.UserId)
                .Distinct()
                .ToListAsync(ct);

            if (checkedInIds.Count == 0) continue;

            var alreadyReviewed = await db.Reviews
                .Where(r => r.EventId == ev.Id)
                .Select(r => r.UserId)
                .ToListAsync(ct);

            var alreadyReminded = await db.Notifications
                .Where(n => n.EventId == ev.Id && n.Type == "ReviewReminder")
                .Select(n => n.UserId)
                .ToListAsync(ct);

            var toNotify = checkedInIds
                .Except(alreadyReviewed)
                .Except(alreadyReminded)
                .ToList();

            if (toNotify.Count == 0) continue;

            db.Notifications.AddRange(toNotify.Select(uid => new Notification
            {
                UserId  = uid,
                Type    = "ReviewReminder",
                Title   = $"How was \"{ev.Title}\"?",
                Message = "You attended this event. Share your experience — your review helps others discover great events.",
                EventId = ev.Id,
            }));
        }
    }
}
