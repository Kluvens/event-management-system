using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>Tests for GET /api/auth/me.</summary>
public sealed class AuthControllerTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthControllerTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client  = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task GetMe_Unauthenticated_Returns401()
    {
        var resp = await _client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task GetMe_AuthenticatedUser_ReturnsProfile()
    {
        var token = await ApiClient.RegisterAndLoginAsync(
            _client, "Auth Test", "authtest@auth.test", "Password1!");
        var authClient = ApiClient.WithToken(_factory, token);

        var resp = await authClient.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var profile = await resp.Content.ReadFromJsonAsync<UserProfileResponse>();
        Assert.NotNull(profile);
        Assert.Equal("authtest@auth.test", profile.Email);
        Assert.Equal("Auth Test", profile.Name);
        Assert.Equal("Attendee", profile.Role);
    }

    [Fact]
    public async Task GetMe_SuspendedUser_Returns403()
    {
        var (token, userId) = await ApiClient.RegisterAndGetIdAsync(
            _client, "Suspended User", "suspendedauth@auth.test", "Password1!");

        var adminToken = await ApiClient.RegisterSuperAdminAsync(
            _client, "SA Auth", "saauth@auth.test", "Password1!",
            CustomWebApplicationFactory.TestAdminKey);
        var adminClient = ApiClient.WithToken(_factory, adminToken);
        await adminClient.PostAsync($"/api/admin/users/{userId}/suspend", null);

        var userClient = ApiClient.WithToken(_factory, token);
        var resp = await userClient.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }
}
