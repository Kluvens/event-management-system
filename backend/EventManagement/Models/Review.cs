namespace EventManagement.Models;

public class Review
{
    public int Id { get; set; }
    public int Rating { get; set; }  // 1–5
    public string Comment { get; set; } = string.Empty;
    public bool IsPinned { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int EventId { get; set; }
    public Event Event { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public ICollection<ReviewReply> Replies { get; set; } = new List<ReviewReply>();
    public ICollection<ReviewVote> Votes { get; set; } = new List<ReviewVote>();
}
