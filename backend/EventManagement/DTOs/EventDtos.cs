namespace EventManagement.DTOs;

public record CreateEventRequest(
    string Title,
    string Description,
    string Location,
    DateTime StartDate,
    DateTime EndDate,
    int Capacity,
    int CategoryId
);

public record UpdateEventRequest(
    string Title,
    string Description,
    string Location,
    DateTime StartDate,
    DateTime EndDate,
    int Capacity,
    int CategoryId
);

public record EventResponse(
    int Id,
    string Title,
    string Description,
    string Location,
    DateTime StartDate,
    DateTime EndDate,
    int Capacity,
    int BookingCount,
    DateTime CreatedAt,
    int CreatedById,
    string CreatedByName,
    int CategoryId,
    string CategoryName
);
