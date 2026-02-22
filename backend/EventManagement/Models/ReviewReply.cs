namespace EventManagement.Models;

public class ReviewReply
{
    public int Id { get; set; }
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int ReviewId { get; set; }
    public Review Review { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;
}
