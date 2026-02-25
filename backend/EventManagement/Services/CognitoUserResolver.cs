using System.Security.Claims;
using EventManagement.Data;
using EventManagement.Models;
using Microsoft.EntityFrameworkCore;
namespace EventManagement.Services;

public interface ICognitoUserResolver
{
    /// <summary>
    /// Resolves the Cognito "sub" claim to a local integer user ID.
    /// On first login, auto-provisions a local User row from the token claims.
    /// Returns null if the principal has no "sub" claim.
    /// </summary>
    Task<int?> ResolveUserIdAsync(ClaimsPrincipal principal);
}

public class CognitoUserResolver(AppDbContext db) : ICognitoUserResolver
{
    public async Task<int?> ResolveUserIdAsync(ClaimsPrincipal principal)
    {
        var sub = principal.FindFirstValue("sub")
               ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (sub is null) return null;

        var user = await db.Users.SingleOrDefaultAsync(u => u.CognitoSub == sub);
        if (user is not null) return user.Id;

        var email = principal.FindFirstValue("email")
                 ?? principal.FindFirstValue(ClaimTypes.Email)
                 ?? string.Empty;

        var name = principal.FindFirstValue("name")
                ?? principal.FindFirstValue("cognito:username")
                ?? email;

        // Account linking: if a local account already has this email (e.g. registered
        // via email/password before), attach the Cognito sub rather than creating a duplicate.
        var existing = await db.Users.SingleOrDefaultAsync(u => u.Email == email);
        if (existing is not null)
        {
            existing.CognitoSub = sub;
            await db.SaveChangesAsync();
            return existing.Id;
        }

        // First-ever login: provision a new local row from Cognito ID token claims
        user = new User
        {
            CognitoSub = sub,
            Email      = email,
            Name       = name,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user.Id;
    }
}
