using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

public class ReviewsControllerTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ReviewsControllerTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    // ── Setup helpers ────────────────────────────────────────────────

    /// <summary>
    /// Creates a past event (host) that an attendee has a confirmed booking for.
    /// Returns host and attendee authenticated clients plus the event id.
    /// </summary>
    private async Task<(HttpClient hostClient, HttpClient attendeeClient, int eventId)>
        SetupReviewScenarioAsync(string suffix)
    {
        // Host creates a past event (already started → can review)
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, $"RHost{suffix}", $"rhost{suffix}@rev.test", "Pass!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);

        var createResp = await hostClient.PostAsJsonAsync("/api/events",
            new CreateEventRequest(
                $"Past Event {suffix}", "A past event", "Sydney",
                DateTime.UtcNow.AddDays(-5),     // started in the past
                DateTime.UtcNow.AddDays(-5).AddHours(2),
                100, 0m, true, 1, null));
        var ev = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(ev);

        // Attendee books the event
        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, $"RAttendee{suffix}", $"rattendee{suffix}@rev.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);
        await ApiClient.BookEventAsync(attendeeClient, ev.Id);

        return (hostClient, attendeeClient, ev.Id);
    }

    // ── GET /api/events/{eventId}/reviews ─────────────────────────────

    [Fact]
    public async Task GetAll_Returns200WithList()
    {
        var (_, attendeeClient, eventId) = await SetupReviewScenarioAsync("GA");

        // Create a review first
        await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Excellent event!"));

        var response = await _client.GetAsync($"/api/events/{eventId}/reviews");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var reviews = await response.Content.ReadFromJsonAsync<List<ReviewResponse>>();
        Assert.NotNull(reviews);
        Assert.NotEmpty(reviews);
    }

    [Fact]
    public async Task GetAll_SortByHighest_ReturnsPinnedFirst()
    {
        var (hostClient, attendeeClient, eventId) = await SetupReviewScenarioAsync("SH");

        // Attendee reviews
        var r1Resp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(3, "OK event"));
        var r1 = await r1Resp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(r1);

        // Register a second attendee and book
        var attendee2Token = await ApiClient.RegisterAndLoginAsync(
            _client, "RAttSH2", "ratendee2sh@rev.test", "Pass!");
        var attendee2Client = ApiClient.WithToken(_factory, attendee2Token);
        await ApiClient.BookEventAsync(attendee2Client, eventId);
        await attendee2Client.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Great event"));

        // Host pins r1
        await hostClient.PostAsync($"/api/events/{eventId}/reviews/{r1.Id}/pin", null);

        var response = await _client.GetAsync($"/api/events/{eventId}/reviews?sort=highest");
        var reviews = await response.Content.ReadFromJsonAsync<List<ReviewResponse>>();
        Assert.NotNull(reviews);
        Assert.True(reviews[0].IsPinned);
    }

    [Fact]
    public async Task GetAll_NonexistentEvent_Returns404()
    {
        var response = await _client.GetAsync("/api/events/999999/reviews");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── POST /api/events/{eventId}/reviews ────────────────────────────

    [Fact]
    public async Task Create_WithConfirmedBookingAndPastEvent_Returns201()
    {
        var (_, attendeeClient, eventId) = await SetupReviewScenarioAsync("CR");

        var response = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(4, "Really good!"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var review = await response.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);
        Assert.Equal(4, review.Rating);
        Assert.Equal("Really good!", review.Comment);
        Assert.False(review.IsPinned);
    }

    [Fact]
    public async Task Create_WithoutBooking_Returns400()
    {
        var (_, _, eventId) = await SetupReviewScenarioAsync("NB");

        // A user who never booked tries to review
        var noBookToken = await ApiClient.RegisterAndLoginAsync(
            _client, "NoBookUser", "nobookuser@rev.test", "Pass!");
        var noBookClient = ApiClient.WithToken(_factory, noBookToken);

        var response = await noBookClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Never attended"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_EventNotStartedYet_Returns400()
    {
        // Create a future event
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, "FutureHost", "futurehost@rev.test", "Pass!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);

        var createResp = await ApiClient.CreateEventAsync(hostClient, "Future Event",
            daysFromNow: 30);
        var ev = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(ev);

        var attendeeToken = await ApiClient.RegisterAndLoginAsync(
            _client, "FutureAtt", "futureatt@rev.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);
        await ApiClient.BookEventAsync(attendeeClient, ev.Id);

        var response = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{ev.Id}/reviews",
            new CreateReviewRequest(5, "Too early!"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_DuplicateReview_Returns409()
    {
        var (_, attendeeClient, eventId) = await SetupReviewScenarioAsync("DUP");

        await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(4, "First review"));

        var response = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Second review"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Create_InvalidRating_Returns400()
    {
        var (_, attendeeClient, eventId) = await SetupReviewScenarioAsync("IR");

        var response = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(6, "Out of range"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── DELETE /api/events/{eventId}/reviews/{reviewId} ──────────────

    [Fact]
    public async Task Delete_OwnReview_Returns204()
    {
        var (_, attendeeClient, eventId) = await SetupReviewScenarioAsync("DEL");

        var createResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(3, "Meh"));
        var review = await createResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        var deleteResp = await attendeeClient.DeleteAsync(
            $"/api/events/{eventId}/reviews/{review.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);
    }

    [Fact]
    public async Task Delete_OthersReview_Returns403()
    {
        var (_, attendeeClient, eventId) = await SetupReviewScenarioAsync("DOTH");

        var createResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Love it"));
        var review = await createResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        // Another authenticated user tries to delete
        var otherToken = await ApiClient.RegisterAndLoginAsync(
            _client, "OtherDel", "otherdel@rev.test", "Pass!");
        var otherClient = ApiClient.WithToken(_factory, otherToken);

        var response = await otherClient.DeleteAsync(
            $"/api/events/{eventId}/reviews/{review.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── POST /api/events/{eventId}/reviews/{reviewId}/pin ─────────────

    [Fact]
    public async Task Pin_ByHost_Returns204()
    {
        var (hostClient, attendeeClient, eventId) = await SetupReviewScenarioAsync("PIN");

        var createResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Must pin this!"));
        var review = await createResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        var pinResp = await hostClient.PostAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/pin", null);
        Assert.Equal(HttpStatusCode.NoContent, pinResp.StatusCode);

        var reviews = await _client.GetAsync($"/api/events/{eventId}/reviews");
        var list = await reviews.Content.ReadFromJsonAsync<List<ReviewResponse>>();
        Assert.NotNull(list);
        Assert.Contains(list, r => r.Id == review.Id && r.IsPinned);
    }

    [Fact]
    public async Task Pin_ByNonHost_Returns403()
    {
        var (_, attendeeClient, eventId) = await SetupReviewScenarioAsync("PINH");

        var createResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Great event"));
        var review = await createResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        // Attendee tries to pin — should be forbidden
        var response = await attendeeClient.PostAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/pin", null);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── POST /api/events/{eventId}/reviews/{reviewId}/replies ─────────

    [Fact]
    public async Task Reply_Authenticated_Returns201()
    {
        var (hostClient, attendeeClient, eventId) = await SetupReviewScenarioAsync("REP");

        var createResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(4, "Good event"));
        var review = await createResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        // Host replies
        var replyResp = await hostClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/replies",
            new ReviewReplyRequest("Thanks for your feedback!"));

        Assert.Equal(HttpStatusCode.Created, replyResp.StatusCode);
        var reply = await replyResp.Content.ReadFromJsonAsync<ReviewReplyResponse>();
        Assert.NotNull(reply);
        Assert.Equal("Thanks for your feedback!", reply.Comment);
    }

    // ── POST /api/events/{eventId}/reviews/{reviewId}/vote ────────────

    [Fact]
    public async Task Vote_Like_Returns204()
    {
        var (_, attendeeClient, eventId) = await SetupReviewScenarioAsync("VOT");

        var createResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Amazing!"));
        var review = await createResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        // Another authenticated user votes
        var voterToken = await ApiClient.RegisterAndLoginAsync(
            _client, "Voter", "voter@rev.test", "Pass!");
        var voterClient = ApiClient.WithToken(_factory, voterToken);

        var voteResp = await voterClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/vote",
            new VoteRequest(true));

        Assert.Equal(HttpStatusCode.NoContent, voteResp.StatusCode);
    }

    [Fact]
    public async Task Vote_CanUpdateExistingVote_Returns204()
    {
        var (_, attendeeClient, eventId) = await SetupReviewScenarioAsync("VOTU");

        var createResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(2, "Not great"));
        var review = await createResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        var voterToken = await ApiClient.RegisterAndLoginAsync(
            _client, "VoterU", "voteru@rev.test", "Pass!");
        var voterClient = ApiClient.WithToken(_factory, voterToken);

        // Like first
        await voterClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/vote",
            new VoteRequest(true));

        // Then dislike (update)
        var response = await voterClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/vote",
            new VoteRequest(false));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Vote_Unauthenticated_Returns401()
    {
        var (_, attendeeClient, eventId) = await SetupReviewScenarioAsync("VOTNA");

        var createResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(3, "Fine"));
        var review = await createResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        var response = await _client.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/vote",
            new VoteRequest(true));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
