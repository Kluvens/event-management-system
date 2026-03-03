using System.Net;
using System.Net.Http.Json;
using EventManagement.DTOs;
using EventManagement.Tests.Helpers;
using Xunit;

namespace EventManagement.Tests.Integration;

/// <summary>
/// Extended integration tests for the reviews system covering gaps not addressed
/// by ReviewsControllerTests.cs:
/// - Sort ordering (lowest/highest/default-newest) with pinned-first guarantee
/// - Vote counts reflected in GET response after casting and toggling votes
/// - Reply authorization (attendees and anonymous users must be rejected)
/// - Duplicate reply returns 409
/// - Pinning a second review automatically unpins the first
/// - Rating boundary values (0 and 6 rejected; 1 and 5 accepted)
/// - Deleted reviews disappear from the GET list
/// - Anonymous users can always read reviews
/// </summary>
public sealed class ReviewsControllerExtendedTests : IDisposable
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ReviewsControllerExtendedTests()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        GC.SuppressFinalize(this);
    }

    /// <summary>
    /// Creates a completed past event and seeds one confirmed attendee booking.
    /// The event is initially created with future dates (so booking validation passes),
    /// then backdated via the database to simulate a completed event.
    /// Returns authenticated clients for both host and attendee plus the event id.
    /// </summary>
    private async Task<(HttpClient host, HttpClient attendee, int eventId)>
        SetupAsync(string suffix)
    {
        var hostToken = await ApiClient.RegisterAndLoginAsync(
            _client, $"RXHost{suffix}", $"rxhost{suffix}@rx.test", "Pass!");
        var hostClient = ApiClient.WithToken(_factory, hostToken);

        // Create with FUTURE dates so booking API allows it
        var createResp = await hostClient.PostAsJsonAsync("/api/events",
            new CreateEventRequest(
                $"Past Event {suffix}", "A past event", "Melbourne",
                DateTime.UtcNow.AddDays(30),
                DateTime.UtcNow.AddDays(30).AddHours(2),
                100, 0m, true, 1, null, null));
        var ev = await createResp.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(ev);
        await hostClient.PostAsync($"/api/events/{ev.Id}/publish", null);

        // Seed booking directly + backdate event to past
        var (attendeeToken, attendeeId) = await ApiClient.RegisterAndGetIdAsync(
            _client, $"RXAtt{suffix}", $"rxatt{suffix}@rx.test", "Pass!");
        var attendeeClient = ApiClient.WithToken(_factory, attendeeToken);

        await ApiClient.SeedDirectBookingAsync(_factory, attendeeId, ev.Id);
        await ApiClient.BackdateEventAsync(_factory, ev.Id);

        return (hostClient, attendeeClient, ev.Id);
    }

    // ── sort ordering ─────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_SortLowest_ReturnsPinnedFirstThenAscendingRating()
    {
        var (hostClient, attendeeClient, eventId) = await SetupAsync("SORTLO");

        // First review: 5 stars
        await attendeeClient.PostAsJsonAsync($"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Perfect!"));

        // Second attendee: 2 stars (will be pinned)
        var (att2Token, att2Id) = await ApiClient.RegisterAndGetIdAsync(
            _client, "RXAtt2SORTLO", "rxatt2sortlo@rx.test", "Pass!");
        var att2Client = ApiClient.WithToken(_factory, att2Token);
        await ApiClient.SeedDirectBookingAsync(_factory, att2Id, eventId);

        var r2Resp = await att2Client.PostAsJsonAsync($"/api/events/{eventId}/reviews",
            new CreateReviewRequest(2, "Not great"));
        var r2 = await r2Resp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(r2);

        // Host pins the 2-star review
        await hostClient.PostAsync($"/api/events/{eventId}/reviews/{r2.Id}/pin", null);

        var response = await _client.GetAsync($"/api/events/{eventId}/reviews?sort=lowest");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var reviews = await response.Content.ReadFromJsonAsync<List<ReviewResponse>>();
        Assert.NotNull(reviews);
        Assert.Equal(2, reviews.Count);
        // Pinned review always comes first regardless of rating
        Assert.True(reviews[0].IsPinned);
        Assert.Equal(r2.Id, reviews[0].Id);
        // Remaining reviews in ascending order
        Assert.Equal(5, reviews[1].Rating);
    }

    [Fact]
    public async Task GetAll_SortHighest_ReturnsHighestRatingFirst()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("SORTHI");

        await attendeeClient.PostAsJsonAsync($"/api/events/{eventId}/reviews",
            new CreateReviewRequest(2, "Below average"));

        var (att2Token, att2Id) = await ApiClient.RegisterAndGetIdAsync(
            _client, "RXAtt2SORTHI", "rxatt2sorthi@rx.test", "Pass!");
        var att2Client = ApiClient.WithToken(_factory, att2Token);
        await ApiClient.SeedDirectBookingAsync(_factory, att2Id, eventId);
        await att2Client.PostAsJsonAsync($"/api/events/{eventId}/reviews",
            new CreateReviewRequest(4, "Pretty good"));

        var response = await _client.GetAsync($"/api/events/{eventId}/reviews?sort=highest");

        var reviews = await response.Content.ReadFromJsonAsync<List<ReviewResponse>>();
        Assert.NotNull(reviews);
        Assert.Equal(2, reviews.Count);
        Assert.Equal(4, reviews[0].Rating);
        Assert.Equal(2, reviews[1].Rating);
    }

    [Fact]
    public async Task GetAll_DefaultSort_ReturnsNewestFirst()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("SORTDF");

        var r1Resp = await attendeeClient.PostAsJsonAsync($"/api/events/{eventId}/reviews",
            new CreateReviewRequest(3, "First review"));
        var r1 = await r1Resp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(r1);

        // Small delay to ensure different CreatedAt timestamps in SQLite
        await Task.Delay(20);

        var (att2Token, att2Id) = await ApiClient.RegisterAndGetIdAsync(
            _client, "RXAtt2SORTDF", "rxatt2sortdf@rx.test", "Pass!");
        var att2Client = ApiClient.WithToken(_factory, att2Token);
        await ApiClient.SeedDirectBookingAsync(_factory, att2Id, eventId);

        var r2Resp = await att2Client.PostAsJsonAsync($"/api/events/{eventId}/reviews",
            new CreateReviewRequest(4, "Newer review"));
        var r2 = await r2Resp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(r2);

        // No sort param — should default to newest first
        var response = await _client.GetAsync($"/api/events/{eventId}/reviews");

        var reviews = await response.Content.ReadFromJsonAsync<List<ReviewResponse>>();
        Assert.NotNull(reviews);
        Assert.Equal(2, reviews.Count);
        // The second-created review (r2) should appear first
        Assert.Equal(r2.Id, reviews[0].Id);
    }

    // ── vote counts in GET response ───────────────────────────────────

    [Fact]
    public async Task Vote_LikesCount_ReflectedInGetReviews()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("VCNT");

        var reviewResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Great!"));
        var review = await reviewResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        // Two distinct users like the review
        for (var i = 1; i <= 2; i++)
        {
            var voterToken = await ApiClient.RegisterAndLoginAsync(
                _client, $"Voter{i}VCNT", $"voter{i}vcnt@rx.test", "Pass!");
            var voterClient = ApiClient.WithToken(_factory, voterToken);
            await voterClient.PostAsJsonAsync(
                $"/api/events/{eventId}/reviews/{review.Id}/vote",
                new VoteRequest(true));
        }

        var response = await _client.GetAsync($"/api/events/{eventId}/reviews");

        var reviews = await response.Content.ReadFromJsonAsync<List<ReviewResponse>>();
        Assert.NotNull(reviews);
        var fetched = Assert.Single(reviews);
        Assert.Equal(2, fetched.Likes);
        Assert.Equal(0, fetched.Dislikes);
    }

    [Fact]
    public async Task Vote_Toggle_LikeToDislike_CorrectlyUpdatesCounters()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("VTOG");

        var reviewResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(4, "Good"));
        var review = await reviewResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        var voterToken = await ApiClient.RegisterAndLoginAsync(
            _client, "VoterTOG", "votertog@rx.test", "Pass!");
        var voterClient = ApiClient.WithToken(_factory, voterToken);

        // Like first
        await voterClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/vote",
            new VoteRequest(true));

        // Switch to dislike — same voter, same review
        await voterClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/vote",
            new VoteRequest(false));

        var response = await _client.GetAsync($"/api/events/{eventId}/reviews");
        var reviews = await response.Content.ReadFromJsonAsync<List<ReviewResponse>>();
        Assert.NotNull(reviews);
        var fetched = Assert.Single(reviews);
        // The vote was updated: likes must be 0, dislikes must be 1
        Assert.Equal(0, fetched.Likes);
        Assert.Equal(1, fetched.Dislikes);
    }

    [Fact]
    public async Task Vote_MultipleVoters_CountsAreIndependent()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("VMULTI");

        var reviewResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(3, "OK"));
        var review = await reviewResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        // 3 likes, 2 dislikes from 5 distinct voters
        for (var i = 1; i <= 3; i++)
        {
            var t = await ApiClient.RegisterAndLoginAsync(
                _client, $"LikerVMULTI{i}", $"likervmulti{i}@rx.test", "Pass!");
            var c = ApiClient.WithToken(_factory, t);
            await c.PostAsJsonAsync(
                $"/api/events/{eventId}/reviews/{review.Id}/vote",
                new VoteRequest(true));
        }

        for (var i = 1; i <= 2; i++)
        {
            var t = await ApiClient.RegisterAndLoginAsync(
                _client, $"DislikerVMULTI{i}", $"dislikervmulti{i}@rx.test", "Pass!");
            var c = ApiClient.WithToken(_factory, t);
            await c.PostAsJsonAsync(
                $"/api/events/{eventId}/reviews/{review.Id}/vote",
                new VoteRequest(false));
        }

        var response = await _client.GetAsync($"/api/events/{eventId}/reviews");
        var reviews = await response.Content.ReadFromJsonAsync<List<ReviewResponse>>();
        Assert.NotNull(reviews);
        var fetched = Assert.Single(reviews);
        Assert.Equal(3, fetched.Likes);
        Assert.Equal(2, fetched.Dislikes);
    }

    // ── reply authorization ───────────────────────────────────────────

    [Fact]
    public async Task Reply_ByRandomAuthenticatedUser_Returns403()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("REPAUTH");

        var reviewResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(3, "Decent"));
        var review = await reviewResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        var randToken = await ApiClient.RegisterAndLoginAsync(
            _client, "RandREPAUTH", "randrepauth@rx.test", "Pass!");
        var randClient = ApiClient.WithToken(_factory, randToken);

        var response = await randClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/replies",
            new ReviewReplyRequest("Unauthorised reply attempt"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Reply_Unauthenticated_Returns401()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("REPNA");

        var reviewResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(4, "Nice"));
        var review = await reviewResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        // Anonymous POST (no bearer token)
        var response = await _client.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/replies",
            new ReviewReplyRequest("Anonymous reply attempt"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Reply_Duplicate_ByHost_Returns409()
    {
        var (hostClient, attendeeClient, eventId) = await SetupAsync("REPDP");

        var reviewResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Excellent"));
        var review = await reviewResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        // First reply succeeds
        var first = await hostClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/replies",
            new ReviewReplyRequest("Thank you!"));
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        // Second reply from same host must be rejected
        var second = await hostClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/replies",
            new ReviewReplyRequest("Another reply attempt"));
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Reply_ByHost_AppearsInGetReviews()
    {
        var (hostClient, attendeeClient, eventId) = await SetupAsync("REPVIS");

        var reviewResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(4, "Solid event"));
        var review = await reviewResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        await hostClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews/{review.Id}/replies",
            new ReviewReplyRequest("Thanks for coming!"));

        var response = await _client.GetAsync($"/api/events/{eventId}/reviews");
        var reviews = await response.Content.ReadFromJsonAsync<List<ReviewResponse>>();
        Assert.NotNull(reviews);
        var fetched = Assert.Single(reviews);
        Assert.Single(fetched.Replies);
        Assert.Equal("Thanks for coming!", fetched.Replies[0].Comment);
    }

    // ── only one pinned review at a time ─────────────────────────────

    [Fact]
    public async Task Pin_SecondReview_AutomaticallyUnpinsFirst()
    {
        var (hostClient, attendeeClient, eventId) = await SetupAsync("PIN2");

        var r1Resp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(3, "Meh"));
        var r1 = await r1Resp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(r1);

        var (att2Token, att2Id) = await ApiClient.RegisterAndGetIdAsync(
            _client, "RXAtt2PIN2", "rxatt2pin2@rx.test", "Pass!");
        var att2Client = ApiClient.WithToken(_factory, att2Token);
        await ApiClient.SeedDirectBookingAsync(_factory, att2Id, eventId);

        var r2Resp = await att2Client.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Fantastic!"));
        var r2 = await r2Resp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(r2);

        // Pin r1 first, then pin r2
        await hostClient.PostAsync($"/api/events/{eventId}/reviews/{r1.Id}/pin", null);
        await hostClient.PostAsync($"/api/events/{eventId}/reviews/{r2.Id}/pin", null);

        var response = await _client.GetAsync($"/api/events/{eventId}/reviews");
        var reviews = await response.Content.ReadFromJsonAsync<List<ReviewResponse>>();
        Assert.NotNull(reviews);
        // Exactly one pinned review
        var pinned = reviews.Where(r => r.IsPinned).ToList();
        Assert.Single(pinned);
        Assert.Equal(r2.Id, pinned[0].Id);
    }

    // ── rating boundary values ────────────────────────────────────────

    [Fact]
    public async Task Create_RatingZero_Returns400()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("RATZERO");

        var response = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(0, "Zero stars"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_RatingOne_Returns201()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("RATONE");

        var response = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(1, "Terrible experience"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Create_RatingFive_Returns201()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("RATFIVE");

        var response = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Perfect event!"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Create_RatingSix_Returns400()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("RATSIX");

        var response = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(6, "Six stars somehow"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── anonymous read access ─────────────────────────────────────────

    [Fact]
    public async Task GetAll_Anonymous_CanReadReviews()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("ANON");

        await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(4, "Public review"));

        // No auth header — anonymous GET
        var response = await _client.GetAsync($"/api/events/{eventId}/reviews");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var reviews = await response.Content.ReadFromJsonAsync<List<ReviewResponse>>();
        Assert.NotNull(reviews);
        var fetched = Assert.Single(reviews);
        Assert.Equal("Public review", fetched.Comment);
    }

    // ── deleted reviews disappear ─────────────────────────────────────

    [Fact]
    public async Task Delete_OwnReview_RemovedFromGetList()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("DELCHECK");

        var reviewResp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(4, "Will be deleted"));
        var review = await reviewResp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(review);

        await attendeeClient.DeleteAsync($"/api/events/{eventId}/reviews/{review.Id}");

        var response = await _client.GetAsync($"/api/events/{eventId}/reviews");
        var reviews = await response.Content.ReadFromJsonAsync<List<ReviewResponse>>();
        Assert.NotNull(reviews);
        Assert.Empty(reviews);
    }

    [Fact]
    public async Task Delete_OwnReview_AllowsNewReviewOnSameEvent()
    {
        var (_, attendeeClient, eventId) = await SetupAsync("REDEL");

        // Submit and delete a review
        var r1Resp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(2, "Changed my mind"));
        var r1 = await r1Resp.Content.ReadFromJsonAsync<ReviewResponse>();
        Assert.NotNull(r1);
        await attendeeClient.DeleteAsync($"/api/events/{eventId}/reviews/{r1.Id}");

        // Should be able to submit a new review after deleting the old one
        var r2Resp = await attendeeClient.PostAsJsonAsync(
            $"/api/events/{eventId}/reviews",
            new CreateReviewRequest(5, "Actually it was great!"));

        Assert.Equal(HttpStatusCode.Created, r2Resp.StatusCode);
    }
}
