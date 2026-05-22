<?php

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
Route::get('/availability/search', [App\Http\Controllers\Api\AvailabilityController::class, 'search']);
Route::get('/availability/timeline', [App\Http\Controllers\Api\AvailabilityController::class, 'timeline']);
Route::get('/availability/suggestions', [App\Http\Controllers\Api\AvailabilityController::class, 'suggestions']);
Route::get('/rooms/available', [App\Http\Controllers\Api\AvailabilityController::class, 'roomsWithTimeline']);

// Auth endpoints
Route::prefix('auth')->group(function () {
    Route::post('/register', [App\Http\Controllers\Api\AuthController::class, 'register']);
    Route::post('/login', [App\Http\Controllers\Api\AuthController::class, 'login']);
    Route::post('/admin/login', [App\Http\Controllers\Api\AuthController::class, 'adminLogin']);
    Route::post('/forgot-password', [App\Http\Controllers\Api\AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [App\Http\Controllers\Api\AuthController::class, 'resetPassword']);
    
    // Invitation validation and claiming
    Route::post('/invitations/validate', [App\Http\Controllers\Api\AdminInvitationController::class, 'validateToken']);
    Route::post('/invitations/claim', [App\Http\Controllers\Api\AdminInvitationController::class, 'claimInvite']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [App\Http\Controllers\Api\AuthController::class, 'logout']);
        Route::get('/user', [App\Http\Controllers\Api\AuthController::class, 'user']);
        Route::put('/user', [App\Http\Controllers\Api\AuthController::class, 'updateProfile']);
        Route::put('/user/password', [App\Http\Controllers\Api\AuthController::class, 'updatePassword']);
    });
});

// Protected booking endpoints
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('bookings', App\Http\Controllers\Api\BookingController::class);
    Route::post('/bookings/{booking}/cancel', [App\Http\Controllers\Api\BookingController::class, 'cancel']);
    Route::post('/bookings/recurring', [App\Http\Controllers\Api\BookingController::class, 'storeRecurring']);
});

// Admin endpoints
Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/bookings', [App\Http\Controllers\Api\AdminController::class, 'bookings']);
    Route::post('/bookings/batch-approve', [App\Http\Controllers\Api\AdminController::class, 'batchApprove']);
    Route::post('/bookings/batch-reject', [App\Http\Controllers\Api\AdminController::class, 'batchReject']);
    Route::post('/bookings/{booking}/approve', [App\Http\Controllers\Api\AdminController::class, 'approve']);
    Route::post('/bookings/{booking}/reject', [App\Http\Controllers\Api\AdminController::class, 'reject']);
    Route::post('/bookings/{booking}/cancel', [App\Http\Controllers\Api\AdminController::class, 'cancelBooking']);
    Route::put('/bookings/{booking}', [App\Http\Controllers\Api\AdminController::class, 'updateBooking']);
    Route::get('/dashboard', [App\Http\Controllers\Api\AdminController::class, 'dashboard']);
    Route::get('/audit-logs', [App\Http\Controllers\Api\AdminController::class, 'auditLogs']);

    // Super Admin specific endpoints
    Route::middleware(['super-admin'])->group(function () {
        Route::get('/users', [App\Http\Controllers\Api\UserManagementController::class, 'index']);
        Route::put('/users/{user}', [App\Http\Controllers\Api\UserManagementController::class, 'update']);
        Route::post('/users/{user}/toggle-status', [App\Http\Controllers\Api\UserManagementController::class, 'toggleStatus']);
        Route::get('/users/invitations', [App\Http\Controllers\Api\UserManagementController::class, 'invitations']);
        Route::post('/users/invite', [App\Http\Controllers\Api\UserManagementController::class, 'inviteAdmin']);
        Route::post('/users/invitations/{invitation}/resend', [App\Http\Controllers\Api\UserManagementController::class, 'resendInvite']);
        Route::delete('/users/invitations/{invitation}', [App\Http\Controllers\Api\UserManagementController::class, 'revokeInvite']);
    });

    // Room management
    Route::apiResource('rooms', App\Http\Controllers\Api\RoomController::class);
    Route::post('/rooms/{room}/toggle-active', [App\Http\Controllers\Api\RoomController::class, 'toggleActive']);

    // Blackout scheduling
    Route::apiResource('blackouts', App\Http\Controllers\Api\BlackoutController::class)->only(['index', 'store', 'destroy']);

    // Reports
    Route::get('/reports/utilization', [App\Http\Controllers\Api\ReportController::class, 'utilization']);
    Route::get('/reports/peak-hours', [App\Http\Controllers\Api\ReportController::class, 'peakHours']);
});

// Calendar (public, read-only)
Route::get('/calendar', [App\Http\Controllers\Api\CalendarController::class, 'index']);
Route::get('/locations', [App\Http\Controllers\Api\LocationController::class, 'index']);
Route::get('/rooms', [App\Http\Controllers\Api\RoomController::class, 'publicIndex']);
Route::get('/rooms/{room}', [App\Http\Controllers\Api\RoomController::class, 'publicShow']);
