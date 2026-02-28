namespace EventManagement.DTOs;

public record StoreProductResponse(
    int Id,
    string Name,
    string Description,
    int PointCost,
    string Category,
    string? ImageUrl,
    bool IsActive,
    bool AlreadyOwned
);

public record CreateProductRequest(
    string Name,
    string Description,
    int PointCost,
    string Category,
    string? ImageUrl
);

public record UpdateProductRequest(
    string? Name,
    string? Description,
    int? PointCost,
    string? Category,
    string? ImageUrl,
    bool? IsActive
);

public record PurchaseProductRequest(int ProductId);

public record PurchaseProductResponse(
    int PurchaseId,
    string ProductName,
    int PointsSpent,
    int RemainingPoints
);

public record UserPurchaseResponse(
    int Id,
    StoreProductResponse Product,
    DateTime PurchasedAt,
    int PointsSpent
);
