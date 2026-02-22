namespace EventManagement.Models;

public class EventTag
{
    public int EventId { get; set; }
    public Event Event { get; set; } = null!;

    public int TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}
