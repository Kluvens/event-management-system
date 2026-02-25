namespace EventManagement.DTOs;

public record WaitlistPositionResponse(int EventId, int Position, DateTime JoinedAt);

public record WaitlistEntryResponse(int UserId, string UserName, int Position, DateTime JoinedAt);
