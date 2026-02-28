namespace EventManagement.Models;

public class PayoutRequest
{
    public int Id { get; set; }
    public int OrganizerId { get; set; }
    public User Organizer { get; set; } = null!;

    /// <summary>Amount the organiser is requesting, in AUD.</summary>
    public decimal Amount { get; set; }

    /// <summary>Bank/PayPal/etc. details provided by the organiser.</summary>
    public string BankDetails { get; set; } = string.Empty;

    /// <summary>Pending | Approved | Rejected</summary>
    public string Status { get; set; } = "Pending";

    /// <summary>Admin notes shown back to the organiser.</summary>
    public string? AdminNotes { get; set; }

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
}
