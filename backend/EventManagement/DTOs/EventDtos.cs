namespace EventManagement.DTOs;

public record CreateEventRequest(
    string Title,
    string Description,
    string Location,
    DateTime StartDate,
    DateTime EndDate,
    int Capacity,
    decimal Price,
    bool IsPublic,
    int CategoryId,
    List<int>? TagIds
);

public record UpdateEventRequest(
    string Title,
    string Description,
    string Location,
    DateTime StartDate,
    DateTime EndDate,
    int Capacity,
    decimal Price,
    bool IsPublic,
    int CategoryId,
    List<int>? TagIds
);

public record PostponeEventRequest(DateTime NewStartDate, DateTime NewEndDate);

public record EventResponse(
    int Id,
    string Title,
    string Description,
    string Location,
    DateTime StartDate,
    DateTime EndDate,
    int Capacity,
    int BookingCount,
    decimal Price,
    bool IsPublic,
    string Status,
    string DisplayStatus,
    DateTime? PostponedDate,
    DateTime CreatedAt,
    int CreatedById,
    string CreatedByName,
    int CategoryId,
    string CategoryName,
    List<string> Tags
);

public record EventStatsResponse(
    int EventId,
    string Title,
    int TotalCapacity,
    int ConfirmedBookings,
    int CancelledBookings,
    double OccupancyRate,
    decimal TotalRevenue,
    double AverageRating,
    int ReviewCount
);
