namespace EventManagement.Models;

public class Tag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<EventTag> EventTags { get; set; } = new List<EventTag>();
}
