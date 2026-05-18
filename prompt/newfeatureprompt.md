**Role:** You are a Senior Full-Stack Engineer specializing in Laravel (PHP) and React (JavaScript/Vite). You write clean, maintainable, and highly efficient code.

**Project Context:** We are working on a "Training Room Booking System". The stack is Laravel (API backend) and React (Frontend). Currently, users can book a single day or create recurring bookings.

**Objective:** Implement a new **"Consecutive Multi-Day Booking"** feature. A user needs to be able to book the exact same time slot across multiple consecutive days (e.g., 9:00 AM to 5:00 PM for 3 days straight: Monday, Tuesday, Wednesday).

**Architectural Strategy:** To preserve the integrity of our existing availability grid (`RoomTimeGrid.jsx`) and backend availability checking, a multi-day booking (e.g., 3 days) must be stored as **3 separate individual booking records** in the database, but tied together via a shared `group_id`.

**Git & Workflow Practices:**
Before starting, ensure you apply standard Git flow practices:

1. Create a new branch: `git checkout -b feature/multi-day-bookings`
2. Make atomic commits after completing each of the phases below (e.g., `git commit -m "feat(db): add group_id to bookings table"`).
3. Do not break existing recurring booking logic; this is an enhancement to standard single/multi-day bookings.

Please execute this implementation in the following sequential phases:

#### **Phase 1: Database & Models**

1. Create a new migration to add a `group_id` (uuid or string, nullable) to the `bookings` table.
2. Update the `app/Models/Booking.php` model to include `group_id` in the `$fillable` array.
3. *Git commit:* "feat(db): add group_id migration and update model"

#### **Phase 2: Backend Validation**

1. Update `app/Http/Requests/Booking/StoreBookingRequest.php`.
2. Add validation rules for `end_date`. It should be optional (to support single-day bookings), but if provided, it must be a valid date, greater than or equal to the `start_date`.
3. Add a rule to limit the maximum duration (e.g., max 14 consecutive days) to prevent abuse and database overload.
4. *Git commit:* "feat(api): add end_date validation to booking request"

#### **Phase 3: Backend Business Logic**

1. Modify `app/Services/BookingService.php` (or the relevant controller if no service pattern is strictly enforced for this method).
2. If `end_date` is provided and is different from `start_date`:
* Generate an array of dates between `start_date` and `end_date`.
* Open a `DB::transaction()`.
* Loop through every date. For each date, call `AvailabilityService` (or the existing availability logic) to ensure the requested time slot is free.
* If any day in the range is unavailable, throw an exception/error and rollback the transaction.
* If all days are available, generate a unique `Str::uuid()` for the `group_id`.
* Insert a booking record for each day, attaching the `group_id`.


3. *Git commit:* "feat(api): implement multi-day booking logic and transaction handling"

#### **Phase 4: Frontend State Management**

1. Locate `resources/js/pages/booking/hooks/useBookingForm.js`.
2. Refactor the state to handle an `endDate` alongside the existing `date` (or `startDate`). Ensure default values fallback to a single-day selection gracefully.
3. *Git commit:* "feat(ui): update booking form hook to support date ranges"

#### **Phase 5: Frontend UI & Date Picker**

1. Update `resources/js/pages/booking/steps/DetailsStep.jsx` to allow the user to select an End Date.
2. If the current `DatePicker.jsx` component supports range selection, configure it. Otherwise, add a second input for "End Date".
3. Update the `ConfirmationStep.jsx` so that the summary reflects the multi-day span (e.g., "May 18, 2026 to May 20, 2026") and properly multiplies any cost/price by the number of days selected.
4. *Git commit:* "feat(ui): implement multi-day selection in booking wizard"

**Constraints & Deliverables:**

* Please provide the exact code changes needed for each file.
* Use Laravel's `Carbon` for date manipulation.
* Ensure error messages on the frontend gracefully explain if *one specific day* within their chosen range is already booked.

Please begin by outputting the code for **Phase 1 and Phase 2**. Wait for my confirmation before proceeding to Phase 3.