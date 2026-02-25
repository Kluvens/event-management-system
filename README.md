# Event Management System

A full-stack event management platform originally built as the **UNSW COMP3900** capstone project by team **UnderTheC**. After graduating, I revisited the codebase to make it more complete, robust, and production-ready — expanding the feature set, hardening the API design, adding a comprehensive test suite, and rebuilding the frontend with a modern React + Vite + TypeScript stack.

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
| **Auth** | AWS Cognito federated identity; `GET /api/auth/me` provisions/returns the local user profile on first sign-in |
| **Roles** | `Attendee` (default) · `Admin` · `SuperAdmin` |
| **Admin** | System-wide administration panel: user management (suspend/unsuspend/role changes/loyalty adjustment), event oversight, booking inspection, category/tag management, stats dashboard |
| **SuperAdmin** | All Admin capabilities + create SuperAdmin accounts via registration key |
| **Suspension** | Admin can suspend users (blocks login) and events (hidden from all public access) |
| **Events** | Create, read, update, delete with owner / admin guard; optional cover image upload to S3 |
| **Event lifecycle** | Draft (default on create) → Publish → Live → Sold Out → Completed; Cancel and Postpone with auto-announcements; `DisplayStatus` computed from stored status + time |
| **Visibility** | Events can be public or private; drafts only visible to owner |
| **Pricing** | Optional ticket price per event (free events supported) |
| **Discovery** | Search by keyword, filter by category, tags, and date range; sort by date, popularity, or price |
| **Bookings** | Book, view own bookings, cancel (soft-delete to `Cancelled`) |
| **Capacity** | Booking blocked when confirmed seats reach event capacity |
| **Re-booking** | Cancelled bookings can be re-confirmed without creating a duplicate row |
| **Waitlist** | Join waitlist when sold out; automatic promotion to confirmed on cancellation; position tracking |
| **Check-in** | QR token generated per booking; host/admin can check in attendees by ID or scan QR token via camera |
| **Calendar export** | Download any confirmed booking as an RFC 5545 `.ics` file to add to any calendar app |
| **Reviews** | Post a 1–5 star review with a comment (requires a confirmed past booking); delete own review |
| **Review replies** | Any authenticated user can reply to a review thread |
| **Review votes** | Like or dislike reviews; update your vote at any time |
| **Pinned reviews** | Event host or admin can pin one review to always appear first |
| **Event stats** | Host/admin dashboard: confirmed bookings, cancellations, occupancy %, revenue, avg. rating |
| **Event analytics** | 30-day daily booking trend chart, occupancy rate, waitlist size, and total revenue per event |
| **Notifications** | In-app notifications; fan-out to all confirmed attendees on each announcement; unread count badge; mark as read |
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

### Backend

| Layer | Technology |
|---|---|
| Runtime | .NET 9 (ASP.NET Core) |
| Language | C# 13 |
| ORM | Entity Framework Core 9 |
| Database | SQLite (dev) — swap connection string for PostgreSQL/MySQL in prod |
| Auth | AWS Cognito (OIDC / JWT verification via `Amazon.AspNetCore.Identity.Cognito`) |
| Storage | AWS S3 (via AWS SDK for .NET) for event cover images |
| API docs | Swashbuckle / OpenAPI 3 |
| Testing | xUnit · Microsoft.AspNetCore.Mvc.Testing · EF Core InMemory/SQLite |

### Frontend

The frontend lives in `frontend/` and is documented in detail in **[docs/FRONTEND.md](docs/FRONTEND.md)**.

| Concern | Technology |
|---|---|
| Build tool | Vite 6 |
| Framework | React 18 |
| Language | TypeScript 5 (strict) |
| Routing | React Router DOM v6 |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 |
| UI components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS 3 + tailwindcss-animate |
| Forms & validation | react-hook-form + Zod |
| Notifications | Sonner |
| Charts | Recharts |
| QR scanning | @zxing/browser (`BrowserQRCodeReader`) |
| Animations & effects | framer-motion + custom Aceternity UI components |

---

## Project Structure

```
event-management-system/
├── backend/
│   ├── EventManagement/
│   │   ├── Controllers/
│   │   │   ├── AppControllerBase.cs        # Base: resolves Cognito sub → local user ID
│   │   │   ├── AuthController.cs           # GET /api/auth/me (provision + return local profile)
│   │   │   ├── AdminController.cs          # /api/admin/* (Admin & SuperAdmin)
│   │   │   ├── EventsController.cs         # CRUD + publish/cancel/postpone/stats/analytics/announcements/waitlist
│   │   │   ├── BookingsController.cs       # /api/bookings + check-in + ICS calendar export
│   │   │   ├── NotificationsController.cs  # /api/notifications (list, unread-count, mark-read)
│   │   │   ├── OrganizersController.cs     # /api/organizers (profile, dashboard, attendees, CSV)
│   │   │   ├── ReviewsController.cs        # /api/events/{id}/reviews (+ replies, votes, pin)
│   │   │   ├── SubscriptionsController.cs  # /api/subscriptions
│   │   │   ├── TagsController.cs           # GET /api/tags
│   │   │   ├── CategoriesController.cs     # GET /api/categories
│   │   │   └── DevController.cs            # Dev-only: reset, seed, test auth endpoints
│   │   ├── Data/
│   │   │   └── AppDbContext.cs             # EF Core DbContext + seed data
│   │   ├── DTOs/
│   │   │   ├── AuthDtos.cs
│   │   │   ├── AdminDTOs.cs
│   │   │   ├── EventDtos.cs                # Includes DailyBookingCount, EventAnalyticsResponse
│   │   │   ├── BookingDtos.cs
│   │   │   ├── WaitlistDtos.cs
│   │   │   ├── NotificationDtos.cs
│   │   │   ├── OrganizerDTOs.cs
│   │   │   ├── ReviewDtos.cs
│   │   │   ├── AnnouncementDtos.cs
│   │   │   └── DevDtos.cs                  # Dev-only request shapes
│   │   ├── Migrations/                     # EF Core migration history
│   │   ├── Models/
│   │   │   ├── User.cs                     # Loyalty points, tier logic, organizer profile fields
│   │   │   ├── Event.cs                    # Price, IsPublic, Status, WaitlistEntries nav prop
│   │   │   ├── Booking.cs                  # PointsEarned, check-in fields (IsCheckedIn, CheckInToken)
│   │   │   ├── WaitlistEntry.cs            # Position-ordered queue per event
│   │   │   ├── Notification.cs             # Per-user in-app notification
│   │   │   ├── Category.cs
│   │   │   ├── Tag.cs
│   │   │   ├── EventTag.cs                 # Many-to-many join
│   │   │   ├── Review.cs                   # IsPinned, Replies, Votes
│   │   │   ├── ReviewReply.cs
│   │   │   ├── ReviewVote.cs               # Composite PK (ReviewId, UserId)
│   │   │   ├── HostSubscription.cs         # Composite PK (SubscriberId, HostId)
│   │   │   └── Announcement.cs
│   │   ├── Services/
│   │   │   ├── CognitoUserResolver.cs      # Resolves Cognito sub → local User row (auto-provisions)
│   │   │   └── WaitlistService.cs          # PromoteNextAsync: first waitlisted → confirmed booking
│   │   ├── appsettings.json
│   │   └── Program.cs                     # DI, middleware, Swagger config
|   └── EventManagement.Tests/
│       ├── Helpers/
│       │   ├── ApiClient.cs               # Typed HTTP client for integration tests
│       │   └── CustomWebApplicationFactory.cs  # HS256 JWT override for test isolation
│       ├── Integration/
│       │   ├── AuthControllerTests.cs
│       │   ├── EventsControllerTests.cs
│       │   ├── EventsControllerExtendedTests.cs     # Suspension visibility, tag/date filters
│       │   ├── BookingsControllerTests.cs
│       │   ├── BookingsControllerExtendedTests.cs   # Suspension guards, check-in edge cases
│       │   ├── WaitlistControllerTests.cs           # Waitlist join/leave/position/promotion
│       │   ├── NotificationsControllerTests.cs      # Fan-out, unread count, mark-read
│       │   ├── CalendarIcsTests.cs                  # .ics download, ownership guard
│       │   ├── AnalyticsControllerTests.cs          # Non-owner 403, counts, waitlist count
│       │   ├── OrganizersControllerTests.cs
│       │   ├── OrganizersControllerExtendedTests.cs # Dashboard split, follower counts
│       │   ├── ReviewsControllerTests.cs
│       │   ├── SubscriptionsControllerTests.cs
│       │   ├── TagsAndCategoriesControllerTests.cs
│       │   ├── AdminControllerTests.cs
│       │   ├── AdminControllerExtendedTests.cs      # Filters, FK guards, stats fix coverage
│       │   └── DevControllerTests.cs
│       └── Unit/
│           └── Models/UserTests.cs
├── frontend/                              # React 18 SPA (see docs/FRONTEND.md)
│   ├── src/
│   │   ├── api/                           # Axios + TanStack Query hooks per domain
│   │   │   ├── notifications.ts           # useNotifications, useUnreadCount, useMarkRead
│   │   │   ├── waitlist.ts                # useWaitlistPosition, useJoinWaitlist, useLeaveWaitlist
│   │   │   └── analytics.ts              # useEventAnalytics
│   │   ├── components/                    # Reusable UI components + shadcn/ui + Aceternity
│   │   │   └── NotificationBell.tsx       # Bell icon with unread badge + dropdown
│   │   ├── features/                      # Domain-specific composites (forms, tables)
│   │   ├── layouts/                       # RootLayout, AuthLayout
│   │   ├── pages/                         # One file per route
│   │   │   └── CheckInScannerPage.tsx     # Camera QR scanner + manual token input
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
  "Cognito": {
    "Region": "ap-southeast-2",
    "UserPoolId": "<your-user-pool-id>",
    "ClientId": "<your-app-client-id>"
  },
  "Storage": {
    "Provider": "S3",
    "S3": {
      "BucketName": "<your-s3-bucket>",
      "Region": "ap-southeast-2"
    }
  }
}
```

> **AWS credentials:** The backend reads AWS credentials from the standard credential chain (environment variables, `~/.aws/credentials`, or an IAM role). Ensure the running process has `cognito-idp:GetUser` and S3 read/write permissions for the configured resources.

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

Authentication is handled entirely by **AWS Cognito**. The backend validates Cognito-issued JWTs and never stores passwords.

1. **Sign up / sign in** via the Cognito Hosted UI or the Amplify/Cognito SDK on the frontend.
2. On successful sign-in, Cognito returns an **access token** (JWT).
3. **Call `GET /api/auth/me`** with the token — this auto-provisions a local `User` row on first login and returns the app-specific profile (`userId`, `role`, `loyaltyPoints`, etc.).
4. Include the token on all subsequent protected requests:
   ```
   Authorization: Bearer <cognito-access-token>
   ```
5. Tokens expire based on Cognito pool settings (typically 1 h access token; refresh token validity is configurable).

**In Swagger UI:** click the **Authorize** button, paste your Cognito access token (no `Bearer ` prefix needed), and all subsequent requests will include it automatically.

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

The test suite uses **xUnit** with `Microsoft.AspNetCore.Mvc.Testing` to spin up a real in-process server backed by an SQLite in-memory database. `CustomWebApplicationFactory` overrides JWT validation to use an HS256 test key, and dev-only endpoints (`/api/dev/auth/*`) mint tokens so tests run without a live Cognito pool. **225 tests, all passing.**

```bash
cd backend/EventManagement.Tests
dotnet test
```

| Category | Scope |
|---|---|
| **Unit** | `User` model loyalty tier/discount logic |
| **Integration** | Full HTTP round-trips for Auth (`/api/auth/me`), Events (draft/publish lifecycle, suspension visibility, tag/date/popularity filters), Bookings (check-in, loyalty, suspended-user/event guards, QR token, ICS download), Waitlist (join/leave/position/auto-promotion), Notifications (fan-out, unread count, mark-read), Analytics (owner-only, counts, waitlist), Organizers (profile follower counts, dashboard splits, CSV export), Reviews (sorting, pinning, replies, votes), Subscriptions, Tags & Categories, Admin panel (user/event/booking filters, FK guards, stats), Dev utilities |

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
