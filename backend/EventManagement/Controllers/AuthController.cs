using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, ICognitoUserResolver resolver) : AppControllerBase(resolver)
{
    /// <summary>
    /// Returns the app-specific profile for the currently authenticated user.
    /// Called by the frontend immediately after Cognito sign-in to get userId, role, and loyalty data.
    /// On first login, a local User row is auto-provisioned by CognitoUserResolver.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = await GetCurrentUserIdAsync();
        var user   = await db.Users.FindAsync(userId);

        if (user is null) return NotFound();

        if (user.IsSuspended)
            return StatusCode(403, new { message = "Your account has been suspended. Please contact support." });

        return Ok(new UserProfileResponse(
            user.Id, user.Name, user.Email, user.Role,
            user.LoyaltyPoints, user.LoyaltyTier, user.IsSuspended,
            user.TwitterHandle, user.InstagramHandle,
            user.Bio, user.Website));
    }
}
