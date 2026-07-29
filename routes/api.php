<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminInvitationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\BlackoutController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\UserManagementController;
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
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/admin/login', [AuthController::class, 'adminLogin']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);

    // Invitation validation and claiming
    Route::post('/invitations/validate', [AdminInvitationController::class, 'validateToken']);
    Route::post('/invitations/claim', [AdminInvitationController::class, 'claimInvite']);

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
    Route::post('/bookings/recurring', [BookingController::class, 'storeRecurring']);
});

// Admin endpoints
Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/bookings', [AdminController::class, 'bookings']);
    Route::post('/bookings', [AdminController::class, 'storeBooking']);
    Route::post('/bookings/batch-approve', [AdminController::class, 'batchApprove']);
    Route::post('/bookings/batch-reject', [AdminController::class, 'batchReject']);
    Route::post('/bookings/{booking}/approve', [AdminController::class, 'approve']);
    Route::post('/bookings/{booking}/reject', [AdminController::class, 'reject']);
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
    Route::get('/calendar', [AdminController::class, 'calendar']);
});

// Calendar (public, read-only)
Route::get('/calendar', [CalendarController::class, 'index']);
Route::get('/locations', [LocationController::class, 'index']);
Route::get('/rooms', [RoomController::class, 'publicIndex']);
Route::get('/rooms/{room}', [RoomController::class, 'publicShow']);
