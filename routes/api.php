<?php

use App\Http\Controllers\Api\AdminCalendarController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminExportController;
use App\Http\Controllers\Api\AdminInvitationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\BlackoutController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\Api\WaitlistController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| These routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. These routes are automatically
| prefixed with /api.
|
*/

// Public availability endpoints (no auth required)
Route::get('/availability/search', [AvailabilityController::class, 'search']);
Route::get('/availability/timeline', [AvailabilityController::class, 'timeline']);
Route::get('/availability/suggestions', [AvailabilityController::class, 'suggestions']);
Route::get('/rooms/available', [AvailabilityController::class, 'roomsWithTimeline']);

// Auth endpoints
Route::prefix('auth')->group(function () {
    // Rate limited via named limiters (registered in AppServiceProvider) to
    // slow down credential stuffing / brute force. Each endpoint has its own
    // per-IP counter.
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-login');

    // Admin login: tight rate limit (5 attempts/min/IP).
    Route::post('/admin/login', [AuthController::class, 'adminLogin'])
        ->middleware('throttle:auth-admin-login');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth-forgot-password');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:auth-reset-password');

    // Invitation validation and claiming (admin onboarding)
    Route::post('/invitations/validate', [AdminInvitationController::class, 'validateToken'])
        ->middleware('throttle:auth-invitations');
    Route::post('/invitations/claim', [AdminInvitationController::class, 'claimInvite'])
        ->middleware('throttle:auth-invitations');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);
        Route::put('/user', [AuthController::class, 'updateProfile']);
        Route::put('/user/password', [AuthController::class, 'updatePassword']);
    });
});

// Protected booking endpoints
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('bookings', BookingController::class);
    Route::post('/bookings/{booking}/cancel', [BookingController::class, 'cancel']);
    Route::post('/bookings/{booking}/cancel-series', [BookingController::class, 'cancelSeries']);
    Route::post('/bookings/recurring', [BookingController::class, 'storeRecurring']);

    // Waitlist
    Route::get('/waitlist', [WaitlistController::class, 'index']);
    Route::post('/waitlist', [WaitlistController::class, 'store'])->middleware('throttle:waitlist');
    Route::delete('/waitlist/{waitlistEntry}', [WaitlistController::class, 'destroy']);

    // Favorites
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites/{room}', [FavoriteController::class, 'store']);
    Route::delete('/favorites/{room}', [FavoriteController::class, 'destroy']);

    // In-app notification centre
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    // Calendar subscription (private iCal feed)
    Route::get('/calendar/subscription', [CalendarController::class, 'subscription']);
    Route::post('/calendar/subscription/regenerate', [CalendarController::class, 'regenerate']);
});

// Admin endpoints
Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/bookings', [AdminController::class, 'bookings']);
    Route::post('/bookings', [AdminController::class, 'storeBooking']);
    Route::post('/bookings/batch-approve', [AdminController::class, 'batchApprove']);
    Route::post('/bookings/batch-reject', [AdminController::class, 'batchReject']);
    Route::post('/bookings/{booking}/approve', [AdminController::class, 'approve']);
    Route::post('/bookings/{booking}/reject', [AdminController::class, 'reject']);
    Route::post('/bookings/{booking}/attendance', [AdminController::class, 'markAttendance']);
    Route::post('/bookings/{booking}/cancel', [AdminController::class, 'cancelBooking']);
    Route::put('/bookings/{booking}', [AdminController::class, 'updateBooking']);
    Route::get('/dashboard', [AdminController::class, 'dashboard']);
    Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
    Route::get('/users/search', [UserManagementController::class, 'search']);

    // Super Admin specific endpoints
    Route::middleware(['super-admin'])->group(function () {
        Route::get('/users', [UserManagementController::class, 'index']);
        Route::put('/users/{user}', [UserManagementController::class, 'update']);
        Route::post('/users/{user}/toggle-status', [UserManagementController::class, 'toggleStatus']);
        Route::get('/users/invitations', [UserManagementController::class, 'invitations']);
        Route::post('/users/invite', [UserManagementController::class, 'inviteAdmin']);
        Route::post('/users/invitations/{invitation}/resend', [UserManagementController::class, 'resendInvite']);
        Route::delete('/users/invitations/{invitation}', [UserManagementController::class, 'revokeInvite']);
    });

    // Room management
    Route::apiResource('rooms', RoomController::class);
    Route::post('/rooms/{room}/toggle-active', [RoomController::class, 'toggleActive']);
    Route::post('/rooms/{room}/images', [RoomController::class, 'uploadImage']);
    Route::delete('/rooms/{room}/images', [RoomController::class, 'deleteImage']);
    Route::post('/rooms/{room}/images/set-primary', [RoomController::class, 'setPrimaryImage']);

    // Blackout scheduling
    Route::apiResource('blackouts', BlackoutController::class)->only(['index', 'store', 'destroy']);

    // Reports
    Route::get('/reports/utilization', [ReportController::class, 'utilization']);
    Route::get('/reports/peak-hours', [ReportController::class, 'peakHours']);

    // Admin Calendar View
    Route::get('/calendar', [AdminCalendarController::class, 'index']);

    // CSV Exports (defined before other bookings routes to avoid conflicts)
    Route::get('/bookings/export', [AdminExportController::class, 'bookings']);
    Route::get('/audit-logs/export', [AdminExportController::class, 'auditLogs']);
    Route::post('/bookings/{booking}/cancel-series', [AdminController::class, 'cancelSeries']);
});

// Calendar (public, read-only)
Route::get('/calendar', [CalendarController::class, 'index']);
Route::get('/locations', [LocationController::class, 'index']);
Route::get('/rooms', [RoomController::class, 'publicIndex']);
Route::get('/rooms/{room}', [RoomController::class, 'publicShow']);
