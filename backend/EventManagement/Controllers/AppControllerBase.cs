using System.Security.Claims;
using EventManagement.Services;
using Microsoft.AspNetCore.Mvc;

namespace EventManagement.Controllers;

/// <summary>
/// Base controller that resolves the Cognito "sub" claim to a local integer user ID.
/// All controllers that need the current user ID should inherit from this class.
/// </summary>
[ApiController]
public abstract class AppControllerBase(ICognitoUserResolver resolver) : ControllerBase
{
    /// <summary>
    /// Resolves the authenticated user's Cognito sub to the local integer user ID.
    /// Throws UnauthorizedAccessException if resolution fails.
    /// </summary>
    protected async Task<int> GetCurrentUserIdAsync()
    {
        var userId = await resolver.ResolveUserIdAsync(User);
        if (userId is null)
            throw new UnauthorizedAccessException("Could not resolve user identity.");
        return userId.Value;
    }

    /// <summary>Returns the raw "sub" UUID from the Cognito token, or null if unauthenticated.</summary>
    protected string? GetCurrentSub() => User.FindFirstValue("sub");

    /// <summary>Returns the role from ClaimTypes.Role (mapped from cognito:groups in Program.cs).</summary>
    protected string? GetCurrentRole() => User.FindFirstValue(ClaimTypes.Role);
}
