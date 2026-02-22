using System.Security.Claims;
using EventManagement.DTOs;
using EventManagement.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventManagement.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService auth) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        var result = await auth.RegisterAsync(req);
        if (result is null)
            return Conflict(new { message = "Email already in use." });
        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var result = await auth.LoginAsync(req);
        if (result is null)
            return Unauthorized(new { message = "Invalid email or password." });
        return Ok(result);
    }

    [Authorize]
    [HttpPut("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var ok = await auth.ChangePasswordAsync(userId, req);
        if (!ok)
            return BadRequest(new { message = "Current password is incorrect." });
        return NoContent();
    }
}
