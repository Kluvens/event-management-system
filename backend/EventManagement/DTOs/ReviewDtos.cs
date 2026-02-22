namespace EventManagement.DTOs;

public record CreateReviewRequest(int Rating, string Comment);

public record ReviewReplyRequest(string Comment);

public record VoteRequest(bool IsLike);

public record ReviewReplyResponse(
    int Id,
    int UserId,
    string UserName,
    string Comment,
    DateTime CreatedAt
);

public record ReviewResponse(
    int Id,
    int EventId,
    int UserId,
    string UserName,
    int Rating,
    string Comment,
    bool IsPinned,
    int Likes,
    int Dislikes,
    DateTime CreatedAt,
    List<ReviewReplyResponse> Replies
);
