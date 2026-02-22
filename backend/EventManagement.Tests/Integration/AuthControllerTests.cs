using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

public class AuthControllerTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthControllerTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    // ── Register ─────────────────────────────────────────────────────

    [Fact]
    public async Task Register_ValidRequest_Returns200WithToken()
    {
        var response = await ApiClient.RegisterAsync(
            _client, "Alice", "alice@auth.test", "Password1!");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.Equal("Alice", auth.Name);
        Assert.Equal("alice@auth.test", auth.Email);
        Assert.Equal("Attendee", auth.Role);
        Assert.False(string.IsNullOrEmpty(auth.Token));
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        await ApiClient.RegisterAsync(_client, "Bob", "bob@auth.test", "Password1!");
        var response = await ApiClient.RegisterAsync(_client, "Bob2", "bob@auth.test", "Password2!");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    // ── Login ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_ValidCredentials_Returns200WithToken()
    {
        await ApiClient.RegisterAsync(_client, "Carol", "carol@auth.test", "Password1!");

        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("carol@auth.test", "Password1!"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        Assert.False(string.IsNullOrEmpty(auth.Token));
        Assert.Equal("carol@auth.test", auth.Email);
        Assert.Equal(0, auth.LoyaltyPoints);
        Assert.Equal("Standard", auth.LoyaltyTier);
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        await ApiClient.RegisterAsync(_client, "Dave", "dave@auth.test", "CorrectPass!");

        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("dave@auth.test", "WrongPass!"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_NonexistentUser_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("nobody@auth.test", "Password1!"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Change Password ───────────────────────────────────────────────

    [Fact]
    public async Task ChangePassword_ValidCurrentPassword_Returns204()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Eve", "eve@test.com", "OldPass!");
        var authed = ApiClient.WithToken(_factory, token);

        var response = await authed.PutAsJsonAsync("/api/auth/change-password",
            new ChangePasswordRequest("OldPass!", "NewPass!"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // New password should now work
        var loginResp = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("eve@test.com", "NewPass!"));
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_Returns400()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Frank", "frank@test.com", "RealPass!");
        var authed = ApiClient.WithToken(_factory, token);

        var response = await authed.PutAsJsonAsync("/api/auth/change-password",
            new ChangePasswordRequest("WrongPass!", "NewPass!"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_Unauthenticated_Returns401()
    {
        var response = await _client.PutAsJsonAsync("/api/auth/change-password",
            new ChangePasswordRequest("Old!", "New!"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
