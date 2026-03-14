# Security Policy

## Supported Versions

Only the latest version on the `main` branch receives security fixes.

| Version | Supported |
|---------|-----------|
| `main`  | ✅ Yes    |
| older   | ❌ No     |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately by emailing:

**yangjiapeng6888@gmail.com**

Include in your report:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Any suggested mitigations (optional)

You can expect an acknowledgement within **48 hours** and a resolution timeline within **7 days** for critical issues. We will keep you informed as the fix progresses and credit you in the release notes (unless you prefer to remain anonymous).

## Scope

The following are in scope:
- Authentication and authorisation bypass
- SQL injection or data exposure
- Sensitive data leakage (tokens, PII, booking details)
- Server-Side Request Forgery (SSRF)
- Cross-Site Scripting (XSS) or Cross-Site Request Forgery (CSRF)

The following are **out of scope**:
- Vulnerabilities in third-party dependencies that have no available fix
- Rate limiting or denial-of-service issues on local/development environments
- Social engineering attacks

## Security Best Practices for Contributors

- Never commit secrets, API keys, or connection strings — use environment variables and `.env` files (which are `.gitignore`d).
- Follow the [OWASP Top 10](https://owasp.org/www-project-top-ten/) when writing code that handles user input or authentication.
- All new API endpoints must be covered by integration tests that verify correct authorisation behaviour.
