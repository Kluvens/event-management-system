namespace EventManagement.DTOs;

public class StoreProductResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public int PointCost { get; set; }
    public string Category { get; set; } = "";
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; }
    public bool AlreadyOwned { get; set; }
}

public class CreateProductRequest
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public int PointCost { get; set; }
    public string Category { get; set; } = "";
    public string? ImageUrl { get; set; }
}

public class UpdateProductRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public int? PointCost { get; set; }
    public string? Category { get; set; }
    public string? ImageUrl { get; set; }
    public bool? IsActive { get; set; }
}

public class PurchaseProductRequest
{
    public int ProductId { get; set; }
}

public class PurchaseProductResponse
{
    public int PurchaseId { get; set; }
    public string ProductName { get; set; } = "";
    public int PointsSpent { get; set; }
    public int RemainingPoints { get; set; }
}

public class UserPurchaseResponse
{
    public int Id { get; set; }
    public StoreProductResponse Product { get; set; } = null!;
    public DateTime PurchasedAt { get; set; }
    public int PointsSpent { get; set; }
}
