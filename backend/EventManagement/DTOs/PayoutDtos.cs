namespace EventManagement.DTOs;

public record PayoutRequestResponse(
    int Id,
    decimal Amount,
    string BankDetails,
    string Status,
    string? AdminNotes,
    DateTime RequestedAt,
    DateTime? ProcessedAt
);

public record AdminPayoutResponse(
    int Id,
    int OrganizerId,
    string OrganizerName,
    decimal Amount,
    string BankDetails,
    string Status,
    string? AdminNotes,
    DateTime RequestedAt,
    DateTime? ProcessedAt
);

public record CreatePayoutRequestRequest(decimal Amount, string BankDetails);

public record ProcessPayoutRequest(string Status, string? AdminNotes);
