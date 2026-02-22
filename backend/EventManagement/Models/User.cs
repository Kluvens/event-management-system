namespace EventManagement.Models;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Attendee"; // "Admin" or "Attendee"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int LoyaltyPoints { get; set; } = 0;

    public string LoyaltyTier => LoyaltyPoints switch
    {
        >= 50000 => "Elite",
        >= 15000 => "Gold",
        >= 5000  => "Silver",
        >= 1000  => "Bronze",
        _        => "Standard"
    };

    public decimal LoyaltyDiscount => LoyaltyTier switch
    {
        "Elite"  => 0.20m,
        "Gold"   => 0.15m,
        "Silver" => 0.10m,
        "Bronze" => 0.05m,
        _        => 0m
    };

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<Event> CreatedEvents { get; set; } = new List<Event>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<HostSubscription> Subscriptions { get; set; } = new List<HostSubscription>();
    public ICollection<HostSubscription> Subscribers { get; set; } = new List<HostSubscription>();
}
