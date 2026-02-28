namespace EventManagement.Models;

public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    /// <summary>
    /// BookingConfirmation | EventReminder | ReviewReminder |
    /// EventUpdate | Announcement | EventCancelled | EventPostponed |
    /// WaitlistPromotion | SystemAnnouncement
    /// </summary>
    public string Type { get; set; } = "General";
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int? EventId { get; set; }
    public Event? Event { get; set; }
}
