# Plan: Room Admin Role (room-level scoping)

**Source**: Free-form requirement (confirmed answers: multiple rooms per admin, one campus only, new role, same powers as location admin but room-limited, super-admin assigns rooms, invited via existing invitation system)
**Complexity**: Large

## Summary

Add a new `room_admin` role: an administrator bound to **one campus** (`location_id`, like a location admin) but scoped to a **hand-picked set of rooms** in that campus via a many-to-many pivot. Room admins get the same dashboard/calendar/bookings/blackouts/reports/exports/audit powers as location admins, but every query and authorization check is narrowed to their assigned rooms. Super admins assign rooms both when inviting a new room admin and when editing an existing one.

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| Role enum | `app/Enums/UserRole.php` | string-backed enum; `isAdmin()` gate used by middleware/login |
| Location scoping | `app/Models/User.php:143` `hasLocationAccess()` | central access predicate called from policies |
| Query scoping | `app/Services/BookingQueryFilter.php` | shared filter service used by both list + export (no drift) |
| Authorization | `app/Policies/BookingPolicy.php`, `RoomPolicy.php` | per-action policy methods; controllers call `$this->authorize()` |
| Invitation flow | `app/Http/Controllers/Api/AdminInvitationController.php` + `UserManagementController::inviteAdmin` | invite → token → claim → `updateOrCreate` user |
| Cache safety | `AdminCalendarController`, `AdminController::dashboard` | per-user cache keys; plain-array payloads (`serializable_classes => false`) |
| Frontend role gating | `resources/js/pages/admin/*.jsx` | `adminUser?.role === 'location_admin'` conditional UI |
| Tests | `tests/Feature/*.php` | PHPUnit feature tests hitting endpoints with `Sanctum::actingAs` |

## Requirements Restatement (confirmed)

1. **Multiple rooms** per room admin → many-to-many pivot `admin_room_user`
2. **One campus only** → room admin keeps `location_id`; assigned rooms must belong to that campus (validated server-side)
3. **New role** → `room_admin` added to `UserRole` enum (existing roles untouched)
4. **Same powers, room-limited** → everything a location admin can do, restricted to assigned rooms
5. **Super admin only** assigns rooms (invite + edit are already behind `super-admin` middleware)
6. **Invitation flow** → extend existing `admin_invitations` system with a room list

## Design Decisions (flag for confirmation)

- **Room CRUD for room admins**: `update` (incl. images/toggle) allowed **only on assigned rooms**; `create`/`destroy` denied (a room-scoped admin shouldn't create new rooms or delete rooms from the directory). Location admins keep today's campus-wide behavior.
- **Notifications**: room admins receive **email** notifications (same as other admins today — `AdminNewBookingNotification` / `AdminBookingCancelledNotification` are already `via => ['mail']`) for new bookings/cancellations **only for their rooms** (via `NotificationService` recipient query).
- **Bookings list / counts / calendar / reports / exports / audit logs**: filtered by `room_id IN (assigned)` when role is `room_admin`.
- **Admin create-booking modal + blackout modal**: room dropdown limited to assigned rooms.
- **Backward compatibility**: `BookingQueryFilter` gains *optional* `?array $roomIds = null` params — existing call sites and tests keep working unchanged.

## Files to Change

| File | Action | Why |
|---|---|---|
| `app/Enums/UserRole.php` | UPDATE | add `RoomAdmin = 'room_admin'`; include in `isAdmin()` |
| `database/migrations/2026_08_14_000001_create_admin_room_user_table.php` | CREATE | pivot users↔rooms for room-admin scope |
| `database/migrations/2026_08_14_000002_create_admin_invitation_room_table.php` | CREATE | pivot invitations↔rooms |
| `prod-pending-migrations.sql` | UPDATE | append prod SQL for both pivots |
| `app/Models/User.php` | UPDATE | `adminRooms()` BelongsToMany; `isRoomAdmin()`; `hasRoomAccess(Room)`; `adminRoomIds()` |
| `app/Models/AdminInvitation.php` | UPDATE | `rooms()` BelongsToMany |
| `app/Policies/RoomPolicy.php` | UPDATE | room-admin rules (view/update/delete on assigned rooms; create denied) |
| `app/Policies/BookingPolicy.php` | UPDATE | room-admin approve/reject/cancel/view/adminUpdate via `hasRoomAccess` |
| `app/Services/BookingQueryFilter.php` | UPDATE | optional `$roomIds` scoping on bookings/counts/audit-logs |
| `app/Services/ExportService.php` | UPDATE | pass `$roomIds` through to filter |
| `app/Http/Controllers/Api/AdminController.php` | UPDATE | bookings list/counts, dashboard stats/recent, `storeBooking` room check, audit-logs scoping |
| `app/Http/Controllers/Api/AdminCalendarController.php` | UPDATE | index/series scoping + cache-key suffix for room scope |
| `app/Http/Controllers/Api/BlackoutController.php` | UPDATE | index/store/destroy room-level authorization |
| `app/Http/Controllers/Api/ReportController.php` | UPDATE | utilization + peak-hours scoped to assigned rooms |
| `app/Http/Controllers/Api/RoomController.php` | UPDATE | `index` scoping; `store` policy check (deny room admin) |
| `app/Http/Controllers/Api/UserManagementController.php` | UPDATE | invite: accept+validate `room_ids`; edit user: sync rooms; invitations: load rooms |
| `app/Http/Controllers/Api/AdminInvitationController.php` | UPDATE | `validateToken` returns rooms; `claimInvite` attaches pivot rows |
| `app/Services/NotificationService.php` | UPDATE | notify room admins of their rooms' booking events |
| `app/Http/Resources/UserResource.php` | UPDATE | include `admin_rooms` when loaded |
| `app/Notifications/AdminInvitationNotification.php` | UPDATE | role label + assigned-rooms line in email |
| `resources/js/constants/roles.js` | UPDATE | `ROOM_ADMIN` constant; `isAdminRole` |
| `resources/js/pages/admin/Users.jsx` | UPDATE | role filter/badge, invite modal (campus + multi-select rooms), edit modal, invitations tab |
| `resources/js/pages/admin/ClaimInvite.jsx` | UPDATE | role label + scoped-rooms context panel |
| `resources/js/pages/admin/Calendar.jsx` | UPDATE | lock location/room filters to scope for room admin |
| `resources/js/pages/admin/Bookings.jsx` | UPDATE | room filter options limited to assigned rooms |
| `resources/js/pages/admin/Rooms.jsx` | UPDATE | room admin: assigned rooms only; hide create/delete; edit allowed on assigned |
| `resources/js/pages/admin/Reports.jsx` | UPDATE | lock location filter for room admin (server also scopes) |
| `resources/js/components/admin/AdminBookingModal.jsx` | UPDATE | room options limited to assigned rooms |
| `resources/js/components/admin/BlackoutsModal.jsx` | UPDATE | room options limited to assigned rooms |
| `tests/Feature/RoomAdminTest.php` | CREATE | full coverage of the new role (invite, claim, scoping, authorization) |
| `tests/Feature/UserManagementTest.php` | UPDATE | invite/edit validation cases for `room_admin` |

## Tasks

### Task 1: Enum + pivot migrations
- **Action**: Add `RoomAdmin` case to `UserRole` (string `room_admin`, included in `isAdmin()`). Create both pivot migrations (`admin_room_user`: `user_id` FK cascade + `room_id` FK cascade, unique pair, indexes; `admin_invitation_room`: `admin_invitation_id` FK cascade + `room_id`, unique pair). Append matching SQL to `prod-pending-migrations.sql`.
- **Mirror**: existing `admin_invitations` migration style (FKs, indexes).
- **Validate**: `php artisan migrate` runs clean; rollback works.

### Task 2: User/Invitation models + access predicates
- **Action**: `User::adminRooms()` BelongsToMany, `isRoomAdmin()`, `hasRoomAccess(Room $room)` (super → true; location admin → location match; room admin → pivot contains room), `adminRoomIds(): ?Collection` (null for super; room ids for room admin; unused for location admin). `AdminInvitation::rooms()` BelongsToMany.
- **Mirror**: `hasLocationAccess()` style — one predicate reused everywhere.
- **Validate**: `php artisan test --filter=RoomAdminTest` (written in Task 7; initially `php artisan tinker` smoke check of relations).

### Task 3: Policies
- **Action**: `BookingPolicy::approve/reject/cancel/adminUpdate/view` → if `isRoomAdmin()`, require `hasRoomAccess($booking->room)`; `RoomPolicy::view/update/delete` → room admin must own the room; `RoomPolicy::create` → deny room admin.
- **Mirror**: existing per-action methods with `loadMissing('room')` before access checks.
- **Validate**: `php artisan test --filter=RoomAdminTest`

### Task 4: Query/export services + controllers scoping
- **Action**: `BookingQueryFilter::applyBookings/statusCounts/applyAuditLogs` gain optional `?array $roomIds = null` (when set: `whereIn('room_id', $roomIds)` for bookings, `whereHas('booking', fn($q) => $q->whereIn('room_id', $roomIds))` for audit logs). `ExportService` passes it through. `AdminController`: bookings/counts/dashboard/auditLogs compute `$roomIds` from `adminRoomIds()` and pass it; `storeBooking` swaps `hasLocationAccess` check for `hasRoomAccess($room)` when room admin. `AdminCalendarController`: `whereIn('room_id', $roomIds)` for bookings/blackouts/series; append scope segment to cache key. `BlackoutController`: index filter + store/destroy room checks via `hasRoomAccess`. `ReportController`: utilization filters `Room::whereIn('id', $roomIds)`, peakHours `whereIn('room_id', $roomIds)` (precedence over location filter for room admins). `RoomController::index` → `whereIn('id', $roomIds)`; `store` → add `$this->authorize('create', Room::class)`.
- **Mirror**: `BookingQueryFilter` as the single source of truth for list/export semantics.
- **Validate**: `php artisan test` (existing suites must stay green — BC kept via optional params).

### Task 5: Invitation + user management + claim
- **Action**: `inviteAdmin`: add `room_ids` (`required_if:role,room_admin|array|min:1`), each must `exists:rooms,id` **and** belong to the selected campus (closure validation); persist pivot rows. `update` user: same validation; `$user->adminRooms()->sync($roomIds)`; clear pivot when role changes away from room admin. `invitations()` loads `rooms`. `validateToken` returns `rooms` list; `claimInvite` syncs pivot rows inside the existing transaction; include role/rooms in audit log `changes`. `UserResource` adds `admin_rooms` when loaded. `AdminInvitationNotification` adds role label + rooms list.
- **Mirror**: existing invitation lifecycle (`updateOrCreate` on claim, 48h expiry untouched).
- **Validate**: `php artisan test --filter=UserManagementTest`

### Task 6: NotificationService (email)
- **Action**: in `notifyAdminsOfNewBooking` / `notifyAdminsOfCancellation`, include room admins whose `adminRooms` contains `$booking->room_id` (same suspended-status filter). No new notification classes needed — the existing `AdminNewBookingNotification` and `AdminBookingCancelledNotification` are already `via => ['mail']`, so room admins automatically receive the same emails as other admins.
- **Mirror**: existing admin query building + try/catch logging.
- **Validate**: `php artisan test --filter=NotificationCenterTest` + new RoomAdminTest notification case.

### Task 7: Feature tests (TDD anchor)
- **Action**: `tests/Feature/RoomAdminTest.php` covering: room admin login; bookings list shows only assigned rooms (others excluded); approve/reject/cancel/attendance forbidden on other rooms (403), allowed on assigned; dashboard counts scoped; calendar events scoped; blackout create forbidden on other rooms; reports scoped; rooms index scoped + create denied; invite with `room_ids` creates pivot; validation rejects rooms from another campus; claim attaches rooms; notification dispatch for assigned rooms only. Update `UserManagementTest` with room-admin invite/edit cases.
- **Mirror**: existing feature-test style (`Sanctum::actingAs`, factory-based `UserFactory`, `assertJson`, `assertStatus`).
- **Validate**: `php artisan test` — all green.

### Task 8: Frontend
- **Action**: `roles.js` constants; `Users.jsx` — role filter option, room-admin badge (pink/amber), invite modal third role card + campus select + checkbox multi-select of rooms (filtered by campus), edit modal same + pre-selected rooms, invitations tab shows assigned rooms; `ClaimInvite.jsx` — label + rooms list in context panel; `Calendar.jsx` — room admin: lock location filter to own campus, room filter limited to assigned rooms, hide scope dropdowns; `Bookings.jsx` — room filter options limited; `Rooms.jsx` — hide create button for room admin, disable delete/toggle for non-assigned (list is already scoped), allow edit on assigned; `Reports.jsx` — lock location filter; `AdminBookingModal.jsx` + `BlackoutsModal.jsx` — room options limited to assigned rooms. `useAuth`/`UserResource` provides `admin_rooms` ids.
- **Mirror**: existing `isLocationAdmin` conditional UI patterns; `locations.filter(...)` option filtering in `Calendar.jsx`.
- **Validate**: `npm run build`; manual smoke via `php artisan serve` + admin panel.

## Validation

```bash
php artisan migrate --pretend          # review DDL before applying
php artisan migrate                    # apply pivots
php artisan test                       # full suite incl. new RoomAdminTest
npm run build                          # Vite production build
```

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Missing a scoping site (silent data leak to room admin) | MEDIUM | Task 7 tests assert cross-room denial on every admin endpoint; grep for all `isLocationAdmin()` sites in controllers/services during implementation |
| BC break in shared `BookingQueryFilter`/`ExportService` signatures | LOW | Optional params with defaults; existing tests must stay green |
| Invite/edit validation race (rooms from another campus) | LOW | Server-side closure validation on `room_ids` in both `inviteAdmin` and `update` |
| Cache leaking across room-scope changes | LOW | Calendar/dashboard keys already per-user; add room-scope segment to calendar key |
| Frontend shows actions admin can't perform | LOW | Mirror server policy in UI (`admin_rooms` from `UserResource`), server stays authoritative |

## Acceptance

- [ ] `room_admin` exists; middleware/login admit them via `isAdmin()`
- [ ] Room admins only see/act on assigned rooms across: bookings list+counts, dashboard, calendar, blackouts, reports, exports, audit logs, admin-created bookings
- [ ] Room CRUD: edit only assigned rooms; create/delete denied
- [ ] Super admin can invite a room admin with a campus + room list; claim flow attaches rooms; can edit room assignments later
- [ ] Email notifications reach room admins for their rooms only (same emails other admins get)
- [ ] All existing tests green + new `RoomAdminTest` coverage
- [ ] `npm run build` passes
