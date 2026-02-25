# Frontend Architecture

A single-page application built with **Vite + React 18 + TypeScript** that consumes the .NET REST API. The frontend lives in the `frontend/` directory at the repository root.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Routing & Access Control](#routing--access-control)
5. [State Management](#state-management)
6. [Data Fetching](#data-fetching)
7. [API Layer](#api-layer)
8. [Component Architecture](#component-architecture)
9. [Styling](#styling)
10. [Key Design Decisions](#key-design-decisions)

---

## Tech Stack

| Concern | Library / Tool | Notes |
|---|---|---|
| Build tool | Vite 6 | HMR, `@/` path alias, dev proxy |
| UI framework | React 18 | Strict mode enabled |
| Language | TypeScript 5 (strict) | `noImplicitAny`, `strictNullChecks` |
| Routing | React Router DOM v6 | `createBrowserRouter` + `RouterProvider` |
| Server state | TanStack Query v5 | `useQuery` / `useMutation`, 5-min stale time |
| Client state | Zustand v5 | Auth token + user persisted to `localStorage` |
| HTTP client | Axios | Singleton instance; request/response interceptors |
| Forms | react-hook-form + Zod | `zodResolver` on every form |
| UI components | shadcn/ui | 18 Radix-based components, CSS variable theming |
| Visual effects | Aceternity UI | Spotlight, BackgroundBeams, HoverBorderGradient (inlined) |
| Charts | Recharts | Organiser dashboard BarChart; Admin PieChart + BarChart |
| QR codes | qrcode.react | `QRCodeSVG` on check-in tokens |
| QR scanning | @zxing/browser | `BrowserQRCodeReader` for live camera scanning on `CheckInScannerPage` |
| Animations | framer-motion | Hero section fade-in |
| Date utilities | date-fns | Formatting, relative time |
| Notifications | Sonner | `toast.success` / `toast.error` |
| Dev tools | React Query Devtools | Mounted only in development |

---

## Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- The .NET backend running on `http://localhost:5266` (see main [README](../README.md))

### Install and run

```bash
cd frontend
npm install
npm run dev
```

The dev server starts on `http://localhost:5173`. All `/api/*` requests are proxied to `http://localhost:5266` — no CORS configuration is needed.

### Build for production

```bash
npm run build   # outputs to frontend/dist/
```

### Type-check without building

```bash
npx tsc --noEmit
```

---

## Project Structure

```
frontend/
├── index.html
├── vite.config.ts          # @/ alias + /api proxy
├── tailwind.config.js
├── components.json         # shadcn/ui configuration
└── src/
    ├── main.tsx            # ReactDOM.createRoot entry point
    ├── App.tsx             # QueryClientProvider + RouterProvider + Toaster
    ├── index.css           # Tailwind directives + shadcn CSS variables
    │
    ├── types/
    │   └── index.ts        # All TypeScript interfaces mirroring API DTOs
    │
    ├── lib/
    │   ├── utils.ts        # cn(), formatDate/Time/Currency/Range, STATUS_CONFIG, getInitials
    │   └── queryClient.ts  # Singleton QueryClient (staleTime 5min, retry 1)
    │
    ├── stores/
    │   └── authStore.ts    # Zustand store: token, user, login(), logout(), isAdmin()
    │
    ├── api/                # One file per backend domain
    │   ├── axios.ts        # Axios instance + interceptors
    │   ├── auth.ts
    │   ├── events.ts
    │   ├── bookings.ts     # Includes downloadIcs (blob response)
    │   ├── reviews.ts
    │   ├── subscriptions.ts
    │   ├── organizers.ts
    │   ├── admin.ts
    │   ├── notifications.ts  # useNotifications, useUnreadCount, useMarkRead, useMarkAllRead
    │   ├── waitlist.ts       # useWaitlistPosition, useJoinWaitlist, useLeaveWaitlist
    │   ├── analytics.ts      # useEventAnalytics(eventId, enabled)
    │   └── tagsCategories.ts
    │
    ├── hooks/
    │   └── useDebounce.ts  # Generic debounce hook (default 400ms)
    │
    ├── routes/
    │   ├── index.tsx       # createBrowserRouter with all route definitions
    │   └── ProtectedRoute.tsx  # Auth + role guard wrapper
    │
    ├── layouts/
    │   ├── RootLayout.tsx  # Navbar + <Outlet /> + scroll restoration
    │   └── AuthLayout.tsx  # Dark full-screen layout for login/register
    │
    ├── components/
    │   ├── aceternity/     # Inlined Aceternity UI effects
    │   │   ├── Spotlight.tsx
    │   │   ├── BackgroundBeams.tsx
    │   │   └── HoverBorderGradient.tsx
    │   ├── ui/             # shadcn/ui generated components (do not edit directly)
    │   │   └── *.tsx
    │   ├── EventCard.tsx
    │   ├── EventFilters.tsx
    │   ├── Navbar.tsx
    │   ├── NotificationBell.tsx  # Bell icon + unread badge + dropdown (polls every 30 s)
    │   ├── StatusBadge.tsx
    │   ├── LoadingSpinner.tsx
    │   └── ConfirmDialog.tsx
    │
    ├── features/           # Domain-specific composite components
    │   ├── auth/
    │   │   ├── LoginForm.tsx
    │   │   └── RegisterForm.tsx
    │   ├── events/
    │   │   └── EventForm.tsx   # Shared create/edit form
    │   └── organizer/
    │       └── AttendeeTable.tsx
    │
    └── pages/              # One file per route
        ├── HomePage.tsx
        ├── LoginPage.tsx
        ├── RegisterPage.tsx
        ├── EventDetailPage.tsx        # Waitlist join/leave UI for SoldOut events
        ├── CreateEventPage.tsx
        ├── EditEventPage.tsx
        ├── MyBookingsPage.tsx         # "Add to Calendar" .ics download button
        ├── OrganizerDashboardPage.tsx # Analytics LineChart panel per event
        ├── OrganizerProfilePage.tsx
        ├── CheckInScannerPage.tsx     # Live camera QR scanner + manual token input
        ├── AdminPage.tsx
        └── NotFoundPage.tsx
```

---

## Routing & Access Control

Routes are defined with `createBrowserRouter` in `src/routes/index.tsx`.

### Route Map

| Path | Page | Access |
|---|---|---|
| `/` | `HomePage` | Public |
| `/events/:id` | `EventDetailPage` | Public |
| `/organizers/:id` | `OrganizerProfilePage` | Public |
| `/login` | `LoginPage` | Unauthenticated only |
| `/register` | `RegisterPage` | Unauthenticated only |
| `/events/create` | `CreateEventPage` | Authenticated |
| `/events/:id/edit` | `EditEventPage` | Authenticated (owner or Admin) |
| `/bookings` | `MyBookingsPage` | Authenticated |
| `/dashboard` | `OrganizerDashboardPage` | Authenticated |
| `/checkin` | `CheckInScannerPage` | Authenticated |
| `/admin` | `AdminPage` | Admin or SuperAdmin |
| `*` | `NotFoundPage` | — |

### `ProtectedRoute`

`src/routes/ProtectedRoute.tsx` reads `token` and `user` from the Zustand auth store:

1. No token → redirect to `/login` (preserves `from` location for post-login redirect).
2. Token present + `allowedRoles` specified → checks `user.role`; redirects to `/` on mismatch.
3. Token present + no role restriction → renders `<Outlet />`.

---

## State Management

### Auth Store (`src/stores/authStore.ts`)

Zustand store with `persist` middleware backed by `localStorage` under the key `auth-storage`.

```
State
  token    string | null    — raw JWT
  user     AuthResponse | null  — { userId, name, email, role }

Actions
  login(data: AuthResponse)   — sets token + user
  logout()                    — clears token + user, redirects to /login
  isAdmin()                   — true if role is Admin or SuperAdmin
  isSuperAdmin()              — true if role is SuperAdmin
```

The store is accessed **outside React** (in the Axios interceptor) via `useAuthStore.getState()`, which is a Zustand feature that avoids prop drilling or React context for the HTTP layer.

### Server State (TanStack Query)

All remote data is managed by TanStack Query. No `useState` + `useEffect` for data fetching anywhere in the codebase.

- Singleton `QueryClient` is exported from `src/lib/queryClient.ts` for use in mutation callbacks outside hooks (e.g., cache invalidation inside Axios error handlers).
- `staleTime: 5 * 60 * 1000` — data is considered fresh for 5 minutes; avoids unnecessary refetches on tab focus.
- `retry: 1` — failed requests are retried once before erroring.
- `refetchOnWindowFocus: false` — avoids noisy refetches during development.

---

## Data Fetching

Each API file exports both **raw async functions** (for use outside hooks) and **React Query hooks**. Example pattern from `src/api/events.ts`:

```typescript
// Raw function — usable anywhere
export const eventsApi = {
  list: (filters?: EventFilters) =>
    api.get<Event[]>('/events', { params: filters }).then(r => r.data),
}

// React Query hook — used in components
export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventsApi.list(filters),
  })
}

// Mutation hook with cache invalidation
export function useCreateEvent() {
  return useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event created.')
    },
  })
}
```

### Optimistic Updates

Review voting (`src/api/reviews.ts` → `useVoteReview`) uses TanStack Query's optimistic update pattern:
- `onMutate` — snapshot current data, apply optimistic change
- `onError` — roll back to snapshot
- `onSettled` — invalidate to sync with server

---

## API Layer

### Axios Instance (`src/api/axios.ts`)

```
baseURL: '/api'   (relative — resolved by Vite dev proxy in dev, web server in prod)
```

**Request interceptor** — reads `useAuthStore.getState().token` and attaches it as:
```
Authorization: Bearer <token>
```

**Response interceptor** — on `401 Unauthorized`, calls `useAuthStore.getState().logout()` and redirects to `/login`. This handles token expiry silently without any component-level logic.

### Vite Dev Proxy

`vite.config.ts` forwards all requests from `/api` to `http://localhost:5266`:

```typescript
server: {
  proxy: {
    '/api': { target: 'http://localhost:5266', changeOrigin: true }
  }
}
```

In production, the reverse proxy (Nginx, Caddy, etc.) should forward `/api` to the .NET backend.

---

## Component Architecture

### Layers

```
Pages           — One per route; orchestrate data + layout
  └── Features  — Domain composites (LoginForm, EventForm, AttendeeTable)
        └── Components  — Reusable UI building blocks (EventCard, StatusBadge, ConfirmDialog)
              └── ui/   — shadcn/ui primitives (Button, Dialog, Table …)
```

### Key Components

| Component | Purpose |
|---|---|
| `Navbar` | Sticky header with logo, nav links, `NotificationBell`, and avatar dropdown; mobile Sheet |
| `NotificationBell` | Bell icon with red unread badge; dropdown showing last 8 notifications with `formatDistanceToNow` timestamps; polls unread count every 30 s via `refetchInterval` |
| `EventCard` | Displays event summary with `HoverBorderGradient` border effect |
| `EventFilters` | Debounced search + category/tag/sort/date-range controls |
| `StatusBadge` | Maps `EventStatus` → coloured pill; `Live` status shows animated ping dot |
| `ConfirmDialog` | Reusable destructive-action dialog with loading state |
| `LoadingSpinner` | Centred `Loader2` spinner for full-page loading states |
| `EventForm` | Shared create/edit form; pre-populates tag checkboxes on edit via `useEffect` |
| `AttendeeTable` | Searchable attendee list with check-in button, QR modal, and CSV export |

### Aceternity UI

Three Aceternity UI components are inlined in `src/components/aceternity/` (not installed from npm):

| Component | Used in |
|---|---|
| `Spotlight` | `HomePage` hero section |
| `BackgroundBeams` | `AuthLayout` (login/register backgrounds) |
| `HoverBorderGradient` | `EventCard` animated border on hover |

---

## Styling

- **Tailwind CSS v3** with the `tailwindcss-animate` plugin.
- **shadcn/ui CSS variables** — HSL tokens defined in `src/index.css` under `:root` and `.dark` selectors. Primary colour: indigo (`238 82% 58%`).
- Custom Tailwind keyframes in `tailwind.config.js`: `spotlight`, `shimmer`, `border-spin`.
- All component styling is utility-class based; no CSS modules or styled-components.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Relative `/api` base URL | Works with Vite dev proxy in development and a reverse proxy in production without code changes |
| Axios interceptors for auth | Centralises token injection and 401 handling; no per-request boilerplate |
| Singleton `QueryClient` | Allows cache invalidation inside mutation `onSuccess` callbacks that run outside component scope |
| Zustand `getState()` in Axios | Accesses auth token without React context; Zustand supports this as a first-class pattern |
| `isPending` not `isLoading` | TanStack Query v5 renamed `isLoading` → `isPending` for mutations; used consistently |
| `sonner` for toasts | Simpler API than Radix Toast; no provider required beyond `<Toaster />` in `App.tsx` |
| Aceternity UI inlined | Avoids an npm package dependency for three small visual components; easier to customise |
| `useEffect` for tag pre-population in `EventForm` | Tag IDs from the API arrive asynchronously after component mount; `setValue` is called once data resolves |
| `ProtectedRoute` preserves `from` | Users are redirected back to the originally requested URL after logging in |
