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
- [API Reference](#api-reference)
  - [Authentication](#authentication-endpoints)
  - [Events](#event-endpoints)
  - [Bookings](#booking-endpoints)
  - [Reviews](#review-endpoints)
  - [Subscriptions](#subscription-endpoints)
  - [Tags](#tag-endpoints)
  - [Categories](#category-endpoints)
  - [Administration](#administration-endpoints)
  - [Dev Utilities](#dev-utility-endpoints)
- [Authentication Flow](#authentication-flow)
- [Loyalty Programme](#loyalty-programme)
- [Database Schema](#database-schema)
- [Seeded Data](#seeded-data)
- [Testing](#testing)
- [Original Team](#original-team)
- [User Stories](docs/USER_STORIES.md)

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
| **Suspension** | SuperAdmin can suspend users (blocks login) and events (hidden from all public access) |
| **Events** | Create, read, update, delete with owner / admin guard |
| **Event lifecycle** | Cancel and postpone events; status tracked as `Active`, `Cancelled`, or `Postponed` |
| **Visibility** | Events can be public or private (only visible to the creator) |
| **Pricing** | Optional ticket price per event (free events supported) |
| **Discovery** | Search by keyword, filter by category, tags, and date range; sort by date, popularity, or price |
| **Bookings** | Book, view own bookings, cancel (soft-delete to `Cancelled`) |
| **Capacity** | Booking blocked when confirmed seats reach event capacity |
| **Re-booking** | Cancelled bookings can be re-confirmed without creating a duplicate row |
| **Reviews** | Post a 1–5 star review with a comment (requires a confirmed past booking); delete own review |
| **Review replies** | Any authenticated user can reply to a review thread |
| **Review votes** | Like or dislike reviews; update your vote at any time |
| **Pinned reviews** | Event host or admin can pin one review to always appear first |
| **Event stats** | Host/admin dashboard: confirmed bookings, cancellations, occupancy %, revenue, avg. rating |
| **Announcements** | Hosts post announcements on events; all users can read them |
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
│   │   │   ├── EventsController.cs         # CRUD + cancel/postpone/stats/announcements
│   │   │   ├── BookingsController.cs       # /api/bookings
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
│   │   │   ├── ReviewDtos.cs
│   │   │   └── AnnouncementDtos.cs
│   │   ├── Migrations/                     # EF Core migration history
│   │   ├── Models/
│   │   │   ├── User.cs                     # Includes loyalty points & tier logic
│   │   │   ├── Event.cs                    # Price, IsPublic, Status, PostponedDate
│   │   │   ├── Booking.cs                  # PointsEarned per booking
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
│       │   ├── BookingsControllerTests.cs
│       │   ├── ReviewsControllerTests.cs
│       │   ├── SubscriptionsControllerTests.cs
│       │   ├── TagsAndCategoriesControllerTests.cs
│       │   └── DevControllerTests.cs
│       └── Unit/
│           ├── Models/UserTests.cs
│           └── Services/AuthServiceTests.cs
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

Base URL: `http://localhost:5266`

All request/response bodies are JSON. Endpoints marked with `[Auth]` require a `Bearer` token in the `Authorization` header.

---

### Authentication Endpoints

#### `POST /api/auth/register`

Create a new attendee account.

**Request body**
```json
{
  "name": "Alice Smith",
  "email": "alice@example.com",
  "password": "MyPassword123"
}
```

**Response `200 OK`**
```json
{
  "token": "<jwt>",
  "userId": 1,
  "name": "Alice Smith",
  "email": "alice@example.com",
  "role": "Attendee"
}
```

**Response `409 Conflict`** — email already in use.

---

#### `POST /api/auth/login`

Authenticate an existing user.

**Request body**
```json
{
  "email": "alice@example.com",
  "password": "MyPassword123"
}
```

**Response `200 OK`** — same shape as register.

**Response `401 Unauthorized`** — wrong email or password, or account is suspended.

---

### Event Endpoints

#### `GET /api/events`

List events. Unauthenticated users see only public events; authenticated users also see their own private events.

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Full-text search across title, description, location |
| `categoryId` | int | Filter by category |
| `tagIds` | int[] | Filter to events that have any of the given tags |
| `from` | datetime | Events starting on or after this date |
| `to` | datetime | Events starting on or before this date |
| `sortBy` | string | `date` (default) · `popularity` · `price` |

**Example**
```
GET /api/events?search=conference&categoryId=1&tagIds=2&tagIds=7&sortBy=popularity
```

**Response `200 OK`** — array of event objects.

Each event object includes: `id`, `title`, `description`, `location`, `startDate`, `endDate`, `capacity`, `bookingCount`, `price`, `isPublic`, `status`, `postponedDate`, `createdAt`, `createdById`, `createdByName`, `categoryId`, `categoryName`, `tags` (string[]).

---

#### `GET /api/events/{id}`

Retrieve a single event by ID. Private events return `404` for non-owners.

**Response `200 OK`** — single event object.
**Response `404 Not Found`**

---

#### `GET /api/events/{id}/stats` `[Auth]`

Host/admin dashboard for an event.

**Response `200 OK`**
```json
{
  "eventId": 1,
  "title": "Tech Conference 2026",
  "totalCapacity": 200,
  "confirmedBookings": 45,
  "cancelledBookings": 3,
  "occupancyRate": 22.5,
  "totalRevenue": 2249.55,
  "averageRating": 4.2,
  "reviewCount": 12
}
```

**Response `403 Forbidden`** — not the owner or admin.

---

#### `POST /api/events` `[Auth]`

Create a new event.

**Request body**
```json
{
  "title": "Tech Conference 2026",
  "description": "A full-day conference on modern software engineering.",
  "location": "Sydney Convention Centre",
  "startDate": "2026-07-15T09:00:00Z",
  "endDate": "2026-07-15T17:00:00Z",
  "capacity": 200,
  "price": 49.99,
  "isPublic": true,
  "categoryId": 1,
  "tagIds": [2, 7]
}
```

**Response `201 Created`** — the created event object.

---

#### `PUT /api/events/{id}` `[Auth]`

Update an event. Only the event creator or an `Admin` can update. Tags are replaced wholesale.

**Request body** — same fields as create.

**Response `204 No Content`**
**Response `403 Forbidden`** — not the owner or admin.
**Response `404 Not Found`**

---

#### `POST /api/events/{id}/cancel` `[Auth]`

Cancel an event. Sets `status` to `Cancelled`.

**Response `204 No Content`**
**Response `400 Bad Request`** — event is already cancelled.
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

#### `POST /api/events/{id}/postpone` `[Auth]`

Postpone an event to new dates. Records the original start date in `postponedDate` and sets `status` to `Postponed`.

**Request body**
```json
{
  "newStartDate": "2026-09-01T09:00:00Z",
  "newEndDate": "2026-09-01T17:00:00Z"
}
```

**Response `204 No Content`**
**Response `400 Bad Request`** — cannot postpone a cancelled event.
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

#### `DELETE /api/events/{id}` `[Auth]`

Delete an event. Only the event creator or an `Admin` can delete.

**Response `204 No Content`**
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

#### `GET /api/events/{id}/announcements`

List all announcements for an event, ordered by most recent.

**Response `200 OK`** — array of `{ id, eventId, eventTitle, title, message, createdAt }`.

---

#### `POST /api/events/{id}/announcements` `[Auth]`

Post an announcement. Only the event creator or an `Admin` can post.

**Request body**
```json
{
  "title": "Venue change",
  "message": "The event has moved to the main hall."
}
```

**Response `201 Created`** — the created announcement.
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

### Booking Endpoints

All booking endpoints require authentication.

#### `GET /api/bookings/mine` `[Auth]`

List all bookings for the authenticated user, ordered by most recent.

**Response `200 OK`**
```json
[
  {
    "id": 5,
    "eventId": 1,
    "eventTitle": "Tech Conference 2026",
    "eventLocation": "Sydney Convention Centre",
    "eventStartDate": "2026-07-15T09:00:00Z",
    "bookedAt": "2026-03-01T10:30:00Z",
    "status": "Confirmed"
  }
]
```

---

#### `POST /api/bookings` `[Auth]`

Book a spot at an event.

**Request body**
```json
{ "eventId": 1 }
```

**Response `201 Created`** — the new booking.
**Response `400 Bad Request`** — event is fully booked.
**Response `404 Not Found`** — event does not exist.
**Response `409 Conflict`** — user already has a confirmed booking for this event.

> If the user previously cancelled their booking for this event, it is **re-activated** (`Confirmed`) rather than creating a duplicate row.

---

#### `DELETE /api/bookings/{id}` `[Auth]`

Cancel a booking (sets status to `Cancelled`). Only the booking owner can cancel.

**Response `204 No Content`**
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

### Review Endpoints

All write endpoints require authentication.

#### `GET /api/events/{eventId}/reviews`

List all reviews for an event. Pinned review always appears first.

| Parameter | Type | Description |
|---|---|---|
| `sort` | string | `newest` (default) · `highest` · `lowest` |

**Response `200 OK`**
```json
[
  {
    "id": 3,
    "eventId": 1,
    "userId": 5,
    "userName": "Bob Attendee",
    "rating": 5,
    "comment": "Excellent event!",
    "isPinned": true,
    "likes": 10,
    "dislikes": 1,
    "createdAt": "2026-01-20T12:00:00Z",
    "replies": [
      {
        "id": 1,
        "userId": 2,
        "userName": "Alice Host",
        "comment": "Thanks for the kind words!",
        "createdAt": "2026-01-21T08:00:00Z"
      }
    ]
  }
]
```

---

#### `POST /api/events/{eventId}/reviews` `[Auth]`

Submit a review. Requires a confirmed booking and the event must have already started. One review per user per event.

**Request body**
```json
{
  "rating": 5,
  "comment": "Excellent event!"
}
```

**Response `201 Created`** — the created review.
**Response `400 Bad Request`** — no confirmed booking, event hasn't started, or rating out of range.
**Response `409 Conflict`** — already reviewed.

---

#### `DELETE /api/events/{eventId}/reviews/{reviewId}` `[Auth]`

Delete your own review.

**Response `204 No Content`**
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

#### `POST /api/events/{eventId}/reviews/{reviewId}/pin` `[Auth]`

Pin a review (host or admin only). Any previously pinned review is unpinned automatically.

**Response `204 No Content`**
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

#### `POST /api/events/{eventId}/reviews/{reviewId}/replies` `[Auth]`

Reply to a review.

**Request body**
```json
{ "comment": "Thanks for the feedback!" }
```

**Response `201 Created`** — the reply object.

---

#### `POST /api/events/{eventId}/reviews/{reviewId}/vote` `[Auth]`

Like or dislike a review. Calling again with the same or a different value updates the existing vote.

**Request body**
```json
{ "isLike": true }
```

**Response `204 No Content`**

---

### Subscription Endpoints

All subscription endpoints require authentication.

#### `GET /api/subscriptions` `[Auth]`

List all hosts you are currently following, ordered by name.

**Response `200 OK`** — array of `{ hostId, name, subscribedAt }`.

---

#### `POST /api/subscriptions/{hostId}` `[Auth]`

Follow a host.

**Response `204 No Content`**
**Response `400 Bad Request`** — cannot follow yourself.
**Response `404 Not Found`** — host user does not exist.
**Response `409 Conflict`** — already following.

---

#### `DELETE /api/subscriptions/{hostId}` `[Auth]`

Unfollow a host.

**Response `204 No Content`**
**Response `404 Not Found`**

---

#### `GET /api/subscriptions/subscribers` `[Auth]`

View the users who follow you (your subscribers as a host), ordered by name.

**Response `200 OK`** — array of `{ subscriberId, name, subscribedAt }`.

---

### Tag Endpoints

#### `GET /api/tags`

Return all tags, ordered alphabetically.

**Response `200 OK`**
```json
[
  { "id": 1,  "name": "Music" },
  { "id": 2,  "name": "Technology" },
  { "id": 3,  "name": "Business" },
  { "id": 4,  "name": "Arts" },
  { "id": 5,  "name": "Food & Drink" },
  { "id": 6,  "name": "Health & Wellness" },
  { "id": 7,  "name": "Education" },
  { "id": 8,  "name": "Entertainment" },
  { "id": 9,  "name": "Gaming" },
  { "id": 10, "name": "Outdoor" },
  { "id": 11, "name": "Charity" },
  { "id": 12, "name": "Family" }
]
```

---

### Category Endpoints

#### `GET /api/categories`

Return all event categories.

**Response `200 OK`**
```json
[
  { "id": 1, "name": "Conference" },
  { "id": 2, "name": "Workshop" },
  { "id": 3, "name": "Concert" },
  { "id": 4, "name": "Sports" },
  { "id": 5, "name": "Networking" },
  { "id": 6, "name": "Other" }
]
```

---

### Administration Endpoints

All endpoints in this section (except `/register`) accept an `Admin` or `SuperAdmin` JWT — the `[Admin]` label below means both roles are accepted. The `/register` endpoint is key-protected and open to unauthenticated callers; it is the only way to create a `SuperAdmin` account.

#### Role hierarchy

```
Attendee  →  can book, review, follow hosts, create events
Admin     →  all of the above + full system administration panel
             (user/event/booking management, categories, tags, stats, loyalty adjustments)
SuperAdmin→  all of the above + create SuperAdmin accounts via registration key
```

---

#### `POST /api/admin/register`

Create a `SuperAdmin` account. Protected by the `AdminSettings:RegistrationKey` from configuration — anyone without it cannot create a SuperAdmin.

**Request body**
```json
{
  "name": "Root Admin",
  "email": "admin@example.com",
  "password": "SecurePassword123!",
  "registrationKey": "CHANGE_THIS_ADMIN_SECRET_KEY_IN_PRODUCTION"
}
```

**Response `200 OK`** — same JWT auth response as regular login, with `"role": "SuperAdmin"`.
**Response `401 Unauthorized`** — wrong registration key.
**Response `409 Conflict`** — email already in use.

---

#### `GET /api/admin/users` `[Admin]`

List all users in the system.

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Filter by name or email |
| `role` | string | Filter by role (`Attendee`, `Admin`, `SuperAdmin`) |
| `isSuspended` | bool | Filter by suspension status |

**Response `200 OK`** — array of user summaries including `isSuspended`, `loyaltyTier`, event count, and confirmed booking count.

---

#### `GET /api/admin/users/{id}` `[Admin]`

Full user profile plus up to 10 recent bookings and 10 recent events.

**Response `200 OK`** — detailed user object.
**Response `404 Not Found`**

---

#### `POST /api/admin/users/{id}/suspend` `[Admin]`

Suspend a user. Suspended users receive `"Your account has been suspended"` on next login attempt. Cannot suspend another `SuperAdmin`.

**Response `204 No Content`**
**Response `400 Bad Request`** — target is a SuperAdmin.
**Response `404 Not Found`**

---

#### `POST /api/admin/users/{id}/unsuspend` `[Admin]`

Restore a suspended user's access.

**Response `204 No Content`**
**Response `404 Not Found`**

---

#### `PUT /api/admin/users/{id}/role` `[Admin]`

Promote or demote a user's role between `Attendee` and `Admin`. Cannot change a `SuperAdmin`'s role.

**Request body**
```json
{ "role": "Admin" }
```

**Response `204 No Content`**
**Response `400 Bad Request`** — invalid role or target is SuperAdmin.
**Response `404 Not Found`**

---

#### `POST /api/admin/users/{id}/adjust-points` `[Admin]`

Add or deduct loyalty points. Use a positive `delta` to add, negative to deduct. Points floor at 0.

**Request body**
```json
{ "delta": -500 }
```

**Response `200 OK`** — `{ "userId", "loyaltyPoints", "loyaltyTier" }`.

---

#### `GET /api/admin/events` `[Admin]`

List **all** events: every status (`Active`, `Cancelled`, `Postponed`), every visibility (`public` and `private`), and including suspended events.

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Filter by title or description |
| `isSuspended` | bool | Filter by suspension status |
| `status` | string | Filter by event status |

**Response `200 OK`** — array of admin event objects including `isSuspended`.

---

#### `POST /api/admin/events/{id}/suspend` `[Admin]`

Suspend an event. Suspended events are hidden from all public listings and cannot be booked.

**Response `204 No Content`**
**Response `404 Not Found`**

---

#### `POST /api/admin/events/{id}/unsuspend` `[Admin]`

Restore a suspended event to public visibility.

**Response `204 No Content`**
**Response `404 Not Found`**

---

#### `GET /api/admin/bookings` `[Admin]`

List all bookings across the entire system.

| Parameter | Type | Description |
|---|---|---|
| `userId` | int | Filter by user |
| `eventId` | int | Filter by event |
| `status` | string | `Confirmed` or `Cancelled` |

**Response `200 OK`** — array of booking objects with user name, event title, and price.

---

#### `POST /api/admin/categories` `[Admin]`

Create a new event category.

**Request body**
```json
{ "name": "Festival" }
```

**Response `201 Created`** — `{ "id", "name" }`.
**Response `409 Conflict`** — name already exists.

---

#### `PUT /api/admin/categories/{id}` `[Admin]`

Rename a category.

**Response `204 No Content`**
**Response `404 Not Found`**
**Response `409 Conflict`** — name already in use.

---

#### `DELETE /api/admin/categories/{id}` `[Admin]`

Delete a category. Blocked if any events currently reference it.

**Response `204 No Content`**
**Response `404 Not Found`**
**Response `409 Conflict`** — events are using this category.

---

#### `POST /api/admin/tags` `[Admin]`

Create a new tag.

**Request body**
```json
{ "name": "VR" }
```

**Response `201 Created`** — `{ "id", "name" }`.
**Response `409 Conflict`** — name already exists.

---

#### `DELETE /api/admin/tags/{id}` `[Admin]`

Delete a tag. All event-tag associations for this tag are removed automatically.

**Response `204 No Content`**
**Response `404 Not Found`**

---

#### `GET /api/admin/stats` `[Admin]`

System-wide statistics dashboard.

**Response `200 OK`**
```json
{
  "totalUsers": 1200,
  "activeUsers": 1195,
  "suspendedUsers": 5,
  "totalEvents": 340,
  "activeEvents": 280,
  "suspendedEvents": 3,
  "totalBookings": 8500,
  "confirmedBookings": 7900,
  "totalRevenue": 394500.00
}
```

---

### Dev Utility Endpoints

These endpoints are only active when `ASPNETCORE_ENVIRONMENT=Development`. They return `404` in all other environments. All three endpoints require an `Admin` or `SuperAdmin` JWT.

#### `DELETE /api/dev/reset` `[Admin]`

Deletes all user-generated rows (users, events, bookings, reviews, announcements, subscriptions). Seeded categories and tags are preserved.

**Response `200 OK`** — `{ "message": "All data reset. Seeded categories and tags are intact." }`

---

#### `DELETE /api/dev/events/{eventId}` `[Admin]`

Deletes bookings, reviews (with votes and replies), and announcements for a single event. The event itself is preserved.

**Response `200 OK`**
**Response `404 Not Found`**

---

#### `POST /api/dev/seed` `[Admin]`

Creates two users (host + attendee), two events (one upcoming, one past), and one booking so all flows can be tested immediately. Returns credentials in the response body.

**Response `200 OK`** — credentials and IDs for each created resource.
**Response `409 Conflict`** — data already exists; call reset first.

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

```
Users
  id             INTEGER PK
  name           TEXT
  email          TEXT UNIQUE
  passwordHash   TEXT
  role           TEXT      ("Attendee" | "Admin" | "SuperAdmin")
  isSuspended    BOOLEAN
  loyaltyPoints  INTEGER
  createdAt      DATETIME

Categories
  id    INTEGER PK
  name  TEXT

Tags
  id    INTEGER PK
  name  TEXT

Events
  id            INTEGER PK
  title         TEXT
  description   TEXT
  location      TEXT
  startDate     DATETIME
  endDate       DATETIME
  capacity      INTEGER
  price         DECIMAL(18,2)
  isPublic      BOOLEAN
  status        TEXT      ("Active" | "Cancelled" | "Postponed")
  isSuspended   BOOLEAN
  postponedDate DATETIME nullable
  createdAt     DATETIME
  createdById   INTEGER FK → Users.id   (RESTRICT on delete)
  categoryId    INTEGER FK → Categories.id

EventTags                          (many-to-many join)
  eventId  INTEGER FK → Events.id
  tagId    INTEGER FK → Tags.id
  PK (eventId, tagId)

Bookings
  id            INTEGER PK
  bookedAt      DATETIME
  status        TEXT  ("Confirmed" | "Cancelled")
  pointsEarned  INTEGER
  userId        INTEGER FK → Users.id
  eventId       INTEGER FK → Events.id
  UNIQUE (userId, eventId)

Reviews
  id         INTEGER PK
  rating     INTEGER  (1–5)
  comment    TEXT
  isPinned   BOOLEAN
  createdAt  DATETIME
  eventId    INTEGER FK → Events.id
  userId     INTEGER FK → Users.id
  UNIQUE (eventId, userId)

ReviewReplies
  id         INTEGER PK
  comment    TEXT
  createdAt  DATETIME
  reviewId   INTEGER FK → Reviews.id
  userId     INTEGER FK → Users.id

ReviewVotes                        (composite PK)
  reviewId  INTEGER FK → Reviews.id
  userId    INTEGER FK → Users.id
  isLike    BOOLEAN
  PK (reviewId, userId)

HostSubscriptions                  (composite PK)
  subscriberId  INTEGER FK → Users.id  (RESTRICT)
  hostId        INTEGER FK → Users.id  (RESTRICT)
  subscribedAt  DATETIME
  PK (subscriberId, hostId)

Announcements
  id         INTEGER PK
  title      TEXT
  message    TEXT
  createdAt  DATETIME
  eventId    INTEGER FK → Events.id
```

Migrations are managed by EF Core and applied automatically at startup.

---

## Seeded Data

### Categories

| ID | Name |
|----|------|
| 1 | Conference |
| 2 | Workshop |
| 3 | Concert |
| 4 | Sports |
| 5 | Networking |
| 6 | Other |

### Tags

| ID | Name | ID | Name |
|----|------|----|------|
| 1 | Music | 7 | Education |
| 2 | Technology | 8 | Entertainment |
| 3 | Business | 9 | Gaming |
| 4 | Arts | 10 | Outdoor |
| 5 | Food & Drink | 11 | Charity |
| 6 | Health & Wellness | 12 | Family |

---

## Testing

The test suite uses **xUnit** with `Microsoft.AspNetCore.Mvc.Testing` to spin up a real in-process server backed by an SQLite in-memory database.

```bash
cd backend/EventManagement.Tests
dotnet test
```

111 tests across two categories:

| Category | Scope |
|---|---|
| **Unit** | `User` model loyalty tier/discount logic; `AuthService` register & login paths |
| **Integration** | Full HTTP round-trips for Auth, Events, Bookings, Reviews, Subscriptions, Tags & Categories, Dev utilities |

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
