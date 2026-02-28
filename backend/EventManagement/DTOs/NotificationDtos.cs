namespace EventManagement.DTOs;

public record NotificationResponse(
    int Id,
    string Type,
    string Title,
    string Message,
    bool IsRead,
    DateTime CreatedAt,
    int? EventId
);

public record UnreadCountResponse(int Count);

public record SystemAnnouncementRequest(string Title, string Message);
