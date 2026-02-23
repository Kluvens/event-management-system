using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace EventManagement.Tests.Unit.Services;

public class AuthServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AuthService _service;

    public AuthServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"]      = "SuperSecretKey_ForTestingOnly_AtLeast32Chars!",
                ["Jwt:Issuer"]   = "EventManagementAPI",
                ["Jwt:Audience"] = "EventManagementClient"
            })
            .Build();

        var jwt = new JwtService(config);
        _service = new AuthService(_db, jwt);
    }

    public void Dispose() => _db.Dispose();

    // ── RegisterAsync ────────────────────────────────────────────────

    [Fact]
    public async Task RegisterAsync_NewEmail_ReturnsAuthResponse()
    {
        var result = await _service.RegisterAsync(
            new RegisterRequest("Alice", "alice@test.com", "Password1!"));

        Assert.NotNull(result);
        Assert.Equal("Alice", result.Name);
        Assert.Equal("alice@test.com", result.Email);
        Assert.Equal("Attendee", result.Role);
        Assert.Equal(0, result.LoyaltyPoints);
        Assert.Equal("Standard", result.LoyaltyTier);
        Assert.False(string.IsNullOrEmpty(result.Token));
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ReturnsNull()
    {
        await _service.RegisterAsync(
            new RegisterRequest("Alice", "alice@test.com", "Password1!"));

        var duplicate = await _service.RegisterAsync(
            new RegisterRequest("Alice2", "alice@test.com", "Password2!"));

        Assert.Null(duplicate);
    }

    [Fact]
    public async Task RegisterAsync_StoresPasswordHash_NotPlaintext()
    {
        await _service.RegisterAsync(
            new RegisterRequest("Bob", "bob@test.com", "MyPassword!"));

        var user = await _db.Users.FirstAsync(u => u.Email == "bob@test.com");
        Assert.NotEqual("MyPassword!", user.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("MyPassword!", user.PasswordHash));
    }

    // ── LoginAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsAuthResponse()
    {
        await _service.RegisterAsync(
            new RegisterRequest("Carol", "carol@test.com", "Pass!"));

        var result = await _service.LoginAsync(
            new LoginRequest("carol@test.com", "Pass!"));

        Assert.NotNull(result.Response);
        Assert.Equal("carol@test.com", result.Response!.Email);
        Assert.False(string.IsNullOrEmpty(result.Response.Token));
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ReturnsNull()
    {
        await _service.RegisterAsync(
            new RegisterRequest("Dave", "dave@test.com", "CorrectPass!"));

        var result = await _service.LoginAsync(
            new LoginRequest("dave@test.com", "WrongPass!"));

        Assert.Null(result.Response);
    }

    [Fact]
    public async Task LoginAsync_NonexistentUser_ReturnsNull()
    {
        var result = await _service.LoginAsync(
            new LoginRequest("nobody@test.com", "Pass!"));

        Assert.Null(result.Response);
    }

    // ── ChangePasswordAsync ──────────────────────────────────────────

    [Fact]
    public async Task ChangePasswordAsync_CorrectCurrentPassword_ReturnsTrue()
    {
        var reg = await _service.RegisterAsync(
            new RegisterRequest("Eve", "eve@test.com", "OldPass!"));

        var ok = await _service.ChangePasswordAsync(
            reg!.UserId,
            new ChangePasswordRequest("OldPass!", "NewPass!"));

        Assert.True(ok);

        // Verify new password works
        var login = await _service.LoginAsync(
            new LoginRequest("eve@test.com", "NewPass!"));
        Assert.NotNull(login.Response);
    }

    [Fact]
    public async Task ChangePasswordAsync_WrongCurrentPassword_ReturnsFalse()
    {
        var reg = await _service.RegisterAsync(
            new RegisterRequest("Frank", "frank@test.com", "OldPass!"));

        var ok = await _service.ChangePasswordAsync(
            reg!.UserId,
            new ChangePasswordRequest("WrongPass!", "NewPass!"));

        Assert.False(ok);
    }

    [Fact]
    public async Task ChangePasswordAsync_OldPasswordNoLongerWorks_AfterChange()
    {
        var reg = await _service.RegisterAsync(
            new RegisterRequest("Grace", "grace@test.com", "OldPass!"));

        await _service.ChangePasswordAsync(
            reg!.UserId,
            new ChangePasswordRequest("OldPass!", "NewPass!"));

        var oldLogin = await _service.LoginAsync(
            new LoginRequest("grace@test.com", "OldPass!"));
        Assert.Null(oldLogin.Response);
    }
}
