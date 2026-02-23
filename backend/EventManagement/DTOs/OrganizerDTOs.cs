namespace EventManagement.DTOs;

public record UpdateOrganizerProfileRequest(
    string? Bio,
    string? Website,
    string? TwitterHandle,
    string? InstagramHandle
);

public record OrganizerPublicProfile(
    int Id,
    string Name,
    string? Bio,
    string? Website,
    string? TwitterHandle,
    string? InstagramHandle,
    int FollowerCount,
    DateTime MemberSince,
    List<OrganizerEventSummary> Events
);

public record OrganizerEventSummary(
    int Id,
    string Title,
    string DisplayStatus,
    DateTime StartDate,
    int ConfirmedBookings,
    int Capacity
);

public record OrganizerDashboard(
    int TotalEvents,
    int TotalAttendees,
    decimal TotalRevenue,
    int TotalCheckedIn,
    List<OrganizerEventStats> UpcomingEvents,
    List<OrganizerEventStats> RecentEvents
);

public record OrganizerEventStats(
    int EventId,
    string Title,
    string DisplayStatus,
    DateTime StartDate,
    int ConfirmedBookings,
    int Capacity,
    decimal Revenue,
    int CheckedIn
);

public record AttendeeInfo(
    int BookingId,
    int UserId,
    string Name,
    string Email,
    DateTime BookedAt,
    string BookingStatus,
    bool IsCheckedIn,
    DateTime? CheckedInAt,
    string? CheckInToken
);

public record CheckInInfo(
    int BookingId,
    int UserId,
    string AttendeeName,
    string EventTitle,
    bool IsCheckedIn,
    DateTime? CheckedInAt
);
