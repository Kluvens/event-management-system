# Contributing Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Branch Naming](#branch-naming)
3. [Commit Messages](#commit-messages)
4. [Pull Requests](#pull-requests)
5. [Code Review](#code-review)
6. [Testing Requirements](#testing-requirements)
7. [Definition of Done](#definition-of-done)

---

## Getting Started

1. Clone the repository and install dependencies:
   ```bash
   git clone <repo-url>
   cd event-management-system

   # Frontend
   cd frontend && npm install

   # Backend (restore packages)
   cd ../backend && dotnet restore
   ```
2. Copy environment files and fill in secrets:
   ```bash
   cp frontend/.env.example frontend/.env
   cp backend/EventManagement/appsettings.Development.json.example backend/EventManagement/appsettings.Development.json
   ```
3. Make sure all existing tests pass before you start:
   ```bash
   cd backend && dotnet test
   ```

---

## Branch Naming

Branches **must** follow this pattern:

```
<type>/<short-description>
```

| Type | When to use |
|---|---|
| `feat` | New feature or user-facing capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructure with no behaviour change |
| `test` | Adding or updating tests only |
| `chore` | Build scripts, dependencies, tooling, CI |
| `style` | Formatting / whitespace only (no logic changes) |

**Rules:**
- Use **kebab-case** for the description (`feat/add-waitlist-notifications`, not `feat/AddWaitlistNotifications`).
- Keep descriptions short — 3–5 words max.
- Always branch off the latest `main`.

**Examples:**
```
feat/qr-check-in-scanner
fix/booking-cancellation-deadline
docs/api-authentication
refactor/loyalty-tier-calculation
test/admin-controller-coverage
chore/upgrade-ef-core-9
```

---

## Commit Messages

Follow the **Conventional Commits** specification.

```
<type>(<optional scope>): <short summary>

<optional body — explain WHY, not WHAT>

<optional footer — breaking changes, issue refs>
```

**Rules:**
- Summary line: imperative mood, no capital first letter, no trailing period, ≤ 72 characters.
- Body: wrap at 72 characters, explain the motivation and contrast with prior behaviour.
- Use `BREAKING CHANGE:` in the footer when a public API or DB schema changes in a non-backwards-compatible way.

**Examples:**
```
feat(bookings): enforce 7-day cancellation window

Attendees can no longer cancel within 7 days of the event start time
unless the event itself was cancelled. This protects organiser revenue.

fix(auth): return 401 instead of 500 on expired JWT

refactor(events): extract visibility filter into helper method

chore: upgrade xUnit to 2.9 and fix test runner warnings
```

---

## Pull Requests

### Before Opening

- [ ] Branch is up to date with `main` (`git pull --rebase origin main`).
- [ ] All tests pass locally (`dotnet test`).
- [ ] New code has accompanying tests (see [Testing Requirements](#testing-requirements)).
- [ ] No debug code, commented-out blocks, or `TODO`s left in the diff.

### Title

Use the same format as a commit message summary:

```
feat(organizers): add subscriber count to public profile
fix(bookings): prevent double-booking on concurrent requests
```

### Description Template

```markdown
## What
<!-- One paragraph describing what changed. -->

## Why
<!-- The motivation — link to a user story, bug report, or design decision. -->

## How
<!-- Brief notes on the approach taken, especially non-obvious decisions. -->

## Testing
<!-- What tests were added or updated, and how to verify manually if needed. -->

## Checklist
- [ ] Tests added / updated
- [ ] Docs updated (if behaviour or API changed)
- [ ] No breaking changes (or BREAKING CHANGE footer added to commit)
```

### Size

- Keep PRs focused. One logical change per PR.
- If a PR exceeds ~400 lines of meaningful diff, consider splitting it.

---

## Code Review

### As an Author

- Respond to all review comments — either address them or explain why you disagree.
- Mark resolved threads as resolved only after you have made the change.
- Do not force-push once a review is in progress unless explicitly agreed.

### As a Reviewer

- Approve only when you are confident the change is correct, tested, and consistent with the style guide.
- Use the following prefixes in comments to signal intent:
  - **`nit:`** — minor style preference, not blocking.
  - **`question:`** — seeking understanding, not necessarily requesting a change.
  - **`suggestion:`** — optional improvement.
  - *(No prefix)* — blocking issue that must be resolved before merge.
- At least **one approval** is required before merging.
- The author should not merge their own PR unless explicitly permitted for a hotfix.

---

## Testing Requirements

All new features and bug fixes **must** ship with tests. See [ARCHITECTURE.md](ARCHITECTURE.md) for the overall testing strategy and the `backend/EventManagement.Tests/` project for patterns.

| Change type | Required test |
|---|---|
| New API endpoint | Integration test via `WebApplicationFactory` |
| New business rule | Integration test covering both happy path and violation |
| Bug fix | Regression test that would have failed before the fix |
| Pure logic / utility | Unit test |
| Frontend component | — (Vitest / RTL tests welcomed but not yet mandatory) |

Run the full test suite before pushing:
```bash
cd backend && dotnet test --logger "console;verbosity=normal"
```

---

## Definition of Done

A task is considered complete when **all** of the following are true:

- [ ] Feature works end-to-end against the local dev environment.
- [ ] All existing tests pass.
- [ ] New tests cover the added behaviour.
- [ ] Relevant documentation in `docs/` is updated (API reference, architecture, etc.).
- [ ] PR has been reviewed and approved.
- [ ] Branch is merged into `main` and the feature branch deleted.
