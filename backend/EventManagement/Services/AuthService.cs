using EventManagement.Data;

namespace EventManagement.Services;

/// <summary>
/// Minimal auth service retained for app-level logic that Cognito doesn't handle
/// (e.g. suspension checks used internally by other services).
/// Login/register/password-change are now handled by AWS Cognito via the frontend Amplify SDK.
/// </summary>
public class AuthService(AppDbContext db)
{
    public async Task<bool> IsUserSuspendedAsync(int userId)
    {
        var user = await db.Users.FindAsync(userId);
        return user?.IsSuspended ?? false;
    }
}
