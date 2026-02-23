namespace EventManagement.DTOs;

// ── Registration ────────────────────────────────────────────────────────────

public record AdminRegisterRequest(
    string Name,
    string Email,
    string Password,
    string RegistrationKey);

// ── Users ───────────────────────────────────────────────────────────────────

public record AdminUserListItem(
    int Id,
    string Name,
    string Email,
    string Role,
    bool IsSuspended,
    int LoyaltyPoints,
    string LoyaltyTier,
    DateTime CreatedAt,
    int EventCount,
    int BookingCount);

public record AdminUserDetail(
    int Id,
    string Name,
    string Email,
    string Role,
    bool IsSuspended,
    int LoyaltyPoints,
    string LoyaltyTier,
    DateTime CreatedAt,
    int EventCount,
    int BookingCount,
    List<AdminUserBooking> RecentBookings,
    List<AdminUserEvent> RecentEvents);

public record AdminUserBooking(int BookingId, int EventId, string EventTitle, string Status, DateTime BookedAt);

public record AdminUserEvent(int EventId, string Title, string Status, DateTime StartDate, int BookingCount);

public record ChangeRoleRequest(string Role);

public record AdjustPointsRequest(int Delta);

// ── Events ──────────────────────────────────────────────────────────────────

public record AdminEventListItem(
    int Id,
    string Title,
    string Status,
    bool IsSuspended,
    bool IsPublic,
    int CreatedById,
    string CreatedByName,
    string CategoryName,
    DateTime StartDate,
    DateTime EndDate,
    int Capacity,
    int BookingCount,
    decimal Price,
    DateTime CreatedAt);

// ── Bookings ─────────────────────────────────────────────────────────────────

public record AdminBookingItem(
    int Id,
    int UserId,
    string UserName,
    int EventId,
    string EventTitle,
    string Status,
    DateTime BookedAt,
    int PointsEarned,
    decimal EventPrice);

// ── Categories ───────────────────────────────────────────────────────────────

public record CreateCategoryRequest(string Name);

public record UpdateCategoryRequest(string Name);

// ── Tags ─────────────────────────────────────────────────────────────────────

public record CreateTagRequest(string Name);

// ── Stats ────────────────────────────────────────────────────────────────────

public record AdminStatsResponse(
    int TotalUsers,
    int ActiveUsers,
    int SuspendedUsers,
    int TotalEvents,
    int ActiveEvents,
    int SuspendedEvents,
    int TotalBookings,
    int ConfirmedBookings,
    decimal TotalRevenue);
