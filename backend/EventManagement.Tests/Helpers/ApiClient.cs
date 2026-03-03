using System.Net.Http.Headers;
using System.Net.Http.Json;
using EventManagement.Data;
using EventManagement.DTOs;
using EventManagement.Models;
using Microsoft.Extensions.DependencyInjection;

namespace EventManagement.Tests.Helpers;

// Minimal local types for test auth responses
file record TestAuthResponse(string Token, int UserId);

/// <summary>
/// Convenience wrappers used by integration test classes.
/// </summary>
public static class ApiClient
{
    private static readonly System.Text.Json.JsonSerializerOptions CaseInsensitive =
        new() { PropertyNameCaseInsensitive = true };

    // ── Auth ──────────────────────────────────────────────────────────

    public static Task<HttpResponseMessage> RegisterAsync(
        HttpClient client, string name, string email, string password) =>
        client.PostAsJsonAsync("/api/dev/auth/register",
            new DevRegisterRequest(name, email, password));

    public static async Task<(string Token, int UserId)> RegisterAndGetIdAsync(
        HttpClient client, string name, string email, string password)
    {
        var response = await RegisterAsync(client, name, email, password);
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<TestAuthResponse>(CaseInsensitive);
        return (auth!.Token, auth.UserId);
    }

    public static async Task<string> RegisterAndLoginAsync(
        HttpClient client, string name, string email, string password)
    {
        var response = await RegisterAsync(client, name, email, password);
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<TestAuthResponse>(CaseInsensitive);
        return auth!.Token;
    }

    public static async Task<string> LoginAsync(
        HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/api/dev/auth/login",
            new DevLoginRequest(email, password));
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<TestAuthResponse>(CaseInsensitive);
        return auth!.Token;
    }

    /// <summary>
    /// Creates a SuperAdmin account via the key-protected dev endpoint
    /// and returns the JWT token.
    /// </summary>
    public static async Task<string> RegisterSuperAdminAsync(
        HttpClient client, string name, string email, string password, string registrationKey)
    {
        var response = await client.PostAsJsonAsync("/api/dev/admin/register",
            new DevAdminRegisterRequest(name, email, password, registrationKey));
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<TestAuthResponse>(CaseInsensitive);
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

    /// <summary>
    /// Creates an event and (by default) immediately publishes it.
    /// Pass <c>draft: true</c> to skip the publish step and leave it in Draft status.
    /// Returns the HttpResponseMessage from the create call.
    /// </summary>
    public static async Task<HttpResponseMessage> CreateEventAsync(
        HttpClient client,
        string title = "Test Event",
        string description = "A test event",
        string location = "Sydney",
        int daysFromNow = 30,
        int capacity = 100,
        decimal price = 0m,
        bool isPublic = true,
        int categoryId = 1,
        List<int>? tagIds = null,
        bool draft = false)
    {
        var start = DateTime.UtcNow.AddDays(daysFromNow);
        var createResp = await client.PostAsJsonAsync("/api/events", new CreateEventRequest(
            title, description, location,
            start, start.AddHours(2),
            capacity, price, isPublic, categoryId, tagIds, null));

        if (!draft && createResp.IsSuccessStatusCode)
        {
            var json = await createResp.Content.ReadAsStringAsync();
            createResp.Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

            var ev = System.Text.Json.JsonSerializer.Deserialize<EventResponse>(json, CaseInsensitive);
            if (ev is not null)
                await client.PostAsync($"/api/events/{ev.Id}/publish", null);
        }

        return createResp;
    }

    // ── Bookings ──────────────────────────────────────────────────────

    public static Task<HttpResponseMessage> BookEventAsync(
        HttpClient client, int eventId) =>
        client.PostAsJsonAsync("/api/bookings", new CreateBookingRequest(eventId));

    /// <summary>
    /// Directly seeds a Confirmed booking into the database, bypassing the booking
    /// API's date validation. Use this when testing scenarios that require a booking
    /// on a past (already-started) event.
    /// </summary>
    public static async Task SeedDirectBookingAsync(
        CustomWebApplicationFactory factory, int userId, int eventId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Bookings.Add(new Booking
        {
            UserId   = userId,
            EventId  = eventId,
            Status   = "Confirmed",
            BookedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Directly updates an event's StartDate and EndDate to the past, bypassing
    /// the API. Call after seeding bookings to simulate a completed event for review
    /// and other post-event tests.
    /// </summary>
    public static async Task BackdateEventAsync(
        CustomWebApplicationFactory factory, int eventId, int daysAgo = 5)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ev = await db.Events.FindAsync(eventId);
        if (ev is not null)
        {
            ev.StartDate = DateTime.UtcNow.AddDays(-daysAgo);
            ev.EndDate   = ev.StartDate.AddHours(2);
            await db.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Directly credits loyalty points to a user's account, bypassing the deferred
    /// award mechanism. Use this in tests that need to seed a specific loyalty tier
    /// before making a booking.
    /// </summary>
    public static async Task CreditLoyaltyPointsAsync(
        CustomWebApplicationFactory factory, int userId, int points)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.FindAsync(userId);
        if (user is not null)
        {
            user.LoyaltyPoints += points;
            await db.SaveChangesAsync();
        }
    }
}
