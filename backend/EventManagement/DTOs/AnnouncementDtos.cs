namespace EventManagement.DTOs;

public record CreateAnnouncementRequest(string Title, string Message);

public record AnnouncementResponse(
    int Id,
    int EventId,
    string EventTitle,
    string Title,
    string Message,
    DateTime CreatedAt
);
