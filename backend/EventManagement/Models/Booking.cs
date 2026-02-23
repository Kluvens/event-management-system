namespace EventManagement.Models;

public class Booking
{
    public int Id { get; set; }
    public DateTime BookedAt { get; set; } = DateTime.UtcNow;
    // "Confirmed" or "Cancelled"
    public string Status { get; set; } = "Confirmed";
    public int PointsEarned { get; set; } = 0;

    // Check-in
    public bool IsCheckedIn { get; set; } = false;
    public DateTime? CheckedInAt { get; set; }
    public string? CheckInToken { get; set; }  // UUID, generated on create

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int EventId { get; set; }
    public Event Event { get; set; } = null!;
}
