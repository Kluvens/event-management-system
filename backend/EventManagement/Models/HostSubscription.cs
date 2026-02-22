namespace EventManagement.Models;

public class HostSubscription
{
    public int SubscriberId { get; set; }
    public User Subscriber { get; set; } = null!;

    public int HostId { get; set; }
    public User Host { get; set; } = null!;

    public DateTime SubscribedAt { get; set; } = DateTime.UtcNow;
}
