namespace EventManagement.Middleware;

/// <summary>
/// Adds defensive HTTP security headers to every response:
///   - X-Content-Type-Options   – prevents MIME sniffing
///   - X-Frame-Options           – blocks clickjacking
///   - X-XSS-Protection          – legacy XSS filter (belt-and-braces)
///   - Referrer-Policy           – limits referrer leakage
///   - Permissions-Policy        – disables unnecessary browser features
///   - Strict-Transport-Security – enforces HTTPS (only sent over HTTPS)
/// </summary>
public class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;

        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"]        = "DENY";
        headers["X-XSS-Protection"]       = "1; mode=block";
        headers["Referrer-Policy"]        = "strict-origin-when-cross-origin";
        headers["Permissions-Policy"]     = "geolocation=(), microphone=(), camera=()";

        // HSTS: only meaningful when the connection is already HTTPS
        if (context.Request.IsHttps)
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";

        await next(context);
    }
}
