namespace EventManagement.Models;

public class ReviewVote
{
    public int ReviewId { get; set; }
    public Review Review { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public bool IsLike { get; set; }
}
