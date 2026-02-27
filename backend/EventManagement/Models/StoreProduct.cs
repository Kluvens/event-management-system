namespace EventManagement.Models;

public class StoreProduct
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public int PointCost { get; set; }
    // "Badge" | "Cosmetic" | "Feature" | "Perk" | "Collectible"
    public string Category { get; set; } = "";
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserPurchase> Purchases { get; set; } = [];
}
