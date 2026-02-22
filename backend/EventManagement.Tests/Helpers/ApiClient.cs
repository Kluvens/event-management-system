using System.Net.Http.Headers;
using System.Net.Http.Json;
using EventManagement.DTOs;

namespace EventManagement.Tests.Helpers;

/// <summary>
/// Convenience wrappers used by integration test classes.
/// </summary>
public static class ApiClient
{
    // ── Auth ──────────────────────────────────────────────────────────

    public static Task<HttpResponseMessage> RegisterAsync(
        HttpClient client, string name, string email, string password) =>
        client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(name, email, password));

    public static async Task<string> RegisterAndLoginAsync(
        HttpClient client, string name, string email, string password)
    {
        await RegisterAsync(client, name, email, password);
        return await LoginAsync(client, email, password);
    }

    public static async Task<string> LoginAsync(
        HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, password));
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return auth!.Token;
    }

    // ── HTTP client with bearer token ─────────────────────────────────

    public static HttpClient WithToken(
        CustomWebApplicationFactory factory, string token)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    // ── Events ────────────────────────────────────────────────────────

    public static Task<HttpResponseMessage> CreateEventAsync(
        HttpClient client,
        string title = "Test Event",
        string description = "A test event",
        string location = "Sydney",
        int daysFromNow = 30,
        int capacity = 100,
        decimal price = 0m,
        bool isPublic = true,
        int categoryId = 1,
        List<int>? tagIds = null)
    {
        var start = DateTime.UtcNow.AddDays(daysFromNow);
        return client.PostAsJsonAsync("/api/events", new CreateEventRequest(
            title, description, location,
            start, start.AddHours(2),
            capacity, price, isPublic, categoryId, tagIds));
    }

    // ── Bookings ──────────────────────────────────────────────────────

    public static Task<HttpResponseMessage> BookEventAsync(
        HttpClient client, int eventId) =>
        client.PostAsJsonAsync("/api/bookings", new CreateBookingRequest(eventId));
}
