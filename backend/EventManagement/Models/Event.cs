namespace EventManagement.Models;

public class Event
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int Capacity { get; set; }
    public decimal Price { get; set; } = 0;
    public bool IsPublic { get; set; } = true;
    // "Draft" | "Published" | "Cancelled" | "Postponed"
    public string Status { get; set; } = "Draft";
    public bool IsSuspended { get; set; } = false;
    public DateTime? PostponedDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;

    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<EventTag> EventTags { get; set; } = new List<EventTag>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();
}
