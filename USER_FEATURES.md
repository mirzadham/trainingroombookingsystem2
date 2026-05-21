# USER_FEATURES.md — MIMOS Academy Training Room Booking System

> **Version:** 2.0  
> **Last Updated:** 2026-05-20  
> **Scope:** All features accessible to **regular (non-admin) users** — including guest visitors, registered users, and authenticated users.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Access Levels](#2-user-roles--access-levels)
3. [Authentication & Account Management](#3-authentication--account-management)
   - 3.1 [User Registration](#31-user-registration)
   - 3.2 [User Login](#32-user-login)
   - 3.3 [Forgot Password](#33-forgot-password)
   - 3.4 [Reset Password](#34-reset-password)
   - 3.5 [Session Management](#35-session-management)
4. [Home Page & Smart Search](#4-home-page--smart-search)
   - 4.1 [Hero Landing Section](#41-hero-landing-section)
   - 4.2 [Smart Search Bar](#42-smart-search-bar)
   - 4.3 [Platform Statistics](#43-platform-statistics)
5. [Room Discovery & Search Results](#5-room-discovery--search-results)
   - 5.1 [Search Results Grid](#51-search-results-grid)
   - 5.2 [Room Cards](#52-room-cards)
   - 5.3 [Availability Indicators](#53-availability-indicators)
   - 5.4 [Header Search (Refinement)](#54-header-search-refinement)
6. [Room Details Page](#6-room-details-page)
   - 6.1 [Room Presentation](#61-room-presentation)
   - 6.2 [Amenities Display](#62-amenities-display)
   - 6.3 [Interactive Time Grid](#63-interactive-time-grid)
7. [Booking Wizard (Multi-Step Flow)](#7-booking-wizard-multi-step-flow)
   - 7.1 [Step 1 — Booking Details](#71-step-1--booking-details)
   - 7.2 [Step 2 — Your Details (Account)](#72-step-2--your-details-account)
   - 7.3 [Step 3 — Verify Account (Auth Gate)](#73-step-3--verify-account-auth-gate)
   - 7.4 [Step 4 — Confirmation](#74-step-4--confirmation)
   - 7.5 [Live Booking Summary Sidebar](#75-live-booking-summary-sidebar)
   - 7.6 [Draft Persistence](#76-draft-persistence)
8. [My Bookings (Booking Management)](#8-my-bookings-booking-management)
   - 8.1 [Booking List & Grouping](#81-booking-list--grouping)
   - 8.2 [Status Filtering](#82-status-filtering)
   - 8.3 [Booking Cancellation](#83-booking-cancellation)
   - 8.4 [Rejection Reason Display](#84-rejection-reason-display)
9. [Calendar View](#9-calendar-view)
   - 9.1 [Monthly Calendar Grid](#91-monthly-calendar-grid)
   - 9.2 [Event Bars & Color Coding](#92-event-bars--color-coding)
   - 9.3 [Location Filtering](#93-location-filtering)
   - 9.4 [Selected Date Sidebar](#94-selected-date-sidebar)
   - 9.5 [Multi-Day Event Grouping](#95-multi-day-event-grouping)
10. [User Profile & Settings](#10-user-profile--settings)
    - 10.1 [Personal Information](#101-personal-information)
    - 10.2 [Password Change (Security)](#102-password-change-security)
11. [Navigation & Layout](#11-navigation--layout)
    - 11.1 [Header Navigation](#111-header-navigation)
    - 11.2 [User Dropdown Menu](#112-user-dropdown-menu)
    - 11.3 [Mobile Navigation](#113-mobile-navigation)
    - 11.4 [Footer](#114-footer)
12. [Booking Status Lifecycle](#12-booking-status-lifecycle)
13. [Multi-Day & Recurring Bookings](#13-multi-day--recurring-bookings)
14. [Technical Specifications](#14-technical-specifications)

---

## 1. System Overview

The **MIMOS Academy Training Room Booking System** is a full-stack web application that enables MIMOS employees and external users to discover, search, and book training rooms across two primary locations: **TPM** (Technology Park Malaysia) and **KHTP** (Kulim Hi-Tech Park).

### Core User Workflow

```
Home → Search Rooms → View Room Details → Select Time Slot → Booking Wizard → Pending Approval → Managed via My Bookings
```

### Technology Stack

| Layer     | Technology                                       |
|-----------|--------------------------------------------------|
| Frontend  | React 18+ (JSX), React Router v6, TanStack Query |
| Styling   | Tailwind CSS with custom MIMOS design tokens     |
| Icons     | Lucide React                                     |
| Dates     | date-fns                                         |
| Backend   | Laravel 11 (PHP 8.2+)                            |
| Auth      | Laravel Sanctum (token-based)                    |
| Database  | SQLite (development) / MySQL (production)        |
| API       | RESTful JSON API (`/api/*`)                      |
| Build     | Vite                                             |

---

## 2. User Roles & Access Levels

The system defines three role tiers via the `UserRole` enum:

| Role             | Value            | Description                                                |
|------------------|------------------|------------------------------------------------------------|
| **User**         | `user`           | Default role for all registered users. Can search rooms, create bookings, and manage their own reservations. |
| **Location Admin**| `location_admin`| Admin scoped to a specific location (TPM or KHTP). Has access to admin panel for their location only.       |
| **Super Admin**  | `super_admin`    | Full system admin with unrestricted access to all locations, rooms, bookings, reports, and audit logs.       |

### Guest (Unauthenticated) Access

Guests can access the following **without logging in**:
- Home page with search
- Search results with room cards
- Room detail pages with time grid
- Calendar view (read-only)
- Public room listings

Guests are prompted to sign in or register only when they attempt to **submit a booking**.

---

## 3. Authentication & Account Management

All authentication is handled through Laravel Sanctum tokens, with separate storage keys for user and admin sessions (enabling simultaneous sessions).

### 3.1 User Registration

**Route:** `/login` (Register tab)  
**API Endpoint:** `POST /api/auth/register`

| Field               | Type     | Required | Validation                  |
|----------------------|----------|----------|-----------------------------|
| Full Name            | text     | ✅       | —                           |
| Phone Number         | tel      | ✅       | e.g., `+60123456789`        |
| Email                | email    | ✅       | Unique, valid email format  |
| Password             | password | ✅       | Minimum 8 characters        |
| Confirm Password     | password | ✅       | Must match password         |

**Behavior:**
- On successful registration, the user is **automatically logged in** and receives a Sanctum token.
- Token and user data are stored in `localStorage` under `auth_token` and `auth_user` keys.
- User is redirected to the home page.

### 3.2 User Login

**Route:** `/login` (Sign In tab)  
**API Endpoint:** `POST /api/auth/login`

| Field    | Type     | Required |
|----------|----------|----------|
| Email    | email    | ✅       |
| Password | password | ✅       |

**Features:**
- Password visibility toggle (eye icon)
- Tab-based switching between Sign In and Register modes
- Error messages displayed inline (red banner with left border accent)
- Loading spinner during submission
- Auto-redirect to home when already authenticated

### 3.3 Forgot Password

**Route:** `/login` (Forgot Password mode)  
**API Endpoint:** `POST /api/auth/forgot-password`

**Flow:**
1. User clicks "Forgot Password?" link on the login form
2. Form switches to "Forgot Password" mode showing only email field
3. User enters email and clicks "Send Reset Link"
4. Success message displayed: *"We have emailed your password reset link."*
5. User clicks "Back to Sign In" to return to login

### 3.4 Reset Password

**Route:** `/reset-password?token=...&email=...`  
**API Endpoint:** `POST /api/auth/reset-password`

| Field            | Type     | Required |
|------------------|----------|----------|
| Email            | email    | ✅ (pre-filled, disabled) |
| New Password     | password | ✅       |
| Confirm Password | password | ✅       |

**Features:**
- Email is pre-populated from the URL query parameter (disabled/read-only)
- Token is passed from the URL query parameter
- Password visibility toggle
- Client-side password match validation
- On success: animated checkmark with "Password Reset Successful" message
- "Go to Sign In" button redirects to `/login`
- Branded split-screen layout matching the login page

### 3.5 Session Management

- **Dual Session Architecture:** User and admin sessions are stored independently using separate `localStorage` keys:
  - User: `auth_token`, `auth_user`
  - Admin: `admin_token`, `admin_user`
- **Session Restoration:** On app mount, both sessions are verified via API calls (`GET /api/auth/user`)
- **Token Invalidation:** Failed API verification clears the respective session keys
- **Logout:** `POST /api/auth/logout` — clears user session only; admin session is independent

---

## 4. Home Page & Smart Search

**Route:** `/`

### 4.1 Hero Landing Section

The home page features a full-bleed hero section with:
- **Animated background blobs**: Three floating gradient circles (MIMOS purple, indigo, pink) with drift animations
- **Badge**: "Smart Room Booking for MIMOS Academy" with sparkle icon and pulse animation
- **Headline**: Two-line gradient text — "Find Your Perfect / Training Room"
- **Subtitle**: "Book modern, fully equipped training rooms across TPM and KHTP locations instantly."

### 4.2 Smart Search Bar

The central search bar is a glassmorphic card with three filter fields:

| Filter    | Type            | Behavior                                                     |
|-----------|-----------------|--------------------------------------------------------------|
| **Location**  | Dropdown (LocationPicker) | Dynamic — fetches locations from `GET /api/locations`. Options include "All Locations" + each location. |
| **Date**      | DatePicker (custom)       | Calendar picker with minimum date = today. Required field.   |
| **People**    | Number input              | Optional. Filters rooms by capacity (min 1, max 200).        |

**Submit Action:** Navigates to `/search?location_id=...&date=...&attendees=...`

**Design Details:**
- Top gradient accent bar (MIMOS → Pink → Indigo)
- Backdrop blur glassmorphism effect
- Hover scale animation
- "Search Available Rooms" button with gradient and arrow icon

### 4.3 Platform Statistics

Static stats displayed in a glassmorphic card grid (3 columns):
- **2** Locations
- **8+** Training Rooms
- **24/7** Online Booking

Each stat has a gradient text color and hover scale animation.

---

## 5. Room Discovery & Search Results

**Route:** `/search?location_id=...&date=...&attendees=...`

### 5.1 Search Results Grid

**API Endpoint:** `GET /api/rooms/available?date=...&location_id=...&attendees=...`

**Layout:**
- Back button (arrow left) → returns to home
- "Available Rooms" heading
- Summary stats bar: total rooms found, fully available count
- Responsive grid: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)

### 5.2 Room Cards

Each room is rendered as a **RoomCard** component with:
- **Room Image** (16:10 aspect ratio, lazy loaded, hover zoom effect)
- **Availability Badge** (top-right overlay, backdrop blur)
- **Room Name** (bold, hover color change to MIMOS brand)
- **Location** with map pin icon and location code (e.g., "TPM")
- **Capacity** with users icon (e.g., "Up to 40 pax")
- **Amenities** as micro-badges (uppercase, tiny text)

**Click Action:** Navigates to `/rooms/{id}?date={date}`

### 5.3 Availability Indicators

| State               | Badge Text                    | Badge Color         |
|----------------------|-------------------------------|---------------------|
| Fully Available      | "Fully Available"             | Emerald/green       |
| Partially Available  | "X of Y slots available"      | Amber/yellow        |
| Fully Booked         | "Fully Booked"                | Grey (disabled)     |

Fully booked rooms are displayed with reduced opacity (50%) and a `cursor-not-allowed` state.

### 5.4 Header Search (Refinement)

When on the search results page, the header navigation displays a **HeaderSearchPill** component (desktop) or a **HeaderSearchModal** (mobile) for quick search refinement without returning to the home page.

**Desktop (HeaderSearchPill):**
- Compact pill-style search form with Location, Date, and People fields inline
- Auto-initialized with current search parameters

**Mobile (HeaderSearchModal):**
- Full-screen modal triggered by search icon in the header
- Same fields as desktop, optimized for touch

---

## 6. Room Details Page

**Route:** `/rooms/:id?date=...`  
**API Endpoints:**
- `GET /api/rooms/{id}` — Room metadata
- `GET /api/rooms/available?date=...` — Timeline availability

### 6.1 Room Presentation

Two-column layout (stacked on mobile):

**Left Column:**
- **Premium Image**: Full-width with 16:10 aspect ratio, gradient overlay at bottom, location code badge
- **Room Name**: Large extrabold heading
- **Meta Chips**: Location (with map pin) and capacity (with users icon), each in bordered pill
- **Description**: "About this room" section with default fallback text if none provided

### 6.2 Amenities Display

Grid of amenity items (2 columns on mobile, 3 on tablet+):
- Each amenity has an **auto-detected icon** based on keyword matching:
  - `projector` / `screen` → Monitor icon
  - `wifi` / `internet` → Wifi icon
  - `coffee` / `tea` → Coffee icon
  - Default → Maximize icon
- Amenity names are auto-formatted: `snake_case` → `Title Case`

### 6.3 Interactive Time Grid

**Right Column (sticky sidebar):**

The `RoomTimeGrid` component provides a **two-step time selection process**:

#### Step 1 — Select Start Time
- 4-column grid of 24 half-hour slots from **7:00 AM to 7:00 PM**
- Each slot shows formatted time (e.g., "9:00 AM")
- **Available slots**: White background, blue hover border
- **Occupied slots**: Grey, 60% opacity, `cursor-not-allowed`
- Slot status is determined by matching backend timeline data

#### Step 2 — Select Duration
- After selecting a start time, available durations are computed dynamically
- Durations extend from the selected start until:
  - The next occupied slot, OR
  - The end of the operating day (7:00 PM)
- Duration options displayed as selectable cards: "30 min", "1 hr", "1.5 hr", etc.
- Selected duration card shows MIMOS brand ring highlight
- Each card shows end time (e.g., "Until 11:30 AM")

#### Book Now Action
- "Book Now" button becomes active only after both start time AND duration are selected
- Navigates to `/book?room_id=...&room_name=...&location=...&capacity=...&date=...&start_time=...&end_time=...`
- Clears any previous booking draft from `sessionStorage`

---

## 7. Booking Wizard (Multi-Step Flow)

**Route:** `/book?room_id=...&room_name=...&location=...&capacity=...&date=...&start_time=...&end_time=...`  
**API Endpoint:** `POST /api/bookings`

The booking wizard is a **4-step process** (3 steps for already-authenticated users, as the Auth Gate is skipped):

### 7.1 Step 1 — Booking Details

**Fields:**

| Field               | Type     | Required | Validation                                    |
|----------------------|----------|----------|-----------------------------------------------|
| Title / Purpose      | text     | ✅       | Non-empty                                      |
| Description          | textarea | ❌       | Optional free-text                              |
| Number of Attendees  | number   | ✅       | Min 1, max = room capacity                     |

**Additional Feature — Multi-Day Booking:**
- "Book consecutive days" link toggles an **End Date** picker
- End Date must be ≥ the start date
- Allows booking the same time slot across consecutive days
- Each day creates a separate booking record linked by a `group_id`

**Validation:**
- "Next Step" button is disabled if title is empty, attendees is empty/zero, or attendees exceeds capacity
- Over-capacity warning displayed in red

### 7.2 Step 2 — Your Details (Account)

**Fields:**

| Field         | Type  | Required |
|---------------|-------|----------|
| Full Name     | text  | ✅       |
| Email Address | email | ✅       |
| Phone Number  | tel   | ✅       |

**Authenticated User Behavior:**
- Fields are **pre-filled from user profile** (name, email, phone)
- Green "Logged In" banner confirms authentication status
- **"Save these updates to my profile"** checkbox (default: checked) — syncs edited contact details back to the user profile on booking submission
- Button label: **"Submit Booking"** (directly submits without auth gate)

**Guest User Behavior:**
- Fields are blank
- Button label: **"Next Step"** (proceeds to Auth Gate)

### 7.3 Step 3 — Verify Account (Auth Gate)

> **Only shown for unauthenticated users.** Authenticated users skip this step entirely.

**Purpose:** Secure the booking by requiring authentication before submission.

**Two Modes (Tabbed):**

#### Existing User (Login)
| Field    | Type     | Required |
|----------|----------|----------|
| Password | password | ✅       |

- Email is displayed as read-only (from Step 2)
- Button: **"Sign In & Submit Booking"**

#### New User (Register)
| Field            | Type     | Required |
|------------------|----------|----------|
| Password         | password | ✅       |
| Confirm Password | password | ✅       |

- Name, email, and phone are pre-filled from Step 2
- Button: **"Register & Submit Booking"**

**After Successful Auth:** Booking is automatically submitted immediately.

### 7.4 Step 4 — Confirmation

Displayed after successful booking submission:
- **Animated SVG Checkmark** (circle draw + check draw animation)
- **"Booking Submitted!"** heading
- Status: **"Pending Approval"** in amber badge with pulse animation
- **Booking Details Card:**
  - Booking ID(s) — single ID or comma-separated for multi-day
  - Status badge
  - Group ID reference for multi-day bookings (truncated UUID)
  - Day count indicator (e.g., "3 separate records linked under group abc12345")
- **Action Buttons:**
  - "View Bookings" → navigates to `/my-bookings`
  - "New Search" → navigates to `/`

### 7.5 Live Booking Summary Sidebar

**Desktop only (right column, sticky):**
- Shown on Steps 1–3 (hidden on confirmation)
- Top gradient accent bar (MIMOS → Pink → Indigo)
- Displays:
  - Room name and location
  - Date (or date range for multi-day)
  - Time range
  - Capacity limit
  - Live-updating purpose/title as user types
  - Live-updating attendee count

### 7.6 Draft Persistence

All booking form state is **persisted to `sessionStorage`** under the `booking_draft_*` key prefix:
- `booking_draft_room` — Room metadata (from URL params)
- `booking_draft_step` — Current wizard step
- `booking_draft_title` — Booking title
- `booking_draft_description` — Description
- `booking_draft_attendees` — Attendees count
- `booking_draft_endDate` — Multi-day end date
- `booking_draft_guestName` — User name
- `booking_draft_guestEmail` — User email
- `booking_draft_phone` — Phone number

**Purpose:** Users don't lose their draft if they accidentally refresh or navigate away. Draft is cleared on successful submission.

---

## 8. My Bookings (Booking Management)

**Route:** `/my-bookings`  
**API Endpoint:** `GET /api/bookings?status=...`  
**Auth Required:** ✅

### 8.1 Booking List & Grouping

- Bookings are **grouped by month** (e.g., "May 2026", "June 2026") with horizontal line dividers
- Each booking is displayed as a **BookingCard** with:
  - **Left accent border** — color-coded by status (emerald for approved, amber for pending, red for rejected, grey for cancelled)
  - **Title** with status badge
  - **Room name**, location code
  - **Date** (short format, e.g., "May 20")
  - **Time range** (e.g., "09:00 AM – 11:30 AM")
  - **Attendees count**
  - **Phone number** (if provided)

### 8.2 Status Filtering

Tab-style filter pills at the top:

| Tab        | Filter Value | Dot Color    |
|------------|--------------|--------------|
| All        | (none)       | MIMOS purple |
| Pending    | `pending`    | Amber        |
| Approved   | `approved`   | Emerald      |
| Rejected   | `rejected`   | Red          |
| Cancelled  | `cancelled`  | Grey         |

Active tab shows a colored dot indicator and a highlighted background.

### 8.3 Booking Cancellation

- **Cancel button** appears on bookings with status `pending` or `approved`
- Styled as a red outline button with XCircle icon
- **API Endpoint:** `POST /api/bookings/{id}/cancel`
- Uses TanStack Query mutation with automatic query invalidation (list refreshes on cancel)

### 8.4 Rejection Reason Display

When a booking is rejected by an admin with a reason:
- A **red alert box** is displayed below the booking details
- Shows: "**Reason:** {rejection_reason}" with AlertCircle icon
- Uses red-tinted background with bordered container

### Empty & Unauthenticated States

- **Not logged in:** Centered message with CalendarCheck icon, "Sign in to view your bookings" prompt, and "Go to Home" button
- **No bookings:** Centered message with "No bookings yet" prompt and "Browse Rooms" button
- **Loading:** 3 skeleton cards with pulse animation (structured shimmer effect)

---

## 9. Calendar View

**Route:** `/calendar`  
**API Endpoint:** `GET /api/calendar?start_date=...&end_date=...&location_id=...`  
**Auth Required:** ❌ (Public, read-only)

### 9.1 Monthly Calendar Grid

- Full month view with Monday as the first day of the week
- Month navigation: ◀ Previous / ▶ Next buttons
- **Today's date** highlighted with a filled MIMOS-branded circle
- **Selected date** highlighted with ring border and light background
- Clickable dates to view day details in the sidebar

### 9.2 Event Bars & Color Coding

Bookings are rendered as **horizontal bars spanning across days** in the calendar grid:
- Events are assigned **room-based colors** (7 color palette: indigo, rose, teal, amber, purple, blue, emerald)
- Each bar shows: **Title · Room Name** (room name hidden on mobile)
- Multi-day events span across multiple day columns with seamless continuation
- Events are packed into "tracks" (rows) using a bin-packing algorithm to avoid vertical overlap

### 9.3 Location Filtering

- Dropdown filter: "All Locations" + each available location
- Fetches calendar events filtered by `location_id`
- "Book a Room" quick-link button (navigates to home)

### 9.4 Selected Date Sidebar

**Right column (sticky on desktop):**
- Shows the selected date in full format (e.g., "Tuesday, May 20, 2026")
- Booking count summary
- List of events on that date, each showing:
  - Title
  - Room name & location
  - Time range
  - Booked by (user name)
- Color-coded cards matching the calendar bar colors
- Empty state: "No bookings on this date"

### 9.5 Multi-Day Event Grouping

- Events sharing a `group_id` are merged into a single visual bar spanning the date range
- The calendar uses the earliest start and latest end across all grouped events
- Individual day slots are still displayed separately in the sidebar

---

## 10. User Profile & Settings

**Route:** `/profile`  
**Auth Required:** ✅ (redirects to `/login` if not authenticated)

### 10.1 Personal Information

**Tab:** "Personal Info"  
**API Endpoint:** `PUT /api/auth/user`

| Field       | Type  | Required | Pre-filled |
|-------------|-------|----------|------------|
| Full Name   | text  | ✅       | ✅ from profile |
| Email       | email | ✅       | ✅ from profile |
| Phone       | tel   | ❌       | ✅ if set       |
| Department  | text  | ❌       | ✅ if set       |

**Features:**
- **Validation errors** displayed inline below each field (server-side validation)
- **Success message** — green banner with checkmark: "Your profile details have been updated successfully."
- **Error message** — red banner with alert icon
- "Save Changes" button with loading spinner

### 10.2 Password Change (Security)

**Tab:** "Security & Password"  
**API Endpoint:** `PUT /api/auth/user/password`

| Field                | Type     | Required |
|----------------------|----------|----------|
| Current Password     | password | ✅       |
| New Password         | password | ✅       |
| Confirm New Password | password | ✅       |

**Features:**
- Client-side validation: new passwords must match
- Server-side validation: current password verification
- Success message: "Your password has been changed successfully."
- Fields are cleared on successful change
- Page scrolls to top on success/error

### Profile Page Layout

- **Sidebar navigation** (desktop: left column, stacks on mobile):
  - "Personal Info" tab with User icon
  - "Security & Password" tab with Lock icon
- Active tab shows MIMOS-branded highlight
- Content area in a bordered card with shadow

---

## 11. Navigation & Layout

### 11.1 Header Navigation

- **Sticky header** with backdrop blur and semi-transparent white background
- **Left:** MIMOS Academy logo (links to home)
- **Center (desktop only):** HeaderSearchPill on search results page
- **Right:** Navigation links + user menu

**Desktop Nav Links:**
- "Calendar" → `/calendar` (with active indicator underline)
- "My Bookings" → `/my-bookings` (shown only when authenticated)

**Guest State:**
- "Sign In" gradient button → `/login`

### 11.2 User Dropdown Menu

When authenticated, the user avatar button opens a dropdown:
- **User Info:** Name and email display
- **My Profile** → `/profile`
- **My Bookings** → `/my-bookings`
- **Calendar** → `/calendar`
- **Admin Panel** → `/admin` (shown only for admin-role users)
- **Sign Out** — red text, triggers logout

**Avatar:** Gradient circle (MIMOS → Pink) with first letter of user name

### 11.3 Mobile Navigation

- **Hamburger menu** (visible on small screens) toggles a dropdown:
  - Calendar
  - My Profile (if authenticated)
  - My Bookings (if authenticated)
- **Mobile Search Icon** (on search results page) opens `HeaderSearchModal`

### 11.4 Footer

- Centered layout: "© 2026 MIMOS Academy — Training Room Booking System"
- Location note: "TPM & KHTP Locations"
- Semi-transparent backdrop blur with top border

---

## 12. Booking Status Lifecycle

The booking status follows a **defined state machine**:

```
                    ┌──────────── cancelled
                    │
    ┌───────────────┼───────────────┐
    │               │               │
 pending ──────► approved ──────► cancelled
    │
    └──────────► rejected
```

| Transition                | Allowed | Initiated By |
|---------------------------|---------|--------------|
| Pending → Approved        | ✅      | Admin        |
| Pending → Rejected        | ✅      | Admin        |
| Pending → Cancelled       | ✅      | User / Admin |
| Approved → Cancelled      | ✅      | User / Admin |
| Rejected → *              | ❌      | —            |
| Cancelled → *             | ❌      | —            |

### Status Visual Indicators

| Status     | Text Color  | Background        | Dot Color  |
|------------|-------------|-------------------|------------|
| Pending    | Amber-600   | Amber-500/10      | Amber-500  |
| Approved   | Emerald-600 | Emerald-500/10    | Emerald-500|
| Rejected   | Red-600     | Red-500/10        | Red-500    |
| Cancelled  | Slate-500   | Slate-500/10      | Slate-400  |

---

## 13. Multi-Day & Recurring Bookings

### Multi-Day Bookings (User-Facing)

- Initiated from the booking wizard's **"Book consecutive days"** option in Step 1
- User selects an **End Date** ≥ Start Date
- Creates a separate booking record for each day, all sharing the same:
  - `group_id` (UUID)
  - Time slot (start/end time)
  - Room, title, attendees, phone
- Backend processes via `POST /api/bookings/recurring`
- Confirmation step displays all booking IDs and total day count

### Recurring Bookings (API Support)

**API Endpoint:** `POST /api/bookings/recurring`

The backend also supports a `recurrence_group_id` field for recurring booking series, though the current UI utilizes the simpler `group_id` mechanism for multi-day spans.

---

## 14. Technical Specifications

### API Architecture

| Domain          | Client Module   | Key Endpoints                                              |
|-----------------|-----------------|------------------------------------------------------------|
| Authentication  | `authApi.js`    | login, register, logout, forgotPassword, resetPassword, getUser, updateProfile, updatePassword |
| Bookings        | `bookingApi.js` | getBookings, createBooking, cancelBooking, createRecurringBooking |
| Rooms           | `roomApi.js`    | getPublicRooms, getPublicRoom, getRoomsWithTimeline        |
| Availability    | `availabilityApi.js` | searchAvailability, getTimeline, getSuggestions, getLocations, getCalendarEvents |
| Admin           | `adminApi.js`   | (admin-only endpoints, not user-facing)                    |

### Data Models (User-Relevant)

#### User
| Field        | Type     | Notes                           |
|--------------|----------|---------------------------------|
| id           | integer  | Auto-increment PK               |
| name         | string   | Required                        |
| email        | string   | Unique, required                |
| password     | string   | Hashed (bcrypt)                 |
| phone        | string   | Optional                        |
| department   | string   | Optional                        |
| role         | enum     | user / location_admin / super_admin |
| location_id  | integer  | FK → locations (for admin scope)|

#### Booking
| Field               | Type     | Notes                              |
|----------------------|----------|------------------------------------|
| id                   | integer  | Auto-increment PK                  |
| user_id              | integer  | FK → users                         |
| room_id              | integer  | FK → rooms                         |
| title                | string   | Required — purpose of booking      |
| description          | text     | Optional                           |
| start_time           | datetime | Required                           |
| end_time             | datetime | Required                           |
| attendees            | integer  | Required                           |
| phone                | string   | Contact number                     |
| status               | enum     | pending / approved / rejected / cancelled |
| rejection_reason     | text     | Set by admin on rejection          |
| group_id             | string   | UUID for multi-day booking groups  |
| recurrence_group_id  | string   | UUID for recurring series          |
| approved_by          | integer  | FK → users (admin who approved)    |
| approved_at          | datetime | Timestamp of approval              |

#### Room
| Field       | Type    | Notes                                |
|-------------|---------|--------------------------------------|
| id          | integer | Auto-increment PK                    |
| location_id | integer | FK → locations                       |
| name        | string  | Room display name                    |
| capacity    | integer | Maximum attendees                    |
| amenities   | JSON    | Array of amenity strings             |
| description | text    | Optional room description            |
| image_url   | string  | URL to room photo                    |
| is_active   | boolean | Controls visibility in search        |

#### Location
| Field | Type    | Notes                          |
|-------|---------|--------------------------------|
| id    | integer | Auto-increment PK              |
| name  | string  | Full name (e.g., "Technology Park Malaysia") |
| code  | string  | Short code (e.g., "TPM")       |

### Client-Side State Management

| Concern            | Mechanism                                     |
|--------------------|-----------------------------------------------|
| Auth State         | React Context (`AuthProvider` + `useAuth`)    |
| Server Data        | TanStack React Query (caching, mutations)     |
| Booking Draft      | `sessionStorage` (per-field persistence)      |
| Auth Tokens        | `localStorage` (separate user/admin keys)     |
| URL State          | React Router `useSearchParams`                |

### Availability Engine

The system uses a **30-minute slot-based timeline** engine:
- Operating hours: **7:00 AM – 7:00 PM** (24 slots per day)
- Each slot has a status: `available` or `occupied`
- **Only approved bookings** are counted as occupied (pending bookings don't block slots)
- Overlap detection: `(start < existing_end) AND (end > existing_start)`
- Rooms can be filtered by:
  - Location
  - Date
  - Minimum capacity (attendees filter)

### Blackout Periods

- Admins can configure **Room Blackouts** — periods when a room is unavailable
- These are surfaced in the availability timeline as occupied slots
- Managed via `POST /api/admin/blackouts` and `DELETE /api/admin/blackouts/{id}`

---

> **Note:** This document covers all **user-facing features only**. For admin panel features (dashboard, booking management, room management, reports, audit logs, blackout scheduling), see [ADMIN_FEATURES.md](./ADMIN_FEATURES.md).
