namespace EventManagement.DTOs;

public record CreateBookingRequest(int EventId);

public record BookingResponse(
    int Id,
    int EventId,
    string EventTitle,
    string EventLocation,
    DateTime EventStartDate,
    decimal EventPrice,
    DateTime BookedAt,
    string Status,
    int PointsEarned,
    bool IsCheckedIn,
    DateTime? CheckedInAt,
    string? CheckInToken
);
