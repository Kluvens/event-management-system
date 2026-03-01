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
    List<int>? TagIds,
    string? ImageUrl,
    bool Publish = false
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
    List<int>? TagIds,
    string? ImageUrl
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
    List<string> Tags,
    string? ImageUrl,
    string? InviteCode = null
);

public record PagedEventResponse(
    List<EventResponse> Items,
    int TotalCount,
    bool HasMore
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

public record DailyBookingCount(DateOnly Date, int Count);

public record EventAnalyticsResponse(
    int EventId,
    string Title,
    int TotalCapacity,
    int ConfirmedBookings,
    int CancelledBookings,
    int WaitlistCount,
    int TotalCheckedIn,
    double OccupancyRate,
    double CheckInRate,
    decimal TotalRevenue,
    double AverageRating,
    int ReviewCount,
    List<DailyBookingCount> DailyBookings
);
