namespace EventManagement.DTOs;

public record NotificationResponse(
    int Id,
    string Title,
    string Message,
    bool IsRead,
    DateTime CreatedAt,
    int? EventId
);

public record UnreadCountResponse(int Count);
