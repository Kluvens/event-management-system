# Architecture & System Design

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Domain Model](#domain-model)
5. [API Design](#api-design)
6. [Authentication & Authorization](#authentication--authorization)
7. [Business Logic](#business-logic)
8. [Database Design](#database-design)
9. [Data Flow](#data-flow)
10. [Testing Strategy](#testing-strategy)

---

## Overview

The Event Management System is a full-stack web application consisting of:

- **Backend** — a RESTful API built with ASP.NET Core 9, supporting a full event lifecycle from creation through booking, attendance, and post-event review, with a multi-tier role system, organiser dashboard, and admin control panel.
- **Frontend** — a React 18 SPA (Vite + TypeScript) that consumes the REST API with role-aware routing, TanStack Query for server state, and shadcn/ui components.

For detailed documentation see:
- [FRONTEND.md](FRONTEND.md) — frontend architecture, routing, state management, dev guide
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) — full table definitions, ER diagram, design decisions

---

## Technology Stack

### Backend

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | .NET 9 / C# 13 | Performance improvements, minimal APIs friendly |
| Web framework | ASP.NET Core MVC (Controllers) | Attribute-based routing, model binding, DI |
| ORM | Entity Framework Core 9 | Code-first migrations, LINQ queries |
| Database | SQLite (dev) | Zero-config, portable, file-based |
| Auth | JWT Bearer (HS256) | Stateless, standard, easy to validate |
| Password hashing | BCrypt.Net-Next | Adaptive cost, industry standard |
| Testing | xUnit + `WebApplicationFactory` | In-process integration testing with real HTTP |
| Test database | In-memory SQLite | Isolated, fast, schema-faithful |

### Frontend

| Concern | Technology | Rationale |
|---|---|---|
| Build tool | Vite 6 | Fast HMR, path alias, dev proxy |
| Framework | React 18 + TypeScript (strict) | Component model, type safety |
| Routing | React Router DOM v6 | Declarative nested routes, `createBrowserRouter` |
| Server state | TanStack Query v5 | Caching, background sync, optimistic updates |
| Client state | Zustand v5 | Minimal boilerplate; `getState()` accessible outside React |
| UI components | shadcn/ui + Radix UI | Accessible, unstyled primitives + Tailwind CSS |
| Forms | react-hook-form + Zod | Type-safe validation, minimal re-renders |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                React SPA (Vite + TypeScript)            │
│   React Router │ TanStack Query │ Zustand │ shadcn/ui   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/JSON  (/api/*)
                         │ Vite proxy in dev
                         │ Reverse proxy in prod
┌────────────────────────▼────────────────────────────────┐
│                ASP.NET Core Pipeline                    │
│                                                         │
│  ┌──────────┐  ┌──────┐  ┌────────┐  ┌─────────────┐  │
│  │  Swagger │→ │ CORS │→ │ AuthN  │→ │  AuthZ      │  │
│  └──────────┘  └──────┘  └────────┘  └──────┬──────┘  │
│                                              │          │
│  ┌───────────────────────────────────────────▼──────┐  │
│  │                  Controllers                      │  │
│  │                                                   │  │
│  │  Auth  │  Events  │  Bookings  │  Reviews  │ ...  │  │
│  └───────────────────────────────────────────┬──────┘  │
│                                              │          │
│  ┌───────────────────────────────────────────▼──────┐  │
│  │              Application Services                │  │
│  │         (JwtService, AuthService)                │  │
│  └───────────────────────────────────────────┬──────┘  │
│                                              │          │
│  ┌───────────────────────────────────────────▼──────┐  │
│  │              AppDbContext (EF Core)               │  │
│  └───────────────────────────────────────────┬──────┘  │
└──────────────────────────────────────────────┼──────────┘
                                               │
┌──────────────────────────────────────────────▼──────────┐
│                    SQLite Database                      │
└─────────────────────────────────────────────────────────┘
```

### Request Flow

1. Client sends HTTP request with optional `Authorization: Bearer <jwt>` header.
2. CORS middleware validates origin.
3. JWT middleware validates and decodes the token; injects `ClaimsPrincipal`.
4. `[Authorize]` / `[Authorize(Roles = "...")]` attributes enforce access.
5. Controller method executes business logic directly against `AppDbContext`.
6. Response is serialised to JSON and returned.

---

## Domain Model

### Entity Relationship Diagram

```
         ┌──────────────────────────────────────────────────────────┐
         │  User                                                    │
         │  ─────────────────────────────────────────────────────── │
         │  Id · Name · Email (unique) · PasswordHash · Role        │
         │  IsSuspended · LoyaltyPoints · CreatedAt                 │
         │  Bio? · Website? · TwitterHandle? · InstagramHandle?     │
         └──────┬──────────────────────────────────┬───────────────┘
                │ 1:N                               │ 1:N
                │                                  │
     ┌──────────▼──────────┐            ┌──────────▼──────────┐
     │  Event              │            │  Booking            │
     │  ─────────────────── │            │  ─────────────────── │
     │  Id · Title         │            │  Id · BookedAt      │
     │  Description        │◄───────────│  Status             │
     │  Location           │  1:N       │  PointsEarned       │
     │  StartDate/EndDate  │            │  IsCheckedIn        │
     │  Capacity · Price   │            │  CheckedInAt?       │
     │  IsPublic · Status  │            │  CheckInToken (uniq)│
     │  IsSuspended        │            └─────────────────────┘
     │  PostponedDate?     │
     └──────┬──────────────┘
            │
    ┌───────┼────────────┬──────────────────────┐
    │       │            │                      │
    ▼       ▼            ▼                      ▼
EventTag Announcement  Review               Category
(join)               ─────────────
                     Rating · Comment
                     IsPinned
                        │
               ┌────────┴─────────┐
               │                  │
          ReviewReply         ReviewVote
          Comment             IsLike
                          (composite PK:
                          ReviewId+UserId)

HostSubscription
──────────────────
SubscriberId (FK → User)
HostId       (FK → User)
SubscribedAt
```

### Entities and Responsibilities

| Entity | Responsibility |
|---|---|
| **User** | Identity, auth, role, loyalty state, organizer profile fields |
| **Event** | Lifecycle (Draft → Published → Cancelled/Postponed), capacity, pricing |
| **Booking** | Reservation, loyalty accrual, check-in state, QR token |
| **Review** | Post-event feedback with rating, pinning, and social reactions |
| **ReviewReply** | Threaded response to a review (host or any authenticated user) |
| **ReviewVote** | One like/dislike per user per review |
| **HostSubscription** | Follow graph between attendees and event organisers |
| **Announcement** | Broadcast messages from organiser to attendees, auto-generated on cancel/postpone |
| **Category** | Coarse taxonomy for events (e.g. Conference, Concert) |
| **Tag** | Fine-grained labels, many-to-many with events |

---

## API Design

### Controller Boundaries

Each controller owns exactly one aggregate or cross-cutting concern:

| Controller | Route Prefix | Concern |
|---|---|---|
| `AuthController` | `/api/auth` | Registration, login, password management |
| `EventsController` | `/api/events` | Event CRUD, lifecycle transitions, announcements, stats |
| `BookingsController` | `/api/bookings` | Booking creation/cancellation, check-in |
| `ReviewsController` | `/api/events/{eventId}/reviews` | Reviews, replies, votes, pinning |
| `OrganizersController` | `/api/organizers` | Organiser public profile, private dashboard, attendee management |
| `SubscriptionsController` | `/api/subscriptions` | Follow / unfollow organiser |
| `AdminController` | `/api/admin` | Full system management panel |
| `TagsController` | `/api/tags` | Read-only tag listing |
| `CategoriesController` | `/api/categories` | Read-only category listing |
| `DevController` | `/api/dev` | Development-only data reset and seeding |

### HTTP Status Code Conventions

| Scenario | Status |
|---|---|
| Successful read | 200 OK |
| Resource created | 201 Created |
| Successful mutation (no body) | 204 No Content |
| Invalid input / business rule violation | 400 Bad Request |
| Missing or invalid JWT | 401 Unauthorized |
| Insufficient role / ownership | 403 Forbidden |
| Resource not found | 404 Not Found |
| Duplicate resource | 409 Conflict |

### Visibility Rules for Events

```
Anonymous           → public, published, non-suspended events only
Authenticated user  → own events (any status/visibility) + above
Admin               → all events (except suspended, which only SuperAdmin sees)
SuperAdmin          → all events including suspended
```

---

## Authentication & Authorization

### JWT Token

```
Header:  { "alg": "HS256", "typ": "JWT" }
Payload: {
  "sub":  "<userId>",
  "name": "<name>",
  "role": "Attendee" | "Admin" | "SuperAdmin",
  "iat":  <issued-at>,
  "exp":  <issued-at + 7 days>
}
```

The token is signed with `Jwt:Key` from `appsettings.json` (minimum 32 characters, HS256). The secret **must** be rotated in production via environment variables.

### Role Hierarchy

```
SuperAdmin  ─── can promote Attendee → Admin
    │       ─── cannot be modified or suspended by Admin
    │
   Admin    ─── can suspend users/events, adjust points
    │       ─── can change role Attendee ↔ Admin
    │
Attendee   (default on registration)
```

### SuperAdmin Registration

A separate endpoint (`POST /api/admin/register`) accepts a `RegistrationKey` from configuration. This allows bootstrapping the first privileged account without exposing role escalation in the normal auth flow.

---

## Business Logic

### Loyalty System

Points are earned when a booking is confirmed:

```
discountedPrice = event.Price × (1 − user.LoyaltyDiscount)
pointsEarned    = floor(discountedPrice × 10)
```

When a booking is cancelled, earned points are deducted (floor at 0).

| Tier | Minimum Points | Discount |
|---|---|---|
| Standard | 0 | 0% |
| Bronze | 1,000 | 5% |
| Silver | 5,000 | 10% |
| Gold | 15,000 | 15% |
| Elite | 50,000 | 20% |

### Event Lifecycle

```
         ┌──────────────┐
  Create │   DRAFT      │
         └──────┬───────┘
                │ Publish
         ┌──────▼───────┐
         │  PUBLISHED   │◄──── Postpone ────┐
         └──────┬───────┘                   │
                │ Cancel / Postpone         │
         ┌──────▼───────┐  ┌───────────────┐
         │  CANCELLED   │  │   POSTPONED   │
         └──────────────┘  └───────────────┘
```

`DisplayStatus` (computed, not stored) overlays:
- `Completed` — published event whose `EndDate` has passed
- `Live` — published event currently in progress (`StartDate ≤ now < EndDate`)
- `SoldOut` — published event at capacity

### Booking Cancellation — 7-Day Rule

A booking cannot be cancelled fewer than 7 days before the event starts, **unless** the event itself was cancelled. This protects organiser revenue planning.

```
if event.Status != Cancelled
    && event.StartDate <= now + 7 days
then
    reject (400)
```

### Check-in

Each booking is assigned a UUID `CheckInToken` at creation. The QR code for a ticket encodes this token.

- `GET /api/bookings/checkin/{token}` — public endpoint for QR scanning to identify the attendee (no auth required)
- `POST /api/bookings/checkin/{token}` — marks attendance; restricted to event organiser, Admin, SuperAdmin

### Review Eligibility

A review can only be submitted when all three conditions are met:
1. The user has a `Confirmed` booking for the event.
2. `event.StartDate ≤ DateTime.UtcNow` (event has begun).
3. The user has not already reviewed this event.

### Organiser Profile

Any user can become an organiser by creating events. Profile fields (bio, website, social handles) are stored on `User` and surfaced via `/api/organizers/{id}`. The public profile shows:
- All published/postponed events (not Draft or Cancelled)
- Total follower count
- `MemberSince` (User.CreatedAt)

---

## Database Design

> Full table definitions, ER diagram, index documentation, and seeded data are in **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**.

### Schema Decisions

| Decision | Rationale |
|---|---|
| `LoyaltyTier` / `LoyaltyDiscount` not persisted | Always derivable from `LoyaltyPoints`; avoids sync bugs |
| `DisplayStatus` not persisted | Derived from stored `Status` + current time; kept in controller/DTO layer |
| `CheckInToken` unique index | Enables O(1) lookup by QR token |
| `Booking(UserId, EventId)` unique composite | Enforces one booking per user per event at DB level |
| `Review(EventId, UserId)` unique composite | Enforces one review per user per event at DB level |
| `ReviewVote` composite PK | One vote per user per review, enforced by PK |
| `HostSubscription` composite PK | One follow per (subscriber, host) pair |
| `Event.CreatedBy` → `OnDelete.Restrict` | Prevents accidental cascade-delete of all events when a user is deleted |
| Categories and Tags seeded via EF `HasData` | Consistent across all environments; avoids migration drift |

### Indexes

| Table | Index | Purpose |
|---|---|---|
| Users | Unique on Email | Fast login lookup, uniqueness constraint |
| Events | FK on CreatedById | Fast "my events" queries |
| Bookings | Unique composite (UserId, EventId) | One booking per user per event |
| Bookings | Unique on CheckInToken | O(1) QR check-in lookup |
| Bookings | FK on EventId | Fast "bookings for event" queries |
| Reviews | Unique composite (EventId, UserId) | One review per user per event |
| ReviewVote | PK on (ReviewId, UserId) | One vote per user per review |
| HostSubscription | PK on (SubscriberId, HostId) | One follow per pair |

---

## Data Flow

### Booking a Paid Event (Happy Path)

```
1. POST /api/bookings  { eventId: 42 }
2. JWT middleware → userId = 7
3. Load Event 42 with bookings
4. Check: not Draft, not Cancelled, not IsSuspended
5. confirmedCount < capacity → OK
6. Load User 7; check not IsSuspended
7. discountedPrice = 49.99 × (1 − loyaltyDiscount)
8. pointsEarned = floor(discountedPrice × 10)
9. No existing booking → create new Booking
10. user.LoyaltyPoints += pointsEarned
11. SaveChanges()
12. Return 201 BookingResponse (with CheckInToken)
```

### Review Creation

```
1. POST /api/events/42/reviews  { rating: 5, comment: "..." }
2. JWT middleware → userId = 7
3. Load Event 42 → exists
4. AnyAsync: Booking where UserId=7, EventId=42, Status=Confirmed → must be true
5. event.StartDate ≤ now → must be true
6. AnyAsync: Review where EventId=42, UserId=7 → must be false
7. Insert Review
8. Return 201 ReviewResponse
```

### QR Check-in Flow

```
1. Attendee presents QR code (encodes CheckInToken)
2. Scanner device calls GET /api/bookings/checkin/{token} → 200 AttendeeInfo
   (public endpoint — no auth needed)
3. Staff taps "Mark Attended"
4. Scanner calls POST /api/bookings/checkin/{token} with organiser JWT
5. booking.IsCheckedIn = true; booking.CheckedInAt = now
6. 204 No Content
```

---

## Testing Strategy

### Approach

All tests are **integration tests** using `WebApplicationFactory<Program>`. This means:
- A real ASP.NET Core host starts per test class.
- All middleware (auth, CORS, routing) executes.
- EF Core runs against an **in-memory SQLite** database with all migrations applied.
- No mocking of services; tests exercise the full stack.

A small number of **unit tests** cover pure logic (loyalty tier computation, auth service methods).

### Test Isolation

Each test class creates its own `CustomWebApplicationFactory` instance (and thus its own SQLite database). This prevents state leakage between test classes. Within a class, tests share the factory but use `IAsyncLifetime.InitializeAsync` to set up required preconditions.

### Coverage Areas

| Area | Integration Tests | Unit Tests |
|---|---|---|
| Auth (register, login, password) | ✔ | ✔ |
| Event CRUD & lifecycle | ✔ | — |
| Booking (create, cancel, rules) | ✔ | — |
| Check-in (ID + token) | ✔ | — |
| Reviews (CRUD, vote, pin, reply) | ✔ | — |
| Organiser profile & dashboard | ✔ | — |
| Attendee list & CSV export | ✔ | — |
| Subscriptions (follow/unfollow) | ✔ | — |
| Admin panel (users, events, bookings) | ✔ | — |
| Categories & tags (CRUD) | ✔ | — |
| Loyalty tier & discount logic | — | ✔ |
| Auth service (register/login/hash) | — | ✔ |
| Dev endpoints (reset, seed) | ✔ | — |
| Role-based access (401/403) | ✔ | — |
