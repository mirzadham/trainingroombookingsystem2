<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Room;
use App\Models\Location;
use App\Models\User;
use App\Models\AuditLog;
use App\Models\BookingNotification;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;
use Carbon\Carbon;

class SystemIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_complete_booking_system_lifecycle_and_workflows(): void
    {
        // 0. Fake Notifications to verify flow without external server hits
        Notification::fake();

        // 1. SETUP GEOGRAPHICAL LOCATIONS AND ROOMS INVENTORY
        $tpmLocation = Location::create([
            'name' => 'Technology Park Malaysia',
            'code' => 'TPM',
        ]);

        $khtpLocation = Location::create([
            'name' => 'Kulim Hi-Tech Park',
            'code' => 'KHTP',
        ]);

        // Active Rooms
        $roomAlpha = Room::create([
            'location_id' => $tpmLocation->id,
            'name' => 'Auditorium Alpha',
            'capacity' => 50,
            'amenities' => ['projector', 'wifi', 'coffee_machine'],
            'is_active' => true,
        ]);

        $roomBeta = Room::create([
            'location_id' => $tpmLocation->id,
            'name' => 'Seminar Room Beta',
            'capacity' => 20,
            'amenities' => ['projector', 'wifi'],
            'is_active' => true,
        ]);

        // 2. SETUP USER ROLES AND ACCESSIBILITY ACCOUNTS
        $regularUser = User::factory()->create([
            'name' => 'John Doe',
            'email' => 'john@mimos.my',
            'role' => UserRole::User,
            'password' => Hash::make('password123'),
        ]);

        $tpmAdmin = User::factory()->create([
            'name' => 'TPM Location Admin',
            'email' => 'tpmadmin@mimos.my',
            'role' => UserRole::LocationAdmin,
            'location_id' => $tpmLocation->id,
            'password' => Hash::make('password123'),
        ]);

        $superAdmin = User::factory()->create([
            'name' => 'Global Super Admin',
            'email' => 'superadmin@mimos.my',
            'role' => UserRole::SuperAdmin,
            'password' => Hash::make('password123'),
        ]);

        // 3. AUTHENTICATION SERVICES VERIFICATION (LOGIN / ROLES PORTALS)
        // Login as Regular User
        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'john@mimos.my',
            'password' => 'password123',
        ]);
        $loginResponse->assertStatus(200);
        $loginResponse->assertJsonStructure(['token', 'user']);

        // Login as Admin
        $adminLoginResponse = $this->postJson('/api/auth/admin/login', [
            'email' => 'tpmadmin@mimos.my',
            'password' => 'password123',
        ]);
        $adminLoginResponse->assertStatus(200);
        $adminLoginResponse->assertJsonStructure(['token', 'user']);

        // 4. ROOM DISCOVERY & SEARCH CAPABILITIES
        $searchDate = now()->addDays(2)->format('Y-m-d');
        $searchResponse = $this->getJson("/api/rooms/available?location_id={$tpmLocation->id}&date={$searchDate}&attendees=10");
        $searchResponse->assertStatus(200);
        
        // Both rooms should be fully available initially
        $roomsData = $searchResponse->json();
        $this->assertCount(2, $roomsData['rooms']);
        $this->assertEquals('Auditorium Alpha', $roomsData['rooms'][0]['room']['name']);
        $this->assertEquals(24, $roomsData['rooms'][0]['room']['available_slots']);
        $this->assertEquals(24, $roomsData['rooms'][0]['room']['total_slots']);

        // 5. SINGLE-DAY BOOKING CREATION WIZARD FLOW
        $bookingDate = now()->addDays(2);
        $startTime = $bookingDate->copy()->setTime(10, 0, 0)->toDateTimeString();
        $endTime = $bookingDate->copy()->setTime(12, 0, 0)->toDateTimeString();

        $bookingPayload = [
            'room_id' => $roomAlpha->id,
            'title' => 'Product Planning Summit',
            'description' => 'Q3 Roadmap Planning Session',
            'start_date' => $bookingDate->format('Y-m-d'),
            'end_date' => $bookingDate->format('Y-m-d'),
            'start_time' => $startTime,
            'end_time' => $endTime,
            'attendees' => 30,
            'phone' => '+60123456789',
        ];

        $createResponse = $this->actingAs($regularUser)
            ->postJson('/api/bookings', $bookingPayload);

        $createResponse->assertStatus(201);
        $bookingId = $createResponse->json('id');
        $this->assertNotNull($bookingId);

        // Check DB Status
        $this->assertDatabaseHas('bookings', [
            'id' => $bookingId,
            'user_id' => $regularUser->id,
            'room_id' => $roomAlpha->id,
            'status' => 'pending',
        ]);

        // Assert Notification ledger matches state 'pending' due to faking
        $this->assertDatabaseHas('booking_notifications', [
            'user_id' => $regularUser->id,
            'booking_id' => $bookingId,
            'type' => 'submitted',
            'status' => 'pending',
        ]);

        // 6. PREVENTING OVER-CAPACITY BOOKINGS
        $overCapacityPayload = array_merge($bookingPayload, ['attendees' => 100]); // Alpha capacity is 50
        $overCapacityResponse = $this->actingAs($regularUser)
            ->postJson('/api/bookings', $overCapacityPayload);
        $overCapacityResponse->assertStatus(422);
        $overCapacityResponse->assertJsonValidationErrors(['attendees']);

        // 7. MULTI-DAY CONSECUTIVE BOOKINGS CREATION
        $multiDayStart = now()->addDays(3);
        $multiDayEnd = now()->addDays(5); // 3 consecutive days
        $multiDayPayload = [
            'room_id' => $roomBeta->id,
            'title' => 'Training Workshop Series',
            'description' => 'System Boot Camp training',
            'start_date' => $multiDayStart->format('Y-m-d'),
            'end_date' => $multiDayEnd->format('Y-m-d'),
            'start_time' => $multiDayStart->copy()->setTime(9, 0, 0)->toDateTimeString(),
            'end_time' => $multiDayStart->copy()->setTime(11, 0, 0)->toDateTimeString(),
            'attendees' => 15,
            'phone' => '+60123456789',
        ];

        $multiDayResponse = $this->actingAs($regularUser)
            ->postJson('/api/bookings', $multiDayPayload);

        $multiDayResponse->assertStatus(201);
        $multiDayBookings = $multiDayResponse->json();
        $this->assertCount(3, $multiDayBookings);
        $groupId = $multiDayBookings[0]['group_id'];
        $this->assertNotNull($groupId);

        // Verify all 3 separate records were created
        $this->assertEquals(3, Booking::where('group_id', $groupId)->count());

        // 8. ADMINISTRATIVE ACTION FLOW: APPROVE, PESSIMISTIC LOCKING, AUDIT LOGGING
        // Approve first booking as TPM Admin
        $approveResponse = $this->actingAs($tpmAdmin)
            ->postJson("/api/admin/bookings/{$bookingId}/approve");

        $approveResponse->assertStatus(200);
        $this->assertEquals('approved', Booking::find($bookingId)->status->value);
        $this->assertEquals($tpmAdmin->id, Booking::find($bookingId)->approved_by);

        // Verify Audit Log
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $tpmAdmin->id,
            'booking_id' => $bookingId,
            'action' => 'approved',
        ]);

        // 9. OVERLAPPING BOOKINGS CONFLICT RESOLUTION
        // Now that bookingId is approved, let's verify another user cannot book overlapping slot
        $overlappingPayload = [
            'room_id' => $roomAlpha->id,
            'title' => 'Conflicting Meeting',
            'description' => 'Trying to steal the slot',
            'start_date' => $bookingDate->format('Y-m-d'),
            'end_date' => $bookingDate->format('Y-m-d'),
            'start_time' => $startTime, // Identical time
            'end_time' => $endTime,
            'attendees' => 20,
            'phone' => '+60123456788',
        ];

        // Anyone can submit overlapping booking since conflict checks are performed on approval stage
        $overlapUser = User::factory()->create(['role' => UserRole::User]);
        $overlapSubmitResponse = $this->actingAs($overlapUser)
            ->postJson('/api/bookings', $overlappingPayload);
        $overlapSubmitResponse->assertStatus(201);
        $overlapBookingId = $overlapSubmitResponse->json('id');

        // Admin tries to approve overlapping booking - must fail conflict check
        $overlapApproveResponse = $this->actingAs($tpmAdmin)
            ->postJson("/api/admin/bookings/{$overlapBookingId}/approve");
        $overlapApproveResponse->assertStatus(422); // Validation / Business Logic conflict
        $overlapApproveResponse->assertJsonFragment([
            'message' => 'Cannot approve: another booking has been approved for this time slot.',
        ]);

        // 10. ADMINISTRATIVE ACTION FLOW: REJECT (MANDATORY REASON ENFORCED)
        // Reject overlapping booking without reason should fail request validation
        $rejectNoReasonResponse = $this->actingAs($tpmAdmin)
            ->postJson("/api/admin/bookings/{$overlapBookingId}/reject", []);
        $rejectNoReasonResponse->assertStatus(422);

        // Reject with reason
        $rejectWithReasonResponse = $this->actingAs($tpmAdmin)
            ->postJson("/api/admin/bookings/{$overlapBookingId}/reject", [
                'reason' => 'Schedule collision with Product Planning Summit',
            ]);
        $rejectWithReasonResponse->assertStatus(200);

        $this->assertEquals('rejected', Booking::find($overlapBookingId)->status->value);
        $this->assertEquals('Schedule collision with Product Planning Summit', Booking::find($overlapBookingId)->rejection_reason);
        $this->assertEquals($tpmAdmin->id, Booking::find($overlapBookingId)->rejected_by);

        // Verify Reject Audit Log
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $tpmAdmin->id,
            'booking_id' => $overlapBookingId,
            'action' => 'rejected',
        ]);

        // 11. USER-INITIATED BOOKING CANCELLATION
        // Cancel the first approved booking
        $cancelResponse = $this->actingAs($regularUser)
            ->postJson("/api/bookings/{$bookingId}/cancel");
        $cancelResponse->assertStatus(200);
        $this->assertEquals('cancelled', Booking::find($bookingId)->status->value);

        // Verify Cancel Audit Log
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $regularUser->id,
            'booking_id' => $bookingId,
            'action' => 'cancelled',
        ]);

        // 12. ADVANCED ANALYTICS & REPORTS VALIDATION
        // Approve one of the multi-day bookings to provide utilization data
        $multiDayRecord = Booking::where('group_id', $groupId)->first();
        $this->actingAs($tpmAdmin)
            ->postJson("/api/admin/bookings/{$multiDayRecord->id}/approve");

        // Fetch Room Utilization Report
        $startDateReport = now()->startOfMonth()->format('Y-m-d');
        $endDateReport = now()->endOfMonth()->format('Y-m-d');
        $utilReportResponse = $this->actingAs($tpmAdmin)
            ->getJson("/api/admin/reports/utilization?start_date={$startDateReport}&end_date={$endDateReport}");
        $utilReportResponse->assertStatus(200);
        $utilReportResponse->assertJsonStructure([
            'period' => ['start', 'end'],
            'rooms' => [
                '*' => [
                    'room',
                    'location',
                    'booked_hours',
                    'available_hours',
                    'utilization_pct',
                ]
            ]
        ]);

        // Fetch Peak Hours Report
        $peakHoursResponse = $this->actingAs($tpmAdmin)
            ->getJson("/api/admin/reports/peak-hours?start_date={$startDateReport}&end_date={$endDateReport}");
        $peakHoursResponse->assertStatus(200);
        $peakHoursResponse->assertJsonStructure([
            '*' => [
                'hour',
                'label',
                'booking_count',
            ]
        ]);

        // 13. ROOM INVENTORY MANAGEMENT & DEACTIVATION
        // Create new room as Super Admin
        $newRoomResponse = $this->actingAs($superAdmin)
            ->postJson('/api/admin/rooms', [
                'location_id' => $khtpLocation->id,
                'name' => 'Executive Suite C',
                'capacity' => 10,
                'amenities' => ['smartboard', 'video_conference'],
                'description' => 'Premium high-tech executive room',
            ]);
        $newRoomResponse->assertStatus(201);
        $newRoomId = $newRoomResponse->json('id');
        $this->assertNotNull($newRoomId);

        // Deactivate Room (Soft Deactivation Toggle)
        $toggleResponse = $this->actingAs($superAdmin)
            ->postJson("/api/admin/rooms/{$newRoomId}/toggle-active");
        $toggleResponse->assertStatus(200);
        
        $this->assertFalse(Room::find($newRoomId)->is_active);

        // 14. ADMIN SECURITY BOUNDARIES (LOCATION ISOLATION)
        // Standard user tries to access admin dashboard -> MUST be forbidden (403)
        $userDashboardResponse = $this->actingAs($regularUser)
            ->getJson('/api/admin/dashboard');
        $userDashboardResponse->assertStatus(403);

        // TPM Admin attempts to view/approve/reject a booking located in KHTP (which they do not manage)
        $roomKhtp = Room::create([
            'location_id' => $khtpLocation->id,
            'name' => 'Kulim Boardroom K1',
            'capacity' => 12,
            'amenities' => ['wifi'],
            'is_active' => true,
        ]);

        $khtpBooking = Booking::create([
            'user_id' => $regularUser->id,
            'room_id' => $roomKhtp->id,
            'title' => 'Kulim Site Alignment',
            'start_time' => now()->addDays(6)->setTime(10, 0, 0)->toDateTimeString(),
            'end_time' => now()->addDays(6)->setTime(11, 0, 0)->toDateTimeString(),
            'attendees' => 5,
            'phone' => '+60123456789',
            'status' => \App\Enums\BookingStatus::Pending,
        ]);

        // TPM location admin tries to approve KHTP booking -> MUST be forbidden (403)
        $tpmAdminApproveResponse = $this->actingAs($tpmAdmin)
            ->postJson("/api/admin/bookings/{$khtpBooking->id}/approve");
        $tpmAdminApproveResponse->assertStatus(403);

        // TPM location admin tries to reject KHTP booking -> MUST be forbidden (403)
        $tpmAdminRejectResponse = $this->actingAs($tpmAdmin)
            ->postJson("/api/admin/bookings/{$khtpBooking->id}/reject", ['reason' => 'Unauthorized action']);
        $tpmAdminRejectResponse->assertStatus(403);

        // 15. WEEKLY RECURRING BOOKING SERIES FLOW
        $recurringPayload = [
            'room_id' => $roomAlpha->id,
            'title' => 'Weekly Sync Meeting',
            'description' => 'Recurring sync across 4 weeks',
            'start_time' => now()->addDays(10)->setTime(14, 0, 0)->toDateTimeString(),
            'end_time' => now()->addDays(10)->setTime(15, 0, 0)->toDateTimeString(),
            'attendees' => 10,
            'phone' => '+60123456789',
            'weeks' => 4,
        ];

        $recurringResponse = $this->actingAs($regularUser)
            ->postJson('/api/bookings/recurring', $recurringPayload);

        $recurringResponse->assertStatus(201);
        $recurringBookings = $recurringResponse->json();
        $this->assertCount(4, $recurringBookings);
        $recurrenceGroupId = $recurringBookings[0]['recurrence_group_id'];
        $this->assertNotNull($recurrenceGroupId);
        $this->assertEquals(4, Booking::where('recurrence_group_id', $recurrenceGroupId)->count());

        // 16. SMART SEARCH & FALLBACK SUGGESTIONS ENGINE
        // Let's create an approved booking on Auditorium Alpha to block a specific time slot
        $blockDate = now()->addDays(8);
        $blockStart = $blockDate->copy()->setTime(14, 0, 0);
        $blockEnd = $blockDate->copy()->setTime(15, 0, 0);

        Booking::create([
            'user_id' => $regularUser->id,
            'room_id' => $roomAlpha->id,
            'title' => 'Blocker Meeting',
            'start_time' => $blockStart->toDateTimeString(),
            'end_time' => $blockEnd->toDateTimeString(),
            'attendees' => 20,
            'phone' => '+60123456789',
            'status' => \App\Enums\BookingStatus::Approved,
        ]);

        // Search for this exact room slot. Since it is blocked, search results suggestions must be computed
        $searchResponse = $this->getJson("/api/availability/search?location_id={$tpmLocation->id}&date={$blockDate->format('Y-m-d')}&start_time=14:00&end_time=15:00&attendees=40");
        $searchResponse->assertStatus(200);
        $searchJson = $searchResponse->json();
        
        // Auditorium Alpha must show is_available => false
        $searchedAlpha = collect($searchJson['rooms'])->firstWhere('id', $roomAlpha->id);
        $this->assertFalse($searchedAlpha['is_available']);

        // Since it is blocked, the suggestions list must have suggestions (alternative rooms or shifts)
        $this->assertNotEmpty($searchJson['suggestions']);

        // 17. ADMINISTRATIVE BLACKOUT PERIODS & IMMEDIATE BLOCKS
        // TPM Admin schedules a blackout on Seminar Room Beta
        $blackoutStart = now()->addDays(12)->setTime(9, 0, 0)->toDateTimeString();
        $blackoutEnd = now()->addDays(12)->setTime(17, 0, 0)->toDateTimeString();

        $blackoutResponse = $this->actingAs($tpmAdmin)
            ->postJson('/api/admin/blackouts', [
                'room_id' => $roomBeta->id,
                'title' => 'Room Maintenance Period',
                'description' => 'Painting and structural repairs',
                'start_time' => $blackoutStart,
                'end_time' => $blackoutEnd,
            ]);
        $blackoutResponse->assertStatus(201);
        $blackoutId = $blackoutResponse->json('blackout.id');
        $this->assertNotNull($blackoutId);

        // Attempting to book this room during the blackout window must be immediately blocked
        $blackoutBookingPayload = [
            'room_id' => $roomBeta->id,
            'title' => 'Regular Team Catchup',
            'start_date' => now()->addDays(12)->format('Y-m-d'),
            'start_time' => now()->addDays(12)->setTime(10, 0, 0)->toDateTimeString(),
            'end_time' => now()->addDays(12)->setTime(11, 30, 0)->toDateTimeString(),
            'attendees' => 8,
            'phone' => '+60123456789',
        ];

        $blackoutBookingResponse = $this->actingAs($regularUser)
            ->postJson('/api/bookings', $blackoutBookingPayload);

        $blackoutBookingResponse->assertStatus(422);
        $blackoutBookingResponse->assertJsonValidationErrors(['blackout']);
    }
}
