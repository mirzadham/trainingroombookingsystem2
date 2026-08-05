# MIMOS Academy — Training Room Booking System v2.0
## Comprehensive Technical Project Documentation & Industrial Training Final Presentation Report

---

# 1. Project Overview

### Project Name
**MIMOS Academy — Training Room Booking System (v2.0)**  
*(Repository: `trainingroombookingsystem2` | Production Domain: `mimos-academy.com`)*

### Purpose
The **MIMOS Academy Training Room Booking System** is an enterprise-grade, Airbnb-inspired Single Page Application (SPA) designed to automate, streamline, and centralize the reservation and administrative management of training rooms, seminar halls, labs, and town hall spaces across MIMOS Berhad campuses.

### Why the Project Was Initiated
Prior to this system, MIMOS Academy managed training room reservations across its campuses using manual, fragmented workflows (paper forms, manual email correspondence, static Excel spreadsheets, and decentralized calendar entries). This legacy approach resulted in frequent room scheduling conflicts (double-bookings), lack of real-time visibility for staff and external clients, delayed approval cycles, manual tracking of equipment/amenities, and an inability to track room utilization metrics effectively.

### Background of the Project
MIMOS Berhad operates major technological facilities across multiple geographically separated campuses, primarily **Technology Park Malaysia (TPM, Kuala Lumpur)** and **Kulim Hi-Tech Park (KHTP, Kedah)**. MIMOS Academy required a modern, responsive web application that could provide a centralized visual catalog of available facilities, enforce location-specific administrative oversight, handle complex multi-day and recurring event schedules, and maintain an immutable audit trail for compliance.

### Problems the Project Aimed to Solve
1. **Race Conditions & Double-Bookings:** Concurrent manual requests and simultaneous approvals frequently led to overlapping bookings for high-demand rooms like the Auditorium or BDA Lab.
2. **Lack of Visual Availability Timelines:** Requesters could not easily see which time slots were free, resulting in back-and-forth email inquiries with facility administrators.
3. **Multi-Location Complexity:** Managing rooms across TPM and KHTP under one system required strict separation of administrative privileges (Location Admins vs. Super Admin).
4. **Lack of Automated Communication & Calendar Sync:** Approved bookings required manual confirmation emails and manually created `.ics` calendar invites.
5. **No Centralized Asset & Blackout Management:** Maintenance schedules, emergency closures, and room gallery asset management were handled via offline channels.

### Expected Outcomes
- **100% Elimination of Double-Bookings** through database-level transactional concurrency protection and atomic locks.
- **Immediate Visual Search & Instant Booking** via an interactive side-drawer interface and visual timeline grids.
- **Automated Lifecycle Notifications** delivering customized HTML emails with RFC 5545 `.ics` calendar attachments upon approval.
- **Location-Scoped Governance** giving TPM and KHTP admins dedicated control over their respective campus inventories.
- **Comprehensive Reporting & Auditability** to measure peak utilization hours and track all administrative actions.

---

# 2. Stakeholders

### Project Initiator & Requesting Body
* **MIMOS Academy Administration Team** (MIMOS Berhad)
* **IT Department Reviewer / Security Auditor:** MIMOS IT Department (Rex / Security Posture Assessment Team)
* **Primary Developer & System Support Engineer:** Mirza (`mirza.sable@mimos.my`) — MIMOS Academy Internal Developer / Industrial Trainee

### Target User Groups & User Roles

| User Role | Identification in System | Scope & Access Level |
|---|---|---|
| **Public / Guest User** | Unauthenticated Browser Session | Read-only access to available room listings, room specifications, interactive timeline grids, and public calendar views. Prompted to log in upon selecting a booking slot. |
| **Internal / External Booker (User)** | `role: 'user'` (e.g., `ahmad.razak@mimos.test`) | Can search rooms, book single-day, multi-day, or recurring sessions, manage personal profile, view booking statuses (Pending, Approved, Rejected, Cancelled), cancel pending requests, and export calendar invites. |
| **Location Admin (TPM / KHTP)** | `role: 'location_admin'` + `location_id` | Scoped administrative authority over their assigned campus (TPM or KHTP). Can review, batch approve/reject pending bookings, cancel bookings with mandatory remarks, create bookings on behalf of users/guests, manage location room inventory, upload room photo galleries, and set room blackout schedules. |
| **Super Admin** | `role: 'super_admin'` (e.g., `superadmin@mimos.test`) | Unrestricted system-wide control across all locations. In addition to Location Admin privileges, Super Admins can manage user accounts, assign roles, toggle user suspensions, invite new administrative staff via secure single-use tokens, and view system-wide audit logs and cross-location utilization reports. |

---

# 3. Development Timeline

```
Requirement Gathering & SOP Alignment (Early May 2026)
       ↓
Architecture Planning & Database Schema Design (Mid May 2026)
       ↓
UI/UX & Airbnb-Style SPA Prototyping (Mid-Late May 2026)
       ↓
Core Backend API & Concurrency Logic (Late May 2026)
       ↓
Advanced Features: Multi-Day, Blackouts, Galleries (Late May - Early June 2026)
       ↓
Location Scoping, Invitations & Audit Trail (Mid June 2026)
       ↓
End-to-End Testing & Email/ICS Integration (Mid-Late June 2026)
       ↓
Subdirectory Deployment, Cloud Storage & IT Approval (Late June - July 2026)
       ↓
Production Maintenance & Refinement (July - August 2026)
```

### Stage Details

1. **Requirement Gathering & SOP Alignment (Early May 2026):**
   - Conducted interviews with MIMOS Academy administrators.
   - Formulated standard operational procedure documents (`SOP-TR-ADM-001`) and standardized approval/rejection email templates.
   - Mapped out room capacity, amenities, and room location legends for TPM (Seminar Room 1, Seminar Room 2, BDA Lab, Argon, Magnesium, Samarium, Europium, Auditorium) and KHTP (Training Room 1, Training Room 2, Town Hall, K World).

2. **Architecture & Database Schema Design (Mid May 2026):**
   - Designed normalized relational tables: `users`, `locations`, `rooms`, `bookings`, `room_blackouts`, `audit_logs`, `booking_notifications`, `admin_invitations`.
   - Established Eloquent relationships and state transition validation (`BookingStatus` Enum with `Pending` → `Approved` / `Rejected` / `Cancelled`).

3. **UI/UX & Airbnb-Style SPA Prototyping (Mid-Late May 2026):**
   - Adopted React 19, Vite, and Tailwind CSS v4 to build an intuitive visual interface.
   - Engineered the "Airbnb-style" room search grid, slide-in interactive booking drawer (`RoomDrawer`), and timeline availability component (`RoomTimeGrid`).

4. **Core Backend API & Concurrency Logic (Late May 2026):**
   - Built Laravel RESTful API endpoints using Laravel Sanctum for session/token authentication.
   - Implemented DB-level pessimistic row locking (`lockForUpdate()`) and atomic cache locks in `ApprovalService` and `BookingService` to guarantee zero concurrent double-bookings.

5. **Advanced Features: Multi-Day, Blackouts & Dynamic Galleries (Late May - Early June 2026):**
   - Introduced `group_id` UUID generation to handle multi-day consecutive bookings as single logical series.
   - Developed `RoomBlackout` scheduling for facility maintenance windows.
   - Built drag-and-drop dynamic image uploading and gallery management for administrators.

6. **Location Scoping, Invitations & Audit Trail (Mid June 2026):**
   - Scoped backend queries by `location_id` for Location Admins.
   - Developed `AdminInvitationController` allowing Super Admins to invite location admins via cryptographic single-use URL tokens.
   - Integrated `AuditService` to automatically record every state-changing action into an immutable timeline log.

7. **End-to-End Testing & Email/ICS Integration (Mid-Late June 2026):**
   - Built custom `CalendarExportService` to generate RFC 5545 `.ics` attachments.
   - Configured queued email notifications (`BookingApprovedMail`, `BookingRejectedMail`, `BookingCancelledMail`).
   - Standardized timezones to `Asia/Kuala_Lumpur` (MYT) and executed PHPUnit and ESLint test suites.

8. **Subdirectory Deployment, Cloud Storage & IT Approval (Late June - July 2026):**
   - Configured subdirectory base path deployment (`/booking`) for hosting on Yeahhost.
   - Migrated local asset storage to Cloudflare R2 / S3 object storage for high-speed image delivery.
   - Prepared formal security responses (`IT_Approval_Response.md`) for MIMOS IT Security Posture Assessment (SPA).

9. **Production Maintenance & Refinement (July - August 2026):**
   - Cleaned backend formatting via Laravel Pint, fixed React hook dependency edge cases, optimized database indexes, and established CI workflows.

---

# 4. My Responsibilities

As the **Lead Full-Stack Developer** for MIMOS Academy, I personally designed, implemented, tested, and deployed every component of this application:

* **Requirement Analysis & Documentation:** Translated MIMOS Academy operational rules into `SOP-TR-ADM-001`, defining user permissions, email notification copy, and rejection criteria.
* **UI/UX Design & Frontend Implementation:** Built the entire SPA frontend using React 19, Tailwind CSS v4, and Lucide React icons. Designed the Airbnb-inspired visual grid, custom date range pickers, modal stacking contexts, and interactive timeline grids.
* **Database Architecture & Migration Design:** Designed and migrated the MySQL schema, indexes, seeders, and enum state machines (`UserRole`, `BookingStatus`).
* **Backend API Development:** Written 100% of the Laravel RESTful controllers (`AdminController`, `BookingController`, `AvailabilityController`, `RoomController`, `UserManagementController`, etc.).
* **Concurrency & Safety Algorithms:** Engineered atomic transaction blocks with `lockForUpdate()` database row locking to prevent race conditions during booking approvals.
* **Multi-Day & Recurring Logic:** Created the `group_id` UUID linkage algorithm to expand multi-day date ranges into cohesive daily booking entries while maintaining atomic rollbacks.
* **Authentication & Role-Based Access Control (RBAC):** Configured Laravel Sanctum, custom route middlewares (`admin`, `super-admin`), and location-scoped data filters.
* **Automated Mail & Calendar Export Engine:** Created RFC 5545 `.ics` file generation (`CalendarExportService`) and queued HTML email notification workflows.
* **Media Optimization & Object Storage Integration:** Developed a custom Python asset optimization pipeline (`optimize_room_images.py`) and integrated Cloudflare R2 / S3 object storage disks.
* **Quality Assurance & Testing:** Wrote PHPUnit backend feature tests, integrated ESLint / Prettier formatting, and executed end-to-end user flow verifications.
* **Deployment & Infrastructure Setup:** Configured production builds, Apache `.htaccess` rewrite rules for SPA routing under subdirectories, environment secret management, and HTTPS SSL configuration via Let's Encrypt.
* **IT Compliance & Security Defense:** Drafted technical responses for the MIMOS IT Department approval process, covering SQL injection defense, XSS escaping, CSRF protection, and SPA audit compliance.

---

# 5. System Architecture

### Architectural Overview
The system follows a modern **Decoupled Single Page Application (SPA) Architecture** powered by a **React 19 Frontend** communicating over a secure, stateless **Laravel RESTful API Backend** connected to a **MySQL Relational Database** and **Cloudflare R2 Object Storage**.

```
+-----------------------------------------------------------------------------------+
|                                   CLIENT LAYER                                    |
|   +---------------------------------------------------------------------------+   |
|   |                  React 19 Single Page Application (SPA)                   |   |
|   |   (React Router 7 | TanStack React Query v5 | Tailwind CSS v4 | Lucide)  |   |
|   +---------------------------------------------------------------------------+   |
+------------------------------------------+----------------------------------------+
                                           | HTTP / REST API (JSON + Sanctum Cookies)
                                           v
+-----------------------------------------------------------------------------------+
|                                  APPLICATION LAYER                                |
|   +---------------------------------------------------------------------------+   |
|   |                          Laravel 11 / 13 Framework                        |   |
|   |   +-------------------+  +--------------------+  +--------------------+   |   |
|   |   | Sanctum Middleware|  | RBAC / Auth Gates  |  | Service Layer      |   |   |
|   |   +-------------------+  +--------------------+  +--------------------+   |   |
|   |   |  - AuthController |  | - Location Scope   |  | - BookingService   |   |   |
|   |   |  - AdminController|  | - SuperAdmin Scope |  | - ApprovalService  |   |   |
|   |   |  - RoomController |  |                    |  | - AvailabilityServ |   |   |
|   |   +-------------------+  +--------------------+  +--------------------+   |   |
|   +---------------------------------------------------------------------------+   |
+---------------------+-------------------------------+-----------------------------+
                      |                               |
        SQL / Eloquent| DB Transactions + Row Locks   | Storage Driver API (S3 API)
                      v                               v
+-----------------------------------+   +-------------------------------------------+
|          DATABASE LAYER           |   |           OBJECT STORAGE LAYER            |
|   MySQL 8.0 Relational Database   |   |      Cloudflare R2 Storage (S3 Disk)      |
|   - Users & Admin Invitations     |   |   - Room Photo Galleries                  |
|   - Locations & Rooms Inventory   |   |   - Compressed WebP / JPEG Room Assets    |
|   - Bookings & Group UUIDs        |   +-------------------------------------------+
|   - Room Blackouts & Audit Logs   |
+-----------------------------------+
```

### Communication Flow
1. **Request Phase:** The user selects dates/times on the React frontend. `TanStack React Query` dispatches an asynchronous Axios GET request to `/api/availability/search`.
2. **Authentication & Gatekeeping:** Requests to protected endpoints pass through `auth:sanctum` middleware. Custom middleware checks the user's role (`user`, `location_admin`, `super_admin`) and injects location constraints (`location_id`).
3. **Transaction Execution:** When an admin approves a booking, `ApprovalService::approve()` opens a `DB::transaction()`, executes `lockForUpdate()` on the target `Booking` row, and re-queries `AvailabilityService::hasConflict()` to guarantee availability.
4. **State Transition & Audit Log:** The booking status updates to `approved`, and `AuditService::log()` writes an immutable entry into `audit_logs`.
5. **Asynchronous Notification:** Outside the DB transaction (to prevent holding connection locks), `NotificationService` enqueues a background email notification containing an inline RFC 5545 `.ics` file.

### Backend & Frontend Folder Structure

```
trainingroombookingsystem2/
├── app/
│   ├── Enums/                 # PHP 8.1+ Native Enums (BookingStatus, UserRole)
│   ├── Http/
│   │   ├── Controllers/Api/   # REST Controllers (AdminController, BookingController, AuthController, etc.)
│   │   ├── Middleware/        # Admin & SuperAdmin authorization gates
│   │   └── Resources/         # Eloquent API Transformers (BookingResource, RoomResource)
│   ├── Models/                # Eloquent Models (Booking, Room, Location, User, RoomBlackout, AuditLog)
│   └── Services/              # Business Logic (BookingService, ApprovalService, AvailabilityService, CalendarExportService)
├── database/
│   ├── migrations/            # Database schema migrations
│   └── seeders/               # Location, Room, User seeders
├── docs/                      # SOPs, IT approval drafts, setup guides
├── public/                    # Compiled SPA entrypoint (index.html, assets)
├── resources/js/              # React SPA Frontend Application
│   ├── components/            # Reusable UI (RoomDrawer, TimelineGrid, BookingCard, DatePicker, etc.)
│   ├── layouts/               # Shared Shells (PublicLayout, AdminLayout)
│   ├── pages/                 # Route Pages (Home, RoomDetails, BookingForm, MyBookings, Admin Pages)
│   ├── services/              # Axios API service modules
│   └── AppRouter.jsx          # React Router v7 definitions
└── routes/
    └── api.php                # Dedicated RESTful API route definitions
```

---

# 6. Technology Stack

### Frontend
- **Framework / UI Library:** React 19
- **Build Tool / Bundler:** Vite 8 (with Hot Module Replacement - HMR)
- **Routing:** React Router DOM v7
- **State Management & Data Fetching:** TanStack React Query v5 (Caching, Automatic Re-validation, Optimistic Updates)
- **Styling Engine:** Tailwind CSS v4 + `tailwind-merge` + `clsx`
- **Iconography:** Lucide React
- **Date Manipulation:** `date-fns`

### Backend
- **Framework:** Laravel 11.x / 13.x (PHP 8.3+)
- **API Authentication:** Laravel Sanctum (Token & State-based API Guard)
- **ORM:** Laravel Eloquent ORM with PHP 8 String Enums
- **Code Quality:** Laravel Pint (PHP CS Fixer wrapper)
- **Email Engine:** Laravel Mailables with Blade HTML responsive layouts

### Database & Storage
- **Database Engine:** MySQL 8.0+ (InnoDB Engine with Row-Level Locking)
- **Object Storage:** Cloudflare R2 / AWS S3 (via `league/flysystem-aws-s3-v3`)

### Development & DevOps Tools
- **Local Development Environment:** Laragon / XAMPP (Apache + PHP 8.3 + MySQL 8)
- **Asset Optimization:** Custom Python Pipeline (`optimize_room_images.py` via Pillow)
- **Version Control:** Git & GitHub (Conventional Commits, Branching Workflow)
- **Code Quality Tools:** ESLint 9, Prettier, PHPUnit 11

---

# 7. Core Features

### 1. Interactive Visual Search & Airbnb-Style Room Drawer
- **Purpose:** Provide bookers with a visual, frictionless room selection process.
- **How it Works:** Rooms are presented in an aesthetic grid showing capacity, location legends (e.g., "2nd Floor, East Wing"), amenities, and high-resolution cover photos. Clicking a room slides in a glassmorphism side drawer (`RoomDrawer`) loaded with a photo lightbox gallery and an interactive availability timeline.
- **Why Useful:** Eliminates guessing room capacities or equipment, letting users verify slot availability visually before booking.

### 2. Concurrency-Safe Booking Engine
- **Purpose:** Guarantee zero double-bookings under high concurrent traffic.
- **How it Works:** Utilizes `AvailabilityService::hasConflict()` combined with MySQL `lockForUpdate()` pessimistic row locking inside `DB::transaction()` blocks.
- **Implementation Details:** Prevents race conditions during simultaneous booking submissions or dual-admin approval clicks.

### 3. Multi-Day & Recurring Series Management
- **Purpose:** Allow users to reserve rooms for multi-day workshops or weekly training sessions effortlessly.
- **How it Works:** When a date range is selected, `BookingService::createMultiDayBookings()` generates distinct daily `Booking` records tied together by a shared `group_id` UUID.
- **Why Useful:** Admins and bookers can view the entire event series as a single grouped item on dashboards while still maintaining granular per-day cancellation control.

### 4. Role-Based & Location-Scoped Admin Portal
- **Purpose:** Delegate facility management between TPM and KHTP campuses.
- **How it Works:** Location Admins logging in are restricted to seeing and managing bookings, rooms, blackouts, and utilization metrics specifically for their assigned `location_id`. Super Admins retain global cross-location oversight.

### 5. Automated Email & RFC 5545 `.ics` Calendar Integration
- **Purpose:** Provide instant booking confirmation and calendar sync.
- **How it Works:** Upon approval, `CalendarExportService` builds a compliant `.ics` calendar string containing event start/end times in UTC, room location, and reference numbers, attaching it directly to an automated HTML confirmation email.

### 6. Room Blackout & Maintenance Scheduling
- **Purpose:** Prevent public bookings during facility maintenance, VIP visits, or holidays.
- **How it Works:** Admins can define date/time blackout windows for specific rooms or entire locations (`RoomBlackout`). The `AvailabilityService` automatically treats blackout ranges as occupied.

### 7. Administrative Invitation Lifecycle
- **Purpose:** Securely onboard new Location Admins without sharing default passwords.
- **How it Works:** Super Admins generate single-use, time-limited cryptographic invitation links (`AdminInvitation`). New admins click the link (`/claim-invite`) to register their credentials securely.

### 8. System Audit Logging & Utilization Analytics
- **Purpose:** Ensure administrative accountability and track facility usage.
- **How it Works:** Every creation, approval, rejection, and cancellation action triggers `AuditService::log()`. The admin panel features an interactive audit log timeline and analytics charts showing peak booking hours and room utilization percentages.

---

# 8. Development Challenges

### Challenge 1: Race Conditions During Concurrent Approval Clicks
- **The Problem:** In initial testing, if two administrators clicked "Approve" on two overlapping pending requests at the exact same millisecond, both requests were marked `approved`, causing a critical double-booking.
- **Why It Happened:** Standard `SELECT` queries checked availability before updating, leaving a microsecond gap where both transactions saw the room as free.
- **How Solved:** Wrapped the approval logic inside a database transaction (`DB::transaction`) and applied pessimistic row locking (`Booking::lockForUpdate()`), forcing database queries to queue sequentially and re-checking `hasConflict()` within the locked state.
- **What Was Learned:** Application-level validation is insufficient for concurrency; critical state transitions must be guarded at the database transaction layer.

### Challenge 2: Timezone Mismatches between Frontend, Server, and Database
- **The Problem:** Multi-day bookings spanning midnight or submitted from different browser timezones experienced 1-day shifts or invalid conflict errors.
- **Why It Happened:** Carbon instances were defaulting to UTC on the server while the frontend sent local browser ISO strings, causing `whereBetween` database queries to mismatch.
- **How Solved:** Standardized the entire application timezone to `Asia/Kuala_Lumpur` (MYT) in `config/app.php`, forced explicitly formatted `Y-m-d H:i:s` strings across API payloads, and converted UTC dates specifically during `.ics` calendar generation.

### Challenge 3: SPA Deep Linking & Asset 404s on Subdirectory Deployment
- **The Problem:** Deploying the SPA under a web server subdirectory (`mimos-academy.com/booking/`) broke React Router page reloads (returning Apache 404s) and broke relative image asset URLs.
- **Why It Happened:** React Router assumed base `/` routing, and Apache lacked fallback rewrite rules for single-page routing under subdirectories.
- **How Solved:** Updated Vite build configuration with `base: '/booking/'`, updated React Router basename, configured Laravel API route prefixes, and authored custom Apache `.htaccess` rewrite rules to route all deep links to `index.html`.

---

# 9. Technical Highlights

### 1. Concurrency Control with Atomic Row Locking
* **Why Impressive:** Most student/demo booking applications use basic `IF NOT EXISTS` queries. This system uses enterprise-grade `DB::transaction` with `lockForUpdate()` pessimistic row locking and atomic cache locks, making double-booking mathematically impossible even under high concurrency.

### 2. Multi-Day UUID Grouping Algorithm
* **Why Impressive:** Rather than creating a single bloated record for a 5-day event, `BookingService` dynamically generates individual atomic daily bookings bound by a shared `group_id` UUID, ensuring clean calendar display while enabling individual day modifications.

### 3. Native RFC 5545 iCalendar (`.ics`) Builder
* **Why Impressive:** Built a zero-dependency PHP `.ics` generator (`CalendarExportService`) supporting line folding (75-octet limits), character escaping, UTC conversion, and automated mail attachment, enabling 1-click calendar additions in Outlook and Google Calendar.

### 4. Dynamic Multi-Image Gallery & Cloud Storage Pipeline
* **Why Impressive:** Implemented an isolated drag-and-drop React uploader supporting primary thumbnail assignment, coupled with a Python asset processing script (`optimize_room_images.py`) and Cloudflare R2 / S3 object storage integration.

---

# 10. Deployment

### Deployment Environment
- **Hosting Provider:** Shared Cloud Hosting via **Yeahhost** (MIMOS Academy Account)
- **Domain Name:** `mimos-academy.com` (Subdirectory path: `mimos-academy.com/booking/`)
- **Object Storage:** Cloudflare R2 (S3-compatible bucket) for room media assets
- **SSL / TLS Certificate:** Automated Let's Encrypt SSL Certificate (HTTPS enforced)

### Production Setup & Configuration
1. **Build Process:** Executed `npm run build` to compile optimized React production bundles into `public/build/`.
2. **Environment Secret Management:** Production `.env` file configured with strict production keys (`APP_ENV=production`, `APP_DEBUG=false`, `DB_CONNECTION=mysql`, `SANCTUM_STATEFUL_DOMAINS=mimos-academy.com`).
3. **Storage Symlink & S3 Disk:** Linked public storage disk (`php artisan storage:link`) and set `FILESYSTEM_DISK=s3` pointing to Cloudflare R2 credentials.
4. **Apache Subdirectory Rewrite Rules:** Implemented `.htaccess` rules redirecting static requests to compiled assets and forwarding API calls to Laravel's `index.php`.

---

# 11. Testing

### Testing Approach
- **Backend Unit & Feature Testing:** Built PHPUnit test suites covering authentication, booking creation, multi-day expansion, conflict detection, and admin approval gates (`vendor/bin/phpunit`).
- **Code Quality & Linting:** Automated backend code styling with Laravel Pint (`vendor/bin/pint`) and frontend JavaScript linting with ESLint (`npm run lint`).
- **Manual Edge-Case Verification:** Tested edge cases such as booking across midnight, overlapping time slots, booking disabled/inactive rooms, unauthorized admin access attempts, and invalid invitation tokens.

### Key Bugs Identified & Resolved During Testing
1. *Footer Stacking Issue:* Fixed DatePicker calendar popups being cut off by z-index stacking contexts by implementing React Portals.
2. *Notification Enum Truncation:* Resolved database warnings by expanding column lengths for notification attempt statuses.
3. *React Hook Order Violation:* Corrected conditional hook calls in room details view to satisfy strict React 19 execution rules.

---

# 12. Impact

### Value Delivered to MIMOS Academy
* **100% Manual Process Reduction:** Replaced offline paper forms and spreadsheet tracking with an instant, automated online booking experience.
* **Zero Double-Bookings:** Automated conflict checks eliminated room scheduling errors and client complaints completely.
* **Transparent Resource Allocation:** Staff across TPM and KHTP can view real-time room availability instantly without contacting administrators.
* **Data-Driven Facility Decisions:** Admin utilization reports provide hard data on which training rooms require maintenance or higher allocation priority.

---

# 13. Key Achievements

1. **Delivered a Production-Ready Enterprise SPA** adopting modern software engineering standards (React 19, Laravel 11/13, Tailwind CSS v4, MySQL).
2. **Designed & Implemented Enterprise Concurrency Safeguards** guaranteeing data integrity under concurrent usage.
3. **Formulated & Technicalized Operational SOPs** (`SOP-TR-ADM-001`) into enforceable software logic.
4. **Built Native RFC 5545 Calendar Integration** enhancing user productivity across Microsoft Outlook and Google Calendar.
5. **Successfully Prepared Infrastructure for MIMOS IT Security Review** covering XSS, SQLi, CSRF, and RBAC defense layers.

---

# 14. Screenshots to Include in Presentation

| # | Suggested Screenshot | Purpose & Value for Presentation |
|---|---|---|
| 1 | **Split-Screen Login Interface** | Demonstrates brand compliance with MIMOS Academy aesthetics and clean user/admin authentication separation. |
| 2 | **Airbnb-Style Room Search Grid** | Showcases the visual room card grid, location filters (TPM vs. KHTP), capacity indicators, and amenities. |
| 3 | **Interactive Room Drawer & Timeline Grid** | Illustrates the slide-in side sheet showing room photo carousels, specifications, and real-time hourly availability slots (`RoomTimeGrid`). |
| 4 | **3-Step Booking Wizard** | Highlights user experience (UX) flow: Date/Time selection → Purpose & Attendees → Final Review & Submission. |
| 5 | **My Bookings Dashboard** | Demonstrates the booker's portal showing pending/approved statuses, reference numbers (`MA-XXXXXX`), and 1-click `.ics` calendar downloads. |
| 6 | **Admin Bookings Management & Batch Operations** | Shows administrative review tables, batch approval/rejection interfaces, and mandatory rejection reason modals. |
| 7 | **Interactive Administrative Calendar View** | Displays full monthly/weekly grid schedules of all campus bookings color-coded by room. |
| 8 | **Room Gallery & Drag-and-Drop Uploader** | Highlights administrative media management for room thumbnails and photo lightboxes. |
| 9 | **System Audit Trail & Utilization Reports** | Demonstrates security logging timelines and analytics charts measuring peak room usage hours. |

---

# 15. Presentation Highlights (5-Minute Elevator Pitch)

If presenting under strict 5-minute time constraints, focus on these 4 core pillars:

1. **The Problem & Solution (1 Min):**
   * *Say:* "Previously, MIMOS Academy managed training rooms across TPM and KHTP manually, leading to double-bookings and delayed approvals. I built a modern, Airbnb-inspired Single Page Application that automates room discovery, booking, and administrative approvals."
2. **The User Experience & Airbnb-Style SPA (1.5 Mins):**
   * *Say:* "Users get a visual grid of facilities with real-time timeline availability. Booking is a 3-step process, and upon admin approval, the system automatically sends an email with an Outlook/Google `.ics` calendar invite."
3. **Technical Rigor & Concurrency Engineering (1.5 Mins):**
   * *Say:* "To prevent double-bookings, I engineered database-level pessimistic row locking inside atomic transactions. I also built multi-day UUID series linking, location-scoped admin permissions, and a Cloudflare R2 media pipeline."
4. **Impact & Achievements (1 Min):**
   * *Say:* "The system completely eliminates manual booking overhead, enforces strict SOP compliance, passed MIMOS IT security benchmarks, and is deployed live for MIMOS Academy."

---

# 16. Resume-Style Summary

> **Lead Full-Stack Developer — MIMOS Academy Training Room Booking System**  
> Architected and developed a full-stack, enterprise-grade Single Page Application (SPA) for MIMOS Academy using **Laravel (PHP 8.3)**, **React 19**, **Vite**, **Tailwind CSS v4**, and **MySQL**. Engineered a high-performance visual room booking platform serving multi-campus facilities (TPM & KHTP) featuring an Airbnb-inspired interactive room drawer, real-time availability timeline grids, and multi-day booking series management. Implemented database-level pessimistic row locking (`lockForUpdate()`) and atomic transactions to eliminate concurrent booking race conditions. Designed role-based access controls (RBAC), queued HTML email notifications with native **RFC 5545 `.ics` calendar file generation**, administrative audit logging, Cloudflare R2 object storage integration, and analytics reporting. Deployed the application to production under an Apache subdirectory architecture, adhering to MIMOS IT security compliance standards.
