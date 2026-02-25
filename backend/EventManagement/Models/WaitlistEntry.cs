namespace EventManagement.Models;

public class WaitlistEntry
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public Event Event { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int Position { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
