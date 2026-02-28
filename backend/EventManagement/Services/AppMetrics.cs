namespace EventManagement.Services;

/// <summary>
/// Thin wrapper around ILogger that emits structured business-event log
/// entries in a consistent format.
///
/// Each call logs a JSON-friendly message containing an "EventName" token
/// which CloudWatch Metric Filters can match on, e.g.:
///
///   Pattern: { $.EventName = "LoginFailed" }
///   → CloudWatch metric: LoginFailures (count)
///
/// Usage in controllers:
///   _metrics.LoginFailed(email, reason: "BadPassword");
/// </summary>
public sealed class AppMetrics(ILogger<AppMetrics> logger)
{
    // ── Auth ──────────────────────────────────────────────────────────────

    public void LoginSucceeded(string email) =>
        logger.LogInformation("[METRIC] EventName=LoginSucceeded Email={Email}", email);

    public void LoginFailed(string email, string reason) =>
        logger.LogWarning("[METRIC] EventName=LoginFailed Email={Email} Reason={Reason}", email, reason);

    public void UserRegistered(string email, string role) =>
        logger.LogInformation("[METRIC] EventName=UserRegistered Email={Email} Role={Role}", email, role);

    public void PasswordResetRequested(string email) =>
        logger.LogInformation("[METRIC] EventName=PasswordResetRequested Email={Email}", email);

    // ── Bookings ──────────────────────────────────────────────────────────

    public void BookingCreated(int eventId, int userId, decimal amount) =>
        logger.LogInformation(
            "[METRIC] EventName=BookingCreated EventId={EventId} UserId={UserId} Amount={Amount}",
            eventId, userId, amount);

    public void BookingFailed(int eventId, int userId, string reason) =>
        logger.LogWarning(
            "[METRIC] EventName=BookingFailed EventId={EventId} UserId={UserId} Reason={Reason}",
            eventId, userId, reason);

    public void BookingCancelled(int bookingId, int userId) =>
        logger.LogInformation(
            "[METRIC] EventName=BookingCancelled BookingId={BookingId} UserId={UserId}",
            bookingId, userId);

    // ── Rate limiting ─────────────────────────────────────────────────────

    public void RateLimitHit(string endpoint, string? ip) =>
        logger.LogWarning(
            "[METRIC] EventName=RateLimitHit Endpoint={Endpoint} IP={IP}",
            endpoint, ip ?? "unknown");

    // ── Payouts ───────────────────────────────────────────────────────────

    public void PayoutRequested(int organizerId, decimal amount) =>
        logger.LogInformation(
            "[METRIC] EventName=PayoutRequested OrganizerId={OrganizerId} Amount={Amount}",
            organizerId, amount);

    public void PayoutProcessed(int payoutId, string status, string? adminNotes) =>
        logger.LogInformation(
            "[METRIC] EventName=PayoutProcessed PayoutId={PayoutId} Status={Status} Notes={Notes}",
            payoutId, status, adminNotes ?? "none");

    // ── Events ────────────────────────────────────────────────────────────

    public void EventCreated(int eventId, int organizerId, string title) =>
        logger.LogInformation(
            "[METRIC] EventName=EventCreated EventId={EventId} OrganizerId={OrganizerId} Title={Title}",
            eventId, organizerId, title);

    public void EventPublished(int eventId) =>
        logger.LogInformation("[METRIC] EventName=EventPublished EventId={EventId}", eventId);
}
