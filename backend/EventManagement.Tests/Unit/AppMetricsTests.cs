using EventManagement.Services;
using Microsoft.Extensions.Logging;
using Xunit;

namespace EventManagement.Tests.Unit;

/// <summary>
/// Unit tests for <see cref="AppMetrics"/>.
///
/// Because AppMetrics is a thin structured-logging wrapper we verify:
///   1. Each method emits exactly one log entry at the expected level.
///   2. The emitted message contains the expected [METRIC] marker and EventName token,
///      so that CloudWatch Metric Filters can match on them.
/// </summary>
public sealed class AppMetricsTests
{
    // ── Minimal capturing logger ──────────────────────────────────────────

    private sealed class CapturedLog(LogLevel level, string message)
    {
        public LogLevel Level   { get; } = level;
        public string   Message { get; } = message;
    }

    private sealed class CapturingLogger : ILogger<AppMetrics>
    {
        public List<CapturedLog> Logs { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel, EventId eventId, TState state,
            Exception? exception, Func<TState, Exception?, string> formatter)
        {
            Logs.Add(new CapturedLog(logLevel, formatter(state, exception)));
        }
    }

    private readonly CapturingLogger _logger = new();
    private AppMetrics CreateMetrics() => new(_logger);

    // ── Auth ──────────────────────────────────────────────────────────────

    [Fact]
    public void LoginSucceeded_EmitsInfoWithEventName()
    {
        var metrics = CreateMetrics();
        metrics.LoginSucceeded("user@example.com");

        var log = Assert.Single(_logger.Logs);
        Assert.Equal(LogLevel.Information, log.Level);
        Assert.Contains("[METRIC]",           log.Message);
        Assert.Contains("LoginSucceeded",     log.Message);
        Assert.Contains("user@example.com",   log.Message);
    }

    [Fact]
    public void LoginFailed_EmitsWarningWithReasonAndEmail()
    {
        var metrics = CreateMetrics();
        metrics.LoginFailed("bad@test.com", "BadPassword");

        var log = Assert.Single(_logger.Logs);
        Assert.Equal(LogLevel.Warning, log.Level);
        Assert.Contains("[METRIC]",       log.Message);
        Assert.Contains("LoginFailed",    log.Message);
        Assert.Contains("bad@test.com",   log.Message);
        Assert.Contains("BadPassword",    log.Message);
    }

    [Fact]
    public void UserRegistered_EmitsInfoWithEmailAndRole()
    {
        var metrics = CreateMetrics();
        metrics.UserRegistered("new@test.com", "Attendee");

        var log = Assert.Single(_logger.Logs);
        Assert.Equal(LogLevel.Information, log.Level);
        Assert.Contains("UserRegistered",  log.Message);
        Assert.Contains("new@test.com",    log.Message);
        Assert.Contains("Attendee",        log.Message);
    }

    [Fact]
    public void PasswordResetRequested_EmitsInfoWithEmail()
    {
        var metrics = CreateMetrics();
        metrics.PasswordResetRequested("reset@test.com");

        var log = Assert.Single(_logger.Logs);
        Assert.Equal(LogLevel.Information, log.Level);
        Assert.Contains("PasswordResetRequested", log.Message);
        Assert.Contains("reset@test.com",          log.Message);
    }

    // ── Bookings ──────────────────────────────────────────────────────────

    [Fact]
    public void BookingCreated_EmitsInfoWithEventIdUserIdAmount()
    {
        var metrics = CreateMetrics();
        metrics.BookingCreated(42, 7, 99.50m);

        var log = Assert.Single(_logger.Logs);
        Assert.Equal(LogLevel.Information, log.Level);
        Assert.Contains("[METRIC]",       log.Message);
        Assert.Contains("BookingCreated", log.Message);
        Assert.Contains("42",             log.Message);
        Assert.Contains("7",              log.Message);
        Assert.Contains("99.50",          log.Message);
    }

    [Fact]
    public void BookingFailed_EmitsWarningWithReason()
    {
        var metrics = CreateMetrics();
        metrics.BookingFailed(5, 3, "SoldOut");

        var log = Assert.Single(_logger.Logs);
        Assert.Equal(LogLevel.Warning, log.Level);
        Assert.Contains("BookingFailed", log.Message);
        Assert.Contains("SoldOut",       log.Message);
    }

    [Fact]
    public void BookingCancelled_EmitsInfoWithBookingAndUser()
    {
        var metrics = CreateMetrics();
        metrics.BookingCancelled(10, 2);

        var log = Assert.Single(_logger.Logs);
        Assert.Equal(LogLevel.Information, log.Level);
        Assert.Contains("BookingCancelled", log.Message);
        Assert.Contains("10",               log.Message);
        Assert.Contains("2",                log.Message);
    }

    // ── Rate limiting ─────────────────────────────────────────────────────

    [Fact]
    public void RateLimitHit_EmitsWarningWithEndpointAndIp()
    {
        var metrics = CreateMetrics();
        metrics.RateLimitHit("/api/events", "1.2.3.4");

        var log = Assert.Single(_logger.Logs);
        Assert.Equal(LogLevel.Warning, log.Level);
        Assert.Contains("[METRIC]",    log.Message);
        Assert.Contains("RateLimitHit", log.Message);
        Assert.Contains("/api/events", log.Message);
        Assert.Contains("1.2.3.4",     log.Message);
    }

    [Fact]
    public void RateLimitHit_NullIp_SubstitutesUnknown()
    {
        var metrics = CreateMetrics();
        metrics.RateLimitHit("/api/events", null);

        var log = Assert.Single(_logger.Logs);
        Assert.Contains("unknown", log.Message);
    }

    // ── Payouts ───────────────────────────────────────────────────────────

    [Fact]
    public void PayoutRequested_EmitsInfoWithOrganizerIdAndAmount()
    {
        var metrics = CreateMetrics();
        metrics.PayoutRequested(99, 1500m);

        var log = Assert.Single(_logger.Logs);
        Assert.Equal(LogLevel.Information, log.Level);
        Assert.Contains("[METRIC]",         log.Message);
        Assert.Contains("PayoutRequested",  log.Message);
        Assert.Contains("99",               log.Message);
        Assert.Contains("1500",             log.Message);
    }

    [Fact]
    public void PayoutProcessed_Approved_EmitsInfoWithStatus()
    {
        var metrics = CreateMetrics();
        metrics.PayoutProcessed(7, "Approved", "Bank transfer sent");

        var log = Assert.Single(_logger.Logs);
        Assert.Equal(LogLevel.Information, log.Level);
        Assert.Contains("PayoutProcessed",    log.Message);
        Assert.Contains("Approved",           log.Message);
        Assert.Contains("Bank transfer sent", log.Message);
    }

    [Fact]
    public void PayoutProcessed_NullNotes_SubstitutesNone()
    {
        var metrics = CreateMetrics();
        metrics.PayoutProcessed(8, "Rejected", null);

        var log = Assert.Single(_logger.Logs);
        Assert.Contains("none", log.Message);
    }

    // ── Events ────────────────────────────────────────────────────────────

    [Fact]
    public void EventCreated_EmitsInfoWithEventIdOrganizerIdTitle()
    {
        var metrics = CreateMetrics();
        metrics.EventCreated(100, 5, "My Conference");

        var log = Assert.Single(_logger.Logs);
        Assert.Equal(LogLevel.Information, log.Level);
        Assert.Contains("EventCreated",  log.Message);
        Assert.Contains("100",           log.Message);
        Assert.Contains("5",             log.Message);
        Assert.Contains("My Conference", log.Message);
    }

    [Fact]
    public void EventPublished_EmitsInfoWithEventId()
    {
        var metrics = CreateMetrics();
        metrics.EventPublished(200);

        var log = Assert.Single(_logger.Logs);
        Assert.Equal(LogLevel.Information, log.Level);
        Assert.Contains("EventPublished", log.Message);
        Assert.Contains("200",            log.Message);
    }

    // ── Each call emits exactly one log entry ─────────────────────────────

    [Fact]
    public void EachMethod_EmitsExactlyOneLogEntry()
    {
        var metrics = CreateMetrics();

        metrics.LoginSucceeded("a@b.com");
        Assert.Single(_logger.Logs);

        metrics.LoginFailed("b@b.com", "Wrong");
        Assert.Equal(2, _logger.Logs.Count);

        metrics.BookingCreated(1, 1, 10m);
        Assert.Equal(3, _logger.Logs.Count);
    }
}
