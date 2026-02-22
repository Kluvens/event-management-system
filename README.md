# Event Management System

A full-stack event management platform built as a UNSW COMP3900 capstone project by team **UnderTheC**. The system connects event hosts with customers, supporting event creation, discovery, ticketed bookings, and a loyalty rewards programme.

> **Note:** This README covers the backend only. Frontend documentation will be added separately.

---

## Table of Contents

- [Background](#background)
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
  - [Categories](#category-endpoints)
- [Authentication Flow](#authentication-flow)
- [Database Schema](#database-schema)
- [Seeded Data](#seeded-data)
- [Team](#team)

---

## Background

Modern event ticketing platforms such as Ticketmaster and EventBrite leave a number of gaps in user experience:

- No smart recommendation engine personalised to booking history
- No bulk cancellation for group bookings
- No loyalty or rewards programme to retain frequent customers

This project addresses all three shortcomings by building a backend API that supports:

- JWT-secured user accounts for both hosts and attendees
- Rich event discovery with full-text search and category/date filtering
- Booking management with capacity enforcement and re-activation of cancelled seats
- A foundation for a tiered VIP loyalty programme (points, tiers, priority queuing)

---

## Features

| Area | Capability |
|---|---|
| **Auth** | Register, login, JWT access tokens (7-day expiry) |
| **Roles** | `Attendee` (default) · `Admin` |
| **Events** | Create, read, update, delete with owner / admin guard |
| **Discovery** | Search by keyword, filter by category and date range |
| **Bookings** | Book, view own bookings, cancel (soft-delete to `Cancelled`) |
| **Capacity** | Booking blocked when confirmed seats reach event capacity |
| **Re-booking** | Cancelled bookings can be re-confirmed without a duplicate row |
| **Categories** | Seeded: Conference, Workshop, Concert, Sports, Networking, Other |
| **Swagger UI** | Interactive docs served at `/` with JWT auth support |

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

---

## Project Structure

```
event-management-system/
├── backend/
│   └── EventManagement/
│       ├── Controllers/
│       │   ├── AuthController.cs       # POST /api/auth/register|login
│       │   ├── EventsController.cs     # CRUD /api/events
│       │   ├── BookingsController.cs   # /api/bookings
│       │   └── CategoriesController.cs # GET /api/categories
│       ├── Data/
│       │   └── AppDbContext.cs         # EF Core DbContext + seed data
│       ├── DTOs/
│       │   ├── AuthDtos.cs
│       │   ├── EventDtos.cs
│       │   └── BookingDtos.cs
│       ├── Migrations/                 # EF Core migration history
│       ├── Models/
│       │   ├── User.cs
│       │   ├── Event.cs
│       │   ├── Booking.cs
│       │   └── Category.cs
│       ├── Services/
│       │   ├── AuthService.cs          # Register / login logic
│       │   └── JwtService.cs           # Token generation
│       ├── appsettings.json
│       └── Program.cs                  # DI, middleware, Swagger config
├── swagger.json                        # Generated OpenAPI spec
└── .gitignore
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
  }
}
```

> **Important:** Replace `Jwt:Key` with a strong, randomly generated value before deploying to any non-local environment.

### Run the API

```bash
cd backend/EventManagement
dotnet run
```

The API starts on `http://localhost:5266` by default (see [Properties/launchSettings.json](backend/EventManagement/Properties/launchSettings.json)).

EF Core migrations are applied automatically on startup — the SQLite database and seeded categories are created on first launch.

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

**Response `401 Unauthorized`** — wrong email or password.

---

### Event Endpoints

#### `GET /api/events`

List all events. Supports optional query parameters:

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Full-text search across title, description, location |
| `categoryId` | int | Filter by category |
| `from` | datetime | Events starting on or after this date |
| `to` | datetime | Events starting on or before this date |

Results are ordered by `StartDate` ascending.

**Example**
```
GET /api/events?search=concert&categoryId=3&from=2025-01-01
```

**Response `200 OK`**
```json
[
  {
    "id": 1,
    "title": "Summer Concert",
    "description": "An outdoor concert in the park.",
    "location": "Hyde Park, Sydney",
    "startDate": "2025-07-15T18:00:00Z",
    "endDate": "2025-07-15T22:00:00Z",
    "capacity": 500,
    "bookingCount": 120,
    "createdAt": "2025-01-10T09:00:00Z",
    "createdById": 2,
    "createdByName": "Bob Host",
    "categoryId": 3,
    "categoryName": "Concert"
  }
]
```

---

#### `GET /api/events/{id}`

Retrieve a single event by ID.

**Response `200 OK`** — single event object (same shape as above).
**Response `404 Not Found`**

---

#### `POST /api/events` `[Auth]`

Create a new event. Any authenticated user can act as a host.

**Request body**
```json
{
  "title": "Summer Concert",
  "description": "An outdoor concert in the park.",
  "location": "Hyde Park, Sydney",
  "startDate": "2025-07-15T18:00:00Z",
  "endDate": "2025-07-15T22:00:00Z",
  "capacity": 500,
  "categoryId": 3
}
```

**Response `201 Created`** — the created event object.

---

#### `PUT /api/events/{id}` `[Auth]`

Update an event. Only the event creator or an `Admin` can update.

**Request body** — same fields as create.

**Response `204 No Content`**
**Response `403 Forbidden`** — not the owner or admin.
**Response `404 Not Found`**

---

#### `DELETE /api/events/{id}` `[Auth]`

Delete an event. Only the event creator or an `Admin` can delete.

**Response `204 No Content`**
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
    "eventTitle": "Summer Concert",
    "eventLocation": "Hyde Park, Sydney",
    "eventStartDate": "2025-07-15T18:00:00Z",
    "bookedAt": "2025-03-01T10:30:00Z",
    "status": "Confirmed"
  }
]
```

---

#### `POST /api/bookings` `[Auth]`

Book a spot at an event.

**Request body**
```json
{
  "eventId": 1
}
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

## Database Schema

```
Users
  id            INTEGER PK
  name          TEXT
  email         TEXT UNIQUE
  passwordHash  TEXT
  role          TEXT  ("Attendee" | "Admin")
  createdAt     DATETIME

Categories
  id    INTEGER PK
  name  TEXT

Events
  id           INTEGER PK
  title        TEXT
  description  TEXT
  location     TEXT
  startDate    DATETIME
  endDate      DATETIME
  capacity     INTEGER
  createdAt    DATETIME
  createdById  INTEGER FK → Users.id   (RESTRICT on delete)
  categoryId   INTEGER FK → Categories.id

Bookings
  id        INTEGER PK
  bookedAt  DATETIME
  status    TEXT  ("Confirmed" | "Cancelled")
  userId    INTEGER FK → Users.id
  eventId   INTEGER FK → Events.id
  UNIQUE (userId, eventId)
```

Migrations are managed by EF Core and applied automatically at startup.

---

## Seeded Data

The following categories are seeded by the initial migration and are always present:

| ID | Name |
|----|------|
| 1 | Conference |
| 2 | Workshop |
| 3 | Concert |
| 4 | Sports |
| 5 | Networking |
| 6 | Other |

---

## Team

**UnderTheC** — UNSW COMP3900, submitted 16 June 2023.

| Name | ZID | Role |
|---|---|---|
| Junji Dong | z5258870 | Engineer |
| Redmond Mobbs | z5257080 | Backend Engineer, Scrum Master |
| Jiapeng Yang | z5339252 | Database Engineer |
| Fengyu Wang | z5187561 | Frontend Engineer |
| Hong Zhang | z5257097 | Engineer |
