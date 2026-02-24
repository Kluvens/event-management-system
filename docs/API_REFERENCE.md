# API Reference

Base URL: `http://localhost:5266`

All request/response bodies are JSON. Endpoints marked with `[Auth]` require a `Bearer` token in the `Authorization` header.

---

## Table of Contents

- [Authentication](#authentication-endpoints)
- [Events](#event-endpoints)
- [Bookings](#booking-endpoints)
- [Reviews](#review-endpoints)
- [Subscriptions](#subscription-endpoints)
- [Organizers](#organizer-endpoints)
- [Tags](#tag-endpoints)
- [Categories](#category-endpoints)
- [Administration](#administration-endpoints)
- [Dev Utilities](#dev-utility-endpoints)

---

## Authentication Endpoints

### `POST /api/auth/register`

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

### `POST /api/auth/login`

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

## Event Endpoints

### `GET /api/events`

List events. Anonymous users see only public non-draft events. Authenticated users also see their own private and draft events. Admins see everything.

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

Each event object includes: `id`, `title`, `description`, `location`, `startDate`, `endDate`, `capacity`, `bookingCount`, `price`, `isPublic`, `status`, `displayStatus`, `postponedDate`, `createdAt`, `createdById`, `createdByName`, `categoryId`, `categoryName`, `tags` (string[]).

`displayStatus` is computed at query time:

| Value | Condition |
|---|---|
| `Draft` | Event has not been published yet |
| `Published` | Published, upcoming, has available capacity |
| `Live` | Published and currently in progress (`startDate ≤ now ≤ endDate`) |
| `SoldOut` | Published, not yet started, fully booked |
| `Completed` | Published and `endDate` has passed |
| `Cancelled` | Event was cancelled |
| `Postponed` | Event was postponed to new dates |

---

### `GET /api/events/{id}`

Retrieve a single event by ID. Draft events return `404` for non-owners. Private events return `404` for non-owners.

**Response `200 OK`** — single event object.
**Response `404 Not Found`**

---

### `GET /api/events/{id}/stats` `[Auth]`

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

### `POST /api/events` `[Auth]`

Create a new event. The event starts as **Draft** and is not visible to the public until published.

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

**Response `201 Created`** — the created event object (with `status: "Draft"`).

---

### `POST /api/events/{id}/publish` `[Auth]`

Publish a draft event, making it publicly visible and bookable.

**Response `204 No Content`**
**Response `400 Bad Request`** — event is not in Draft status.
**Response `403 Forbidden`** — not the owner or admin.
**Response `404 Not Found`**

---

### `PUT /api/events/{id}` `[Auth]`

Update an event. Only the event creator or an `Admin` can update. Tags are replaced wholesale.

**Request body** — same fields as create.

**Response `204 No Content`**
**Response `403 Forbidden`** — not the owner or admin.
**Response `404 Not Found`**

---

### `POST /api/events/{id}/cancel` `[Auth]`

Cancel an event. Sets `status` to `Cancelled` and automatically posts a system announcement to attendees.

**Response `204 No Content`**
**Response `400 Bad Request`** — event is already cancelled.
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

### `POST /api/events/{id}/postpone` `[Auth]`

Postpone an event to new dates. Records the original start date in `postponedDate`, sets `status` to `Postponed`, and automatically posts a system announcement to attendees.

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

### `DELETE /api/events/{id}` `[Auth]`

Delete an event. Only the event creator or an `Admin` can delete.

**Response `204 No Content`**
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

### `GET /api/events/{id}/announcements`

List all announcements for an event, ordered by most recent. Includes auto-generated cancellation and postponement announcements.

**Response `200 OK`** — array of `{ id, eventId, eventTitle, title, message, createdAt }`.

---

### `POST /api/events/{id}/announcements` `[Auth]`

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

## Booking Endpoints

All booking endpoints require authentication.

### `GET /api/bookings/mine` `[Auth]`

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
    "eventPrice": 49.99,
    "bookedAt": "2026-03-01T10:30:00Z",
    "status": "Confirmed",
    "pointsEarned": 499,
    "isCheckedIn": false,
    "checkedInAt": null,
    "checkInToken": "a1b2c3d4-e5f6-..."
  }
]
```

---

### `POST /api/bookings` `[Auth]`

Book a spot at an event. Only **Published** (non-Draft) events can be booked. Each booking is assigned a unique `checkInToken` for QR-based check-in.

**Request body**
```json
{ "eventId": 1 }
```

**Response `201 Created`** — the new booking (includes `checkInToken`).
**Response `400 Bad Request`** — event is a draft, fully booked, or cancelled.
**Response `404 Not Found`** — event does not exist.
**Response `409 Conflict`** — user already has a confirmed booking for this event.

> If the user previously cancelled their booking for this event, it is **re-activated** (`Confirmed`) rather than creating a duplicate row.

---

### `DELETE /api/bookings/{id}` `[Auth]`

Cancel a booking (sets status to `Cancelled`). Only the booking owner can cancel. A 7-day cutoff rule applies unless the event itself is cancelled.

**Response `204 No Content`**
**Response `400 Bad Request`** — within 7 days of the event start.
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

### `POST /api/bookings/{id}/checkin` `[Auth]`

Check in an attendee by booking ID. Only the event host or an admin can call this.

**Response `204 No Content`**
**Response `400 Bad Request`** — booking is cancelled or already checked in.
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

### `GET /api/bookings/checkin/{token}` `[Auth]`

Look up booking information by QR token. Used by a host's QR scanner to preview an attendee before checking them in.

**Response `200 OK`**
```json
{
  "bookingId": 5,
  "userId": 12,
  "attendeeName": "Bob Attendee",
  "eventTitle": "Tech Conference 2026",
  "isCheckedIn": false,
  "checkedInAt": null
}
```

**Response `404 Not Found`** — token not found.

---

### `POST /api/bookings/checkin/{token}` `[Auth]`

Check in an attendee via their QR token. Only the event host or an admin can call this.

**Response `204 No Content`**
**Response `400 Bad Request`** — booking is cancelled or already checked in.
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

## Review Endpoints

All write endpoints require authentication.

### `GET /api/events/{eventId}/reviews`

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

### `POST /api/events/{eventId}/reviews` `[Auth]`

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

### `DELETE /api/events/{eventId}/reviews/{reviewId}` `[Auth]`

Delete your own review.

**Response `204 No Content`**
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

### `POST /api/events/{eventId}/reviews/{reviewId}/pin` `[Auth]`

Pin a review (host or admin only). Any previously pinned review is unpinned automatically.

**Response `204 No Content`**
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

### `POST /api/events/{eventId}/reviews/{reviewId}/replies` `[Auth]`

Reply to a review.

**Request body**
```json
{ "comment": "Thanks for the feedback!" }
```

**Response `201 Created`** — the reply object.

---

### `POST /api/events/{eventId}/reviews/{reviewId}/vote` `[Auth]`

Like or dislike a review. Calling again with the same or a different value updates the existing vote.

**Request body**
```json
{ "isLike": true }
```

**Response `204 No Content`**

---

## Subscription Endpoints

All subscription endpoints require authentication.

### `GET /api/subscriptions` `[Auth]`

List all hosts you are currently following, ordered by name.

**Response `200 OK`** — array of `{ hostId, name, subscribedAt }`.

---

### `POST /api/subscriptions/{hostId}` `[Auth]`

Follow a host.

**Response `204 No Content`**
**Response `400 Bad Request`** — cannot follow yourself.
**Response `404 Not Found`** — host user does not exist.
**Response `409 Conflict`** — already following.

---

### `DELETE /api/subscriptions/{hostId}` `[Auth]`

Unfollow a host.

**Response `204 No Content`**
**Response `404 Not Found`**

---

### `GET /api/subscriptions/subscribers` `[Auth]`

View the users who follow you (your subscribers as a host), ordered by name.

**Response `200 OK`** — array of `{ subscriberId, name, subscribedAt }`.

---

## Organizer Endpoints

Endpoints for organizer public profiles, private dashboards, and attendee management.

### `GET /api/organizers/{id}`

View a public organizer profile. Returns the organizer's bio, social links, follower count, and their list of published/live/completed events.

**Response `200 OK`**
```json
{
  "id": 2,
  "name": "Alice Host",
  "bio": "I run tech events across Sydney.",
  "website": "https://alicehost.com",
  "twitterHandle": "@alicehost",
  "instagramHandle": "@alicehost",
  "followerCount": 312,
  "memberSince": "2025-01-15T00:00:00Z",
  "events": [
    {
      "id": 1,
      "title": "Tech Conference 2026",
      "displayStatus": "Published",
      "startDate": "2026-07-15T09:00:00Z",
      "confirmedBookings": 45,
      "capacity": 200
    }
  ]
}
```

**Response `404 Not Found`**

---

### `GET /api/organizers/me/dashboard` `[Auth]`

Private organizer dashboard with aggregate stats across all owned events, plus upcoming and recent event breakdowns.

**Response `200 OK`**
```json
{
  "totalEvents": 8,
  "totalAttendees": 340,
  "totalRevenue": 16990.60,
  "totalCheckedIn": 205,
  "upcomingEvents": [...],
  "recentEvents": [...]
}
```

Each event entry in the lists includes: `eventId`, `title`, `displayStatus`, `startDate`, `confirmedBookings`, `capacity`, `revenue`, `checkedIn`.

**Response `401 Unauthorized`**

---

### `PUT /api/organizers/me/profile` `[Auth]`

Update your organizer profile. Only non-null fields are updated (PATCH semantics).

**Request body**
```json
{
  "bio": "Running tech events since 2022.",
  "website": "https://mysite.com",
  "twitterHandle": "@myhandle",
  "instagramHandle": null
}
```

**Response `204 No Content`**

---

### `GET /api/organizers/me/events/{eventId}/attendees` `[Auth]`

List all attendees (confirmed and cancelled) for one of your events, including check-in status and QR token.

**Response `200 OK`**
```json
[
  {
    "bookingId": 5,
    "userId": 12,
    "name": "Bob Attendee",
    "email": "bob@example.com",
    "bookedAt": "2026-03-01T10:30:00Z",
    "bookingStatus": "Confirmed",
    "isCheckedIn": true,
    "checkedInAt": "2026-07-15T09:14:00Z",
    "checkInToken": "a1b2c3d4-e5f6-..."
  }
]
```

**Response `403 Forbidden`** — not the event owner or admin.
**Response `404 Not Found`**

---

### `GET /api/organizers/me/events/{eventId}/attendees/export` `[Auth]`

Export the attendee list for an event as a CSV file.

**Response `200 OK`** — `text/csv` with headers `BookingId,Name,Email,BookedAt,Status,CheckedIn,CheckedInAt`.

**Response `403 Forbidden`**
**Response `404 Not Found`**

---

### `DELETE /api/organizers/me/events/{eventId}/bookings/{bookingId}` `[Auth]`

Organizer-initiated refund: cancel any booking for your event regardless of the 7-day rule. Loyalty points earned from the booking are deducted from the attendee's account.

**Response `204 No Content`**
**Response `400 Bad Request`** — booking is already cancelled.
**Response `403 Forbidden`**
**Response `404 Not Found`**

---

## Tag Endpoints

### `GET /api/tags`

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

## Category Endpoints

### `GET /api/categories`

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

## Administration Endpoints

All endpoints in this section (except `/register`) accept an `Admin` or `SuperAdmin` JWT — the `[Admin]` label below means both roles are accepted. The `/register` endpoint is key-protected and open to unauthenticated callers; it is the only way to create a `SuperAdmin` account.

### Role hierarchy

```
Attendee  →  can book, review, follow hosts, create events
Admin     →  all of the above + full system administration panel
             (user/event/booking management, categories, tags, stats, loyalty adjustments)
SuperAdmin→  all of the above + create SuperAdmin accounts via registration key
```

---

### `POST /api/admin/register`

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

### `GET /api/admin/users` `[Admin]`

List all users in the system.

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Filter by name or email |
| `role` | string | Filter by role (`Attendee`, `Admin`, `SuperAdmin`) |
| `isSuspended` | bool | Filter by suspension status |

**Response `200 OK`** — array of user summaries including `isSuspended`, `loyaltyTier`, event count, and confirmed booking count.

---

### `GET /api/admin/users/{id}` `[Admin]`

Full user profile plus up to 10 recent bookings and 10 recent events.

**Response `200 OK`** — detailed user object.
**Response `404 Not Found`**

---

### `POST /api/admin/users/{id}/suspend` `[Admin]`

Suspend a user. Suspended users receive `"Your account has been suspended"` on next login attempt. Cannot suspend another `SuperAdmin`.

**Response `204 No Content`**
**Response `400 Bad Request`** — target is a SuperAdmin.
**Response `404 Not Found`**

---

### `POST /api/admin/users/{id}/unsuspend` `[Admin]`

Restore a suspended user's access.

**Response `204 No Content`**
**Response `404 Not Found`**

---

### `PUT /api/admin/users/{id}/role` `[Admin]`

Promote or demote a user's role between `Attendee` and `Admin`. Cannot change a `SuperAdmin`'s role.

**Request body**
```json
{ "role": "Admin" }
```

**Response `204 No Content`**
**Response `400 Bad Request`** — invalid role or target is SuperAdmin.
**Response `404 Not Found`**

---

### `POST /api/admin/users/{id}/adjust-points` `[Admin]`

Add or deduct loyalty points. Use a positive `delta` to add, negative to deduct. Points floor at 0.

**Request body**
```json
{ "delta": -500 }
```

**Response `200 OK`** — `{ "userId", "loyaltyPoints", "loyaltyTier" }`.

---

### `GET /api/admin/events` `[Admin]`

List **all** events: every status (`Draft`, `Published`, `Cancelled`, `Postponed`), every visibility (`public` and `private`), and including suspended events.

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Filter by title or description |
| `isSuspended` | bool | Filter by suspension status |
| `status` | string | Filter by event status |

**Response `200 OK`** — array of admin event objects including `isSuspended`.

---

### `POST /api/admin/events/{id}/suspend` `[Admin]`

Suspend an event. Suspended events are hidden from all public listings and cannot be booked.

**Response `204 No Content`**
**Response `404 Not Found`**

---

### `POST /api/admin/events/{id}/unsuspend` `[Admin]`

Restore a suspended event to public visibility.

**Response `204 No Content`**
**Response `404 Not Found`**

---

### `GET /api/admin/bookings` `[Admin]`

List all bookings across the entire system.

| Parameter | Type | Description |
|---|---|---|
| `userId` | int | Filter by user |
| `eventId` | int | Filter by event |
| `status` | string | `Confirmed` or `Cancelled` |

**Response `200 OK`** — array of booking objects with user name, event title, and price.

---

### `POST /api/admin/categories` `[Admin]`

Create a new event category.

**Request body**
```json
{ "name": "Festival" }
```

**Response `201 Created`** — `{ "id", "name" }`.
**Response `409 Conflict`** — name already exists.

---

### `PUT /api/admin/categories/{id}` `[Admin]`

Rename a category.

**Response `204 No Content`**
**Response `404 Not Found`**
**Response `409 Conflict`** — name already in use.

---

### `DELETE /api/admin/categories/{id}` `[Admin]`

Delete a category. Blocked if any events currently reference it.

**Response `204 No Content`**
**Response `404 Not Found`**
**Response `409 Conflict`** — events are using this category.

---

### `POST /api/admin/tags` `[Admin]`

Create a new tag.

**Request body**
```json
{ "name": "VR" }
```

**Response `201 Created`** — `{ "id", "name" }`.
**Response `409 Conflict`** — name already exists.

---

### `PUT /api/admin/tags/{id}` `[Admin]`

Rename a tag.

**Response `204 No Content`**
**Response `404 Not Found`**

---

### `DELETE /api/admin/tags/{id}` `[Admin]`

Delete a tag. All event-tag associations for this tag are removed automatically.

**Response `204 No Content`**
**Response `404 Not Found`**

---

### `GET /api/admin/stats` `[Admin]`

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

## Dev Utility Endpoints

These endpoints are only active when `ASPNETCORE_ENVIRONMENT=Development`. They return `404` in all other environments. All three endpoints require an `Admin` or `SuperAdmin` JWT.

### `DELETE /api/dev/reset` `[Admin]`

Deletes all user-generated rows (users, events, bookings, reviews, announcements, subscriptions). Seeded categories and tags are preserved.

**Response `200 OK`** — `{ "message": "All data reset. Seeded categories and tags are intact." }`

---

### `DELETE /api/dev/events/{eventId}` `[Admin]`

Deletes bookings, reviews (with votes and replies), and announcements for a single event. The event itself is preserved.

**Response `200 OK`**
**Response `404 Not Found`**

---

### `POST /api/dev/seed` `[Admin]`

Creates two users (host + attendee), two events (one upcoming, one past), and one booking so all flows can be tested immediately. Returns credentials in the response body.

**Response `200 OK`** — credentials and IDs for each created resource.
**Response `409 Conflict`** — data already exists; call reset first.
