namespace EventManagement.DTOs;

public record CreateBookingRequest(int EventId);

public record BookingResponse(
    int Id,
    int EventId,
    string EventTitle,
    string EventLocation,
    DateTime EventStartDate,
    DateTime BookedAt,
    string Status
);
