namespace EventManagement.Models;

public class Booking
{
    public int Id { get; set; }
    public DateTime BookedAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Confirmed"; // "Confirmed" or "Cancelled"

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int EventId { get; set; }
    public Event Event { get; set; } = null!;
}
