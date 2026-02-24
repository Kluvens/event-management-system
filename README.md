# Event Management System

A full-stack event management platform originally built as the **UNSW COMP3900** capstone project by team **UnderTheC**. After graduating, I revisited the codebase to make it more complete, robust, and production-ready — expanding the feature set, hardening the API design, and adding a comprehensive test suite.

> **Note:** This README covers the backend only. Frontend documentation will be added separately.

---

## Table of Contents

- [Background](#background)
- [What's New (Post-University)](#whats-new-post-university)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Configuration](#configuration)
  - [Run the API](#run-the-api)
- [API Reference](docs/API_REFERENCE.md)
- [Authentication Flow](#authentication-flow)
- [Loyalty Programme](#loyalty-programme)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Testing](#testing)
- [Original Team](#original-team)
- [User Stories](docs/USER_STORIES.md)
- [Architecture & System Design](docs/ARCHITECTURE.md)
- [Frontend Architecture](docs/FRONTEND.md)

---

## Background

Modern event ticketing platforms such as Ticketmaster and Eventbrite leave a number of gaps in user experience:

- No smart recommendation engine personalised to booking history
- No loyalty or rewards programme to retain frequent customers
- No way for attendees to review or rate events they attended
- No mechanism for hosts to keep followers updated on their events

This project was originally submitted for UNSW COMP3900 (Computer Science Project) in June 2023. The university version covered the core booking loop: auth, events, and bookings.

---

## Features

| Area | Capability |
|---|---|
| **Auth** | Register, login, JWT access tokens (7-day expiry) |
| **Roles** | `Attendee` (default) · `Admin` · `SuperAdmin` |
| **Admin** | System-wide administration panel: user management (suspend/unsuspend/role changes/loyalty adjustment), event oversight, booking inspection, category/tag management, stats dashboard |
| **SuperAdmin** | All Admin capabilities + create SuperAdmin accounts via registration key |
| **Suspension** | Admin can suspend users (blocks login) and events (hidden from all public access) |
| **Events** | Create, read, update, delete with owner / admin guard |
| **Event lifecycle** | Draft (default on create) → Publish → Live → Sold Out → Completed; Cancel and Postpone with auto-announcements; `DisplayStatus` computed from stored status + time |
| **Visibility** | Events can be public or private; drafts only visible to owner |
| **Pricing** | Optional ticket price per event (free events supported) |
| **Discovery** | Search by keyword, filter by category, tags, and date range; sort by date, popularity, or price |
| **Bookings** | Book, view own bookings, cancel (soft-delete to `Cancelled`) |
| **Capacity** | Booking blocked when confirmed seats reach event capacity |
| **Re-booking** | Cancelled bookings can be re-confirmed without creating a duplicate row |
| **Check-in** | QR token generated per booking; host/admin can check in attendees by ID or scan QR token |
| **Reviews** | Post a 1–5 star review with a comment (requires a confirmed past booking); delete own review |
| **Review replies** | Any authenticated user can reply to a review thread |
| **Review votes** | Like or dislike reviews; update your vote at any time |
| **Pinned reviews** | Event host or admin can pin one review to always appear first |
| **Event stats** | Host/admin dashboard: confirmed bookings, cancellations, occupancy %, revenue, avg. rating |
| **Organizer profile** | Public profile page: bio, website, social links, follower count, event history |
| **Organizer dashboard** | Private stats aggregate: total events, attendees, revenue, check-ins, upcoming and recent event breakdowns |
| **Attendee management** | Host/admin can list all attendees per event with check-in status; export to CSV |
| **Organizer refund** | Host/admin can cancel any booking (no 7-day restriction) and deduct loyalty points |
| **Announcements** | Hosts post announcements on events; cancel/postpone automatically posts a system announcement |
| **Subscriptions** | Follow a host; unfollow; view your own followers as a host |
| **Loyalty** | Points accrued per booking; five tiers with escalating discounts |
| **Tags** | 12 predefined tags assignable to events; multi-tag filter on listing |
| **Categories** | Seeded: Conference, Workshop, Concert, Sports, Networking, Other |
| **Swagger UI** | Interactive docs served at `/` with JWT auth support |
| **Dev tools** | Reset all data or seed a minimal sample dataset (Development environment only, Admin/SuperAdmin auth required) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | .NET 9 (ASP.NET Core) |
| Language | C# 13 |
| ORM | Entity Framework Core 9 |
| Database | SQLite (dev) — swap connection string for PostgreSQL/MySQL in prod |
| Auth | JWT Bearer (`System.IdentityModel.Tokens.Jwt`) |
| Password hashing | BCrypt.Net-Next |
| API docs | Swashbuckle / OpenAPI 3 |
| Testing | xUnit · Microsoft.AspNetCore.Mvc.Testing · EF Core InMemory/SQLite |

---

## Project Structure

```
event-management-system/
├── backend/
│   ├── EventManagement/
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs           # POST /api/auth/register|login
│   │   │   ├── AdminController.cs          # /api/admin/* (Admin & SuperAdmin)
│   │   │   ├── EventsController.cs         # CRUD + publish/cancel/postpone/stats/announcements
│   │   │   ├── BookingsController.cs       # /api/bookings + check-in endpoints
│   │   │   ├── OrganizersController.cs     # /api/organizers (profile, dashboard, attendees, CSV)
│   │   │   ├── ReviewsController.cs        # /api/events/{id}/reviews (+ replies, votes, pin)
│   │   │   ├── SubscriptionsController.cs  # /api/subscriptions
│   │   │   ├── TagsController.cs           # GET /api/tags
│   │   │   ├── CategoriesController.cs     # GET /api/categories
│   │   │   └── DevController.cs            # Dev-only: reset & seed
│   │   ├── Data/
│   │   │   └── AppDbContext.cs             # EF Core DbContext + seed data
│   │   ├── DTOs/
│   │   │   ├── AuthDtos.cs
│   │   │   ├── AdminDTOs.cs
│   │   │   ├── EventDtos.cs
│   │   │   ├── BookingDtos.cs
│   │   │   ├── OrganizerDTOs.cs
│   │   │   ├── ReviewDtos.cs
│   │   │   └── AnnouncementDtos.cs
│   │   ├── Migrations/                     # EF Core migration history
│   │   ├── Models/
│   │   │   ├── User.cs                     # Loyalty points, tier logic, organizer profile fields
│   │   │   ├── Event.cs                    # Price, IsPublic, Status (Draft/Published/…), PostponedDate
│   │   │   ├── Booking.cs                  # PointsEarned, check-in fields (IsCheckedIn, CheckInToken)
│   │   │   ├── Category.cs
│   │   │   ├── Tag.cs
│   │   │   ├── EventTag.cs                 # Many-to-many join
│   │   │   ├── Review.cs                   # IsPinned, Replies, Votes
│   │   │   ├── ReviewReply.cs
│   │   │   ├── ReviewVote.cs               # Composite PK (ReviewId, UserId)
│   │   │   ├── HostSubscription.cs         # Composite PK (SubscriberId, HostId)
│   │   │   └── Announcement.cs
│   │   ├── Services/
│   │   │   ├── AuthService.cs              # Register / login logic
│   │   │   └── JwtService.cs              # Token generation
│   │   ├── appsettings.json
│   │   └── Program.cs                     # DI, middleware, Swagger config
|   └── EventManagement.Tests/
│       ├── Helpers/
│       │   ├── ApiClient.cs               # Typed HTTP client for integration tests
│       │   └── CustomWebApplicationFactory.cs
│       ├── Integration/
│       │   ├── AuthControllerTests.cs
│       │   ├── EventsControllerTests.cs
│       │   ├── EventsControllerExtendedTests.cs     # Suspension visibility, tag/date filters
│       │   ├── BookingsControllerTests.cs
│       │   ├── BookingsControllerExtendedTests.cs   # Suspension guards, check-in edge cases
│       │   ├── OrganizersControllerTests.cs
│       │   ├── OrganizersControllerExtendedTests.cs # Dashboard split, follower counts
│       │   ├── ReviewsControllerTests.cs
│       │   ├── SubscriptionsControllerTests.cs
│       │   ├── TagsAndCategoriesControllerTests.cs
│       │   ├── AdminControllerTests.cs
│       │   ├── AdminControllerExtendedTests.cs      # Filters, FK guards, stats fix coverage
│       │   └── DevControllerTests.cs
│       └── Unit/
│           ├── Models/UserTests.cs
│           └── Services/AuthServiceTests.cs
├── frontend/                              # React 18 SPA (see docs/FRONTEND.md)
│   ├── src/
│   │   ├── api/                           # Axios + TanStack Query hooks per domain
│   │   ├── components/                    # Reusable UI components + shadcn/ui + Aceternity
│   │   ├── features/                      # Domain-specific composites (forms, tables)
│   │   ├── layouts/                       # RootLayout, AuthLayout
│   │   ├── pages/                         # One file per route
│   │   ├── routes/                        # createBrowserRouter + ProtectedRoute
│   │   ├── stores/                        # Zustand auth store
│   │   └── types/                         # TypeScript interfaces mirroring API DTOs
│   ├── package.json
│   └── vite.config.ts                     # @/ alias + /api → localhost:5266 proxy
├── docs/
│   ├── ARCHITECTURE.md                    # Full-stack system design & data flow
│   ├── FRONTEND.md                        # Frontend architecture & dev guide
│   ├── DATABASE_SCHEMA.md                 # Table definitions, ER diagram, indexes
│   ├── API_REFERENCE.md                   # Complete REST API endpoint reference
│   └── USER_STORIES.md                    # Role-based user stories
├── swagger.json                           # Generated OpenAPI spec
└── event-management-system.sln
```

---

## Getting Started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- No external database setup required — SQLite file is created automatically on first run

### Configuration

Open [backend/EventManagement/appsettings.json](backend/EventManagement/appsettings.json) and review the defaults:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=events.db"
  },
  "Jwt": {
    "Key": "SuperSecretKey_ChangeThisInProduction_AtLeast32Chars!",
    "Issuer": "EventManagementAPI",
    "Audience": "EventManagementClient"
  },
  "AdminSettings": {
    "RegistrationKey": "CHANGE_THIS_ADMIN_SECRET_KEY_IN_PRODUCTION"
  }
}
```

> **Important:** Replace `Jwt:Key` and `AdminSettings:RegistrationKey` with strong, randomly generated values before deploying to any non-local environment. The registration key is the only gate protecting SuperAdmin account creation.

### Run the API

```bash
cd backend/EventManagement
dotnet run
```

The API starts on `http://localhost:5266` by default (see [backend/EventManagement/Properties/launchSettings.json](backend/EventManagement/Properties/launchSettings.json)).

EF Core migrations are applied automatically on startup — the SQLite database, seeded categories, and seeded tags are created on first launch.

Open your browser at `http://localhost:5266` to reach the **Swagger UI**.

---

## API Reference

The full endpoint reference — request/response shapes, query parameters, and status codes for all routes — is documented in **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)**.

---

## Authentication Flow

1. **Register** via `POST /api/auth/register` → receive a JWT.
2. **Login** via `POST /api/auth/login` → receive a JWT.
3. Include the token on all protected requests:
   ```
   Authorization: Bearer <token>
   ```
4. Tokens expire after **7 days**. Re-authenticate to get a new one.

**In Swagger UI:** click the **Authorize** button at the top of the page, paste your token (no `Bearer ` prefix needed), and all subsequent requests will include it automatically.

---

## Loyalty Programme

Every confirmed booking tracks `PointsEarned`. Users accumulate points on their account and are automatically placed in a tier:

| Tier | Points required | Discount |
|---|---|---|
| Standard | 0 | 0% |
| Bronze | 1,000 | 5% |
| Silver | 5,000 | 10% |
| Gold | 15,000 | 15% |
| Elite | 50,000 | 20% |

Tier and discount are computed properties on the `User` model and returned with auth responses.

---

## Database Schema

Full table definitions, ER diagram, constraint documentation, design decisions, and seeded reference data are in **[docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)**.

---

## Testing

The test suite uses **xUnit** with `Microsoft.AspNetCore.Mvc.Testing` to spin up a real in-process server backed by an SQLite in-memory database. **223 tests, all passing.**

```bash
cd backend/EventManagement.Tests
dotnet test
```

| Category | Scope |
|---|---|
| **Unit** | `User` model loyalty tier/discount logic; `AuthService` register & login paths |
| **Integration** | Full HTTP round-trips for Auth, Events (draft/publish lifecycle, suspension visibility, tag/date/popularity filters), Bookings (check-in, loyalty, suspended-user/event guards, QR token), Organizers (profile follower counts, dashboard splits, CSV export), Reviews (sorting, pinning, replies, votes), Subscriptions, Tags & Categories, Admin panel (user/event/booking filters, FK guards, stats), Dev utilities |

Each test class creates its own isolated `CustomWebApplicationFactory` instance with a fresh in-memory SQLite database, ensuring no test state leaks between classes.

---

## Original Team

**UnderTheC** — UNSW COMP3900, submitted 16 June 2023.

| Name | ZID | Role |
|---|---|---|
| Junji Dong | z5258870 | Engineer |
| Redmond Mobbs | z5257080 | Backend Engineer, Scrum Master |
| Jiapeng Yang | z5339252 | Database Engineer |
| Fengyu Wang | z5187561 | Frontend Engineer |
| Hong Zhang | z5257097 | Engineer |
