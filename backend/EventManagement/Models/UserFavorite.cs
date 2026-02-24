namespace EventManagement.Models;

public class UserFavorite
{
    public int UserId  { get; set; }
    public User User   { get; set; } = null!;

    public int EventId  { get; set; }
    public Event Event  { get; set; } = null!;

    public DateTime SavedAt { get; set; } = DateTime.UtcNow;
}
