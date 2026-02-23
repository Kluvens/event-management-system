# User Stories

User stories for the Event Management System, written from the perspective of each role in the system.

---

## Roles

| Role | Description |
|---|---|
| **Guest** | Unauthenticated visitor |
| **Attendee** | Default registered user |
| **Host** | Any registered user who creates events |
| **Admin** | Elevated role with system administration access |
| **SuperAdmin** | Full access; the only role that can create other SuperAdmin accounts |

---

## Authentication

| ID | User Story | Acceptance Criteria |
|---|---|---|
| US-A01 | As a **guest**, I want to register an account so that I can book events and interact with the platform. | Account is created with `Attendee` role; a JWT is returned immediately; duplicate email is rejected with `409`. |
| US-A02 | As a **returning user**, I want to log in with my email and password so that I can access my account. | Valid credentials return a 7-day JWT; invalid credentials or suspended account return `401` with a descriptive message. |
| US-A03 | As an **authenticated user**, I want to change my password so that I can keep my account secure. | Current password must be provided; incorrect current password returns `400`; success returns `204`. |

---

## Events

| ID | User Story | Acceptance Criteria |
|---|---|---|
| US-E01 | As a **guest or attendee**, I want to browse public events so that I can discover what's available. | Returns public, non-suspended, active events; unauthenticated users see only public events; authenticated users also see their own private events. |
| US-E02 | As a **user**, I want to search and filter events by keyword, category, tags, and date range so that I can find relevant events quickly. | Supports `search`, `categoryId`, `tagIds`, `from`, `to`, and `sortBy` query parameters; `sortBy` accepts `date`, `popularity`, and `price`. |
| US-E03 | As a **user**, I want to view full details of a single event so that I can decide whether to book. | Returns full event detail; private events are `404` for non-owners and non-admins. |
| US-E04 | As a **host**, I want to create an event with a title, location, dates, capacity, price, category, and tags so that attendees can find and book it. | Event is created and immediately discoverable; `categoryId` must be valid; `tagIds` are optional; returns `201` with the created event. |
| US-E05 | As a **host**, I want to edit my event so that I can correct details or update information. | Only the event creator or an Admin can update; tags are replaced wholesale on update; returns `204` or `403`. |
| US-E06 | As a **host**, I want to cancel my event so that attendees know it will not proceed. | Sets `status` to `Cancelled`; already-cancelled events return `400`; only owner or Admin can cancel. |
| US-E07 | As a **host**, I want to postpone my event to new dates so that attendees can plan accordingly. | Sets `status` to `Postponed`; records original date in `postponedDate`; cannot postpone a cancelled event. |
| US-E08 | As a **host**, I want to delete my event so that it is permanently removed from the platform. | Only the event creator or an Admin can delete; returns `204` or `403`. |
| US-E09 | As a **host**, I want to view a statistics dashboard for my event so that I can measure performance. | Returns confirmed/cancelled booking counts, occupancy %, revenue, and average rating; only owner or Admin can view. |
| US-E10 | As a **host**, I want to post announcements on my event so that booked attendees are kept informed. | Only owner or Admin can create; announcements are readable by anyone; returns `201` with the announcement. |

---

## Bookings

| ID | User Story | Acceptance Criteria |
|---|---|---|
| US-B01 | As an **attendee**, I want to book a spot at an event so that I can attend. | Booking is created with status `Confirmed`; blocked if event is at capacity; if a cancelled booking already exists it is re-activated rather than duplicated; points are awarded. |
| US-B02 | As an **attendee**, I want to view all my bookings so that I can track upcoming and past events. | Returns all bookings for the authenticated user, ordered by most recent. |
| US-B03 | As an **attendee**, I want to cancel my booking so that I can free up my spot. | Sets booking status to `Cancelled`; only the booking owner can cancel; returns `204` or `403`. |

---

## Reviews

| ID | User Story | Acceptance Criteria |
|---|---|---|
| US-R01 | As an **attendee**, I want to leave a star rating and comment on an event I attended so that I can share my experience. | Requires a confirmed booking and the event must have already started; one review per user per event; rating must be 1–5. |
| US-R02 | As a **user**, I want to read reviews for an event so that I can gauge its quality before booking. | Pinned review always appears first; supports sort by `newest`, `highest`, and `lowest`; includes reply threads. |
| US-R03 | As a **review author**, I want to delete my review so that I can remove content I no longer want public. | Only the review author can delete; returns `204` or `403`. |
| US-R04 | As an **authenticated user**, I want to like or dislike a review so that I can signal its usefulness. | Vote is upserted — calling again with the same or different value updates the existing vote; returns `204`. |
| US-R05 | As an **authenticated user**, I want to reply to a review so that I can engage in discussion. | Any authenticated user can reply; returns `201` with the reply. |
| US-R06 | As a **host**, I want to pin one review on my event so that the most relevant feedback is highlighted. | Only the event owner or an Admin can pin; any previously pinned review is automatically unpinned; returns `204`. |

---

## Subscriptions

| ID | User Story | Acceptance Criteria |
|---|---|---|
| US-S01 | As an **attendee**, I want to follow a host so that I can keep track of their upcoming events. | Cannot follow yourself; duplicate follows return `409`; returns `204` on success. |
| US-S02 | As an **attendee**, I want to unfollow a host I no longer want to follow. | Returns `204` on success; `404` if not following. |
| US-S03 | As an **attendee**, I want to view all the hosts I follow so that I can manage my subscriptions. | Returns list of followed hosts ordered by name. |
| US-S04 | As a **host**, I want to see who follows me so that I can understand my audience. | Returns a list of subscriber names and subscription dates. |

---

## Loyalty Programme

| ID | User Story | Acceptance Criteria |
|---|---|---|
| US-L01 | As an **attendee**, I want to earn loyalty points with each confirmed booking so that I can unlock tier-based discounts. | Points are accrued automatically on booking; tier and discount percentage are returned with auth responses and user profiles. |
| US-L02 | As an **attendee**, I want to know my current tier and discount so that I understand the benefit I receive. | Tier is a computed property based on cumulative points: Standard (0), Bronze (1,000), Silver (5,000), Gold (15,000), Elite (50,000). |

---

## Administration (Admin & SuperAdmin)

| ID | User Story | Acceptance Criteria |
|---|---|---|
| US-AD01 | As an **Admin**, I want to list all users with optional filters so that I can monitor accounts on the platform. | Supports filter by `search`, `role`, and `isSuspended`; returns summary including loyalty tier and booking counts. |
| US-AD02 | As an **Admin**, I want to view the full profile of any user so that I can investigate activity. | Returns detailed profile with up to 10 recent bookings and 10 recent events. |
| US-AD03 | As an **Admin**, I want to suspend a user so that I can enforce platform rules. | Suspended users cannot log in; SuperAdmin accounts cannot be suspended; returns `204` or `400`. |
| US-AD04 | As an **Admin**, I want to unsuspend a user so that I can restore their access. | Sets `isSuspended` to `false`; returns `204`. |
| US-AD05 | As an **Admin**, I want to promote or demote a user between `Attendee` and `Admin` so that I can manage access levels. | Valid target roles are `Attendee` and `Admin` only; SuperAdmin role cannot be assigned or revoked via this endpoint. |
| US-AD06 | As an **Admin**, I want to manually adjust a user's loyalty points so that I can correct discrepancies. | Positive `delta` adds points, negative `delta` deducts; points floor at 0; returns updated point total and tier. |
| US-AD07 | As an **Admin**, I want to list all events regardless of visibility or status so that I can oversee content. | Returns all events including private, cancelled, postponed, and suspended; supports filters for `search`, `isSuspended`, and `status`. |
| US-AD08 | As an **Admin**, I want to suspend an event so that policy-violating events are hidden from users. | Suspended events are hidden from all public listings and cannot be booked; returns `204`. |
| US-AD09 | As an **Admin**, I want to unsuspend an event so that it becomes visible and bookable again. | Sets `isSuspended` to `false`; returns `204`. |
| US-AD10 | As an **Admin**, I want to view all bookings across the system so that I can investigate disputes. | Supports filters for `userId`, `eventId`, and `status`. |
| US-AD11 | As an **Admin**, I want to create, rename, and delete event categories so that the taxonomy stays organised. | New categories require a unique name; deletion is blocked if any events currently reference the category. |
| US-AD12 | As an **Admin**, I want to create and delete tags so that the tagging system stays relevant. | Deleting a tag automatically removes all event-tag associations. |
| US-AD13 | As an **Admin**, I want to view system-wide statistics so that I can assess platform health. | Returns totals for users, active/suspended users, events, active/suspended events, bookings, confirmed bookings, and total revenue. |
| US-AD14 | As a **SuperAdmin**, I want to register a new SuperAdmin account using a secret registration key so that privileged access creation is controlled. | No JWT required; key must match `AdminSettings:RegistrationKey` in configuration; wrong key returns `401`; duplicate email returns `409`. |

---

## Dev Utilities (Development Environment Only)

| ID | User Story | Acceptance Criteria |
|---|---|---|
| US-DV01 | As an **Admin**, I want to reset all user-generated data so that I can start integration tests from a clean slate. | Deletes all users, events, bookings, reviews, announcements, and subscriptions; seeded categories and tags are preserved; requires Admin or SuperAdmin JWT; returns `404` outside Development. |
| US-DV02 | As an **Admin**, I want to seed a minimal sample dataset so that all API flows can be tested immediately. | Creates a host user, an attendee user, an upcoming event, a past event, and one confirmed booking; returns credentials in the response; blocked if data already exists. |
| US-DV03 | As an **Admin**, I want to reset all bookings and reviews for a single event so that I can re-test review flows without affecting other data. | Removes bookings, reviews (with votes and replies), and announcements for the target event; the event itself is preserved. |
