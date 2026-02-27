namespace EventManagement.Models;

public class UserPurchase
{
    public int Id { get; set; }
    public DateTime PurchasedAt { get; set; } = DateTime.UtcNow;
    public int PointsSpent { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int ProductId { get; set; }
    public StoreProduct Product { get; set; } = null!;
}
