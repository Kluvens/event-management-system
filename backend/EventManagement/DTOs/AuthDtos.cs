namespace EventManagement.DTOs;

/// <summary>
/// Returned by GET /api/auth/me — the local app-specific profile for the authenticated Cognito user.
/// </summary>
public record UserProfileResponse(
    int UserId, string Name, string Email, string Role,
    int LoyaltyPoints, string LoyaltyTier, bool IsSuspended);
