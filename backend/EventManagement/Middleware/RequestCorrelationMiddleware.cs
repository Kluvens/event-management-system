namespace EventManagement.Middleware;

/// <summary>
/// Propagates or generates a correlation ID for each request so that every
/// log line emitted during that request can be tied together in CloudWatch
/// Logs Insights with a single query on CorrelationId.
///
/// Flow:
///   1. Read X-Request-ID from the incoming request (set by load balancer or
///      the calling client).
///   2. If absent, generate a short random ID.
///   3. Echo it back in X-Request-ID on the response.
///   4. Push it into the ILogger scope so every log entry in the pipeline
///      automatically carries { CorrelationId: "..." }.
/// </summary>
public class RequestCorrelationMiddleware(RequestDelegate next, ILogger<RequestCorrelationMiddleware> logger)
{
    private const string Header = "X-Request-ID";

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers[Header].FirstOrDefault()
                            ?? Guid.NewGuid().ToString("N")[..12];

        context.Items["CorrelationId"] = correlationId;
        context.Response.Headers[Header] = correlationId;

        // Inject into ILogger scope — CloudWatch will include it in every
        // structured log entry emitted while the scope is active.
        using (logger.BeginScope(new Dictionary<string, object>
               {
                   ["CorrelationId"] = correlationId,
                   ["RequestPath"]   = context.Request.Path.ToString(),
                   ["RequestMethod"] = context.Request.Method,
               }))
        {
            await next(context);
        }
    }
}
