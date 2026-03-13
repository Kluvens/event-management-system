# Style Guide

Conventions for both the **ASP.NET Core backend** (C#) and the **React frontend** (TypeScript). Follow these to keep the codebase consistent across contributors.

## Table of Contents
1. [General Principles](#general-principles)
2. [Backend — C#](#backend--c)
   - [Naming](#naming-c)
   - [File & Folder Layout](#file--folder-layout)
   - [Controllers](#controllers)
   - [DTOs](#dtos)
   - [Models](#models)
   - [Services](#services)
   - [Tests](#tests-backend)
3. [Frontend — TypeScript / React](#frontend--typescript--react)
   - [Naming](#naming-ts)
   - [File & Folder Layout](#file--folder-layout-1)
   - [Components](#components)
   - [API Layer](#api-layer)
   - [State Management](#state-management)
   - [Styling](#styling)
   - [Types](#types)
4. [Shared — Git & Files](#shared--git--files)

---

## General Principles

- **Consistency over preference.** Match the patterns already in the file you are editing before introducing a new one.
- **Explicit over implicit.** Name things for what they are, not where they live.
- **Minimal surface area.** Only export what must be public. Only add abstraction when it is needed at least twice.
- **Fail loudly.** Prefer exceptions / error responses over silent fallbacks.

---

## Backend — C#

### Naming (C#)

| Construct | Convention | Example |
|---|---|---|
| Namespace | `PascalCase`, matches folder path | `EventManagement.Controllers` |
| Class / struct / record | `PascalCase` | `BookingsController` |
| Interface | `I` prefix + `PascalCase` | `IStorageService` |
| Method | `PascalCase` | `GetCurrentUserIdAsync` |
| Public property | `PascalCase` | `CheckInToken` |
| Private field | `_camelCase` | `_db`, `_resolver` |
| Local variable | `camelCase` | `confirmedCount`, `userId` |
| Constant | `PascalCase` | `RoleAdmin`, `StatusConfirmed` |
| Async method | Suffix `Async` | `CreateBookingAsync` |
| DTO / request / response | Suffix with role: `Request`, `Response`, `Dto` | `CreateEventRequest`, `BookingResponse` |

### File & Folder Layout

```
backend/EventManagement/
├── Controllers/      # One file per controller
├── DTOs/             # Request/response shapes; group by domain (EventDtos.cs, BookingDtos.cs …)
├── Models/           # EF Core entity classes; one file per entity
├── Services/         # Business logic / infrastructure abstractions
├── Middleware/       # Custom ASP.NET Core middleware
├── Data/             # AppDbContext and migrations
└── Program.cs        # Composition root — DI registrations and pipeline setup
```

- One class per file.
- File name matches the primary type inside it.
- Place migrations in `Data/Migrations/` and never hand-edit them.

### Controllers

- Inherit from `AppControllerBase`.
- Declare the route at class level with `[Route("api/<resource>")]`.
- Use primary constructor injection for simple dependency injection. If a constructor requires non-trivial initialisation logic or argument validation, use a traditional constructor body instead.
- Keep action methods thin: validate input → load data → apply business rule → persist → return DTO. Extract non-trivial logic to a private helper or service.
- Private helpers that build queries or apply filters are prefixed with `Apply` (e.g., `ApplyVisibilityFilter`).
- Constant strings shared across action methods (roles, statuses) go at the top of the class as `private const string`.
- Use section-divider comments (`// ── Section Name ──`) to group related action methods.
- Return errors using `Problem()` (or `ValidationProblem()` for model errors) so that all error responses follow the [ProblemDetails (RFC 7807)](https://datatracker.ietf.org/doc/html/rfc7807) format — this keeps client error handling uniform and Swagger-friendly.

```csharp
// Good
[HttpGet("{id}")]
public async Task<IActionResult> GetById(int id)
{
    var ev = await db.Events
        .Include(e => e.Category)
        .FirstOrDefaultAsync(e => e.Id == id);

    if (ev is null) return NotFound();
    return Ok(MapToResponse(ev));
}

// Good — ProblemDetails for business rule violations
if (event.IsSoldOut)
    return Problem(
        statusCode: StatusCodes.Status400BadRequest,
        detail: "This event is fully booked.");
```

### DTOs

- Use C# `record` types for immutable request/response shapes.
- Group related records in a single `*Dtos.cs` file (e.g., all booking DTOs in `BookingDtos.cs`).
- Use nullable reference types (`string?`) to signal optional fields.
- Validate required fields with `[Required]` and range constraints with `[Range]` on request DTOs.

```csharp
public record CreateEventRequest(
    [Required] string Title,
    [Required] string Description,
    [Required] string Location,
    [Required] DateTime StartDate,
    [Required] DateTime EndDate,
    [Range(0, int.MaxValue)] decimal Price,
    int? CategoryId
);
```

### Models

- Entities are plain C# classes with `{ get; set; }` properties.
- Navigation properties are declared at the bottom of the class, after scalar properties.
- Use `int` for primary keys; use `Guid` only for tokens that must be globally unique (e.g., `CheckInToken`).
- Required string navigation properties are initialised with `= null!;` to satisfy nullable analysis without unnecessary null-checks in business logic.

### Services

- Define an interface (`IFooService`) for every service that has more than one implementation or that needs to be swapped out in tests.
- Register services in `Program.cs`; do not use service locator pattern.
- Background services extend `BackgroundService` and override `ExecuteAsync`.

### Tests (Backend)

- Test class per controller or feature area (e.g., `BookingsControllerTests`).
- Each test class uses its own `CustomWebApplicationFactory` instance — never share state across test classes.
- Use `IAsyncLifetime.InitializeAsync` to seed prerequisite data.
- Helper methods on `ApiClient` encapsulate repeated HTTP calls; keep test bodies focused on assertions.
- Test method names follow `MethodName_Scenario_ExpectedResult`:
  ```
  CreateBooking_WhenEventAtCapacity_Returns409
  CancelBooking_WithinSevenDays_Returns400
  ```
- Do not mock `AppDbContext` or HTTP clients; rely on the in-memory SQLite database.

---

## Frontend — TypeScript / React

### Naming (TS)

| Construct | Convention | Example |
|---|---|---|
| React component | `PascalCase` | `EventCard`, `NotificationBell` |
| Hook | `use` prefix + `PascalCase` | `useDebounce`, `useMyFavoriteIds` |
| Regular function | `camelCase` | `formatCurrency`, `applyVisibilityFilter` |
| Variable / param | `camelCase` | `spotsLeft`, `userId` |
| Constant (module-level) | `UPPER_SNAKE_CASE` | `CATEGORY_GRADIENTS` |
| TypeScript type / interface | `PascalCase` | `Event`, `BookingResponse` |
| File — component | `PascalCase.tsx` | `EventCard.tsx` |
| File — hook / utility | `camelCase.ts` | `useDebounce.ts`, `utils.ts` |
| File — API module | `camelCase.ts` | `bookings.ts`, `events.ts` |

### File & Folder Layout

```
frontend/src/
├── api/              # TanStack Query hooks + axios calls, one file per domain
├── components/       # Shared, reusable components (no page-specific logic)
│   ├── ui/           # shadcn/ui primitives (generated; do not edit unless extending)
│   └── aceternity/   # Third-party animated components
├── features/         # Feature-scoped components not reusable outside their domain
│   ├── auth/
│   ├── events/
│   └── organizer/
├── hooks/            # Custom React hooks
├── layouts/          # Route layout wrappers (RootLayout, AuthLayout)
├── lib/              # Pure utilities and third-party configuration
├── pages/            # One file per route; thin — delegates to features/components
├── routes/           # Router definition and protected-route guards
├── stores/           # Zustand stores
├── types/            # Shared TypeScript types (index.ts)
└── main.tsx          # Entry point
```

### Components

- **One component per file.** Private sub-components used only within that file may co-locate at the top of the same file.
- Export named, not default:
  ```tsx
  // Good
  export function EventCard({ event }: Props) { … }

  // Avoid
  export default function EventCard(…) { … }
  ```
- Define a local `interface Props` (or `type Props`) above the component. Do not inline types in the function signature when they are non-trivial.
- Handlers are defined as named functions inside the component — not inline arrow functions passed to JSX — when they contain more than one statement.
- Keep JSX readable: extract conditional rendering into a named variable when the inline ternary would span more than one line.
- Use `cn()` from `@/lib/utils` for conditional class merging — do not concatenate class strings manually.

```tsx
// Good
const pill = isAlmostFull
  ? { label: 'Almost full', classes: '…' }
  : isStartingSoon
  ? { label: 'Starts soon', classes: '…' }
  : null

// Avoid inline ternary chains in JSX
```

### API Layer

- Each file in `src/api/` owns one domain (e.g., `events.ts` for all event-related calls).
- Export TanStack Query hooks (`useQuery`, `useMutation`) rather than raw fetch functions — pages and components call hooks, not `axios` directly.
- Query keys are defined as constants at the top of the file:
  ```ts
  const EVENTS_KEY = ['events'] as const
  ```
- Mutations call `queryClient.invalidateQueries` on success to keep cached data fresh.
- The shared axios instance lives in `src/api/axios.ts`; do not create additional instances.
- For components already wrapped in a `<Suspense>` boundary, prefer `useSuspenseQuery` over `useQuery` to remove manual `isLoading` handling. This is the direction recommended by TanStack Query v5 and React 19+.

### State Management

- **Server state** (anything fetched from the API): TanStack Query only. Do not copy remote data into Zustand.
- **Client/UI state** (auth session, modal open/closed, theme): Zustand only. Do not use `useState` for state that crosses component boundaries.
- `useAuthStore` in `src/stores/authStore.ts` is the single source of truth for the current user. Read it with the hook inside React; use `useAuthStore.getState()` for access outside the React tree.

### Styling

- **Tailwind CSS** for all styling. Do not write custom CSS unless it cannot be expressed with Tailwind utilities.
- Custom global styles belong in `src/index.css` inside the appropriate `@layer` block.
- The design token palette (colours, radius, etc.) is defined as CSS variables in `src/index.css`. Use semantic tokens (`text-muted-foreground`, `bg-card`, `border`) rather than raw Tailwind colour scales wherever possible, so dark mode works automatically.
- The project font is **Plus Jakarta Sans**. Do not introduce additional web fonts.
- Dark mode is toggled via a `.dark` class on `<html>` (managed by `ThemeContext`). Avoid hard-coded light-only colours.
- Responsive breakpoints follow Tailwind's defaults (`sm`, `md`, `lg`, `xl`). Design mobile-first.

**Spacing and layout pattern:**
```tsx
// Prefer semantic spacing tokens
<div className="flex flex-col gap-4 p-4">

// Use cn() for conditional classes, not string interpolation
<div className={cn('rounded-lg border', isActive && 'border-primary')}>
```

### Types

- All shared types live in `src/types/index.ts`.
- Use `type` for object shapes derived from API responses; use `interface` only when extension / declaration merging is needed.
- Prefer `import type` for type-only imports to keep runtime bundles lean.
- Do not use `any`; use `unknown` and narrow explicitly.

---

## Shared — Git & Files

- **Trailing whitespace:** never. Configure your editor to strip it on save.
- **Line endings:** LF (Unix). The `.gitattributes` file enforces this.
- **File encoding:** UTF-8 without BOM.
- **Max line length:** 120 characters for C#; no hard limit for TypeScript but keep JSX lines readable.
- **Imports order (TypeScript):** external packages → internal absolute (`@/`) → relative (`./`). Use a blank line between groups.
- **Dead code:** delete it rather than commenting it out. Git history is the undo button.
