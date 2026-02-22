using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Models;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Services;

public class AuthService(AppDbContext db, JwtService jwt)
{
    public async Task<AuthResponse?> RegisterAsync(RegisterRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            return null;

        var user = new User
        {
            Name = req.Name,
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password)
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return ToResponse(jwt.GenerateToken(user), user);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest req)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == req.Email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return null;

        return ToResponse(jwt.GenerateToken(user), user);
    }

    public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequest req)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
            return false;

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await db.SaveChangesAsync();
        return true;
    }

    private static AuthResponse ToResponse(string token, User user) =>
        new(token, user.Id, user.Name, user.Email, user.Role, user.LoyaltyPoints, user.LoyaltyTier);
}
