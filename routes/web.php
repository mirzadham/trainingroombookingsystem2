<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| API routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. These routes are prefixed with /api.
|
*/

// Public availability endpoints (no auth required)
Route::prefix('api')->group(function () {
    Route::get('/availability/search', [\App\Http\Controllers\Api\AvailabilityController::class, 'search']);
    Route::get('/availability/timeline', [\App\Http\Controllers\Api\AvailabilityController::class, 'timeline']);
    Route::get('/availability/suggestions', [\App\Http\Controllers\Api\AvailabilityController::class, 'suggestions']);
    Route::get('/rooms/available', [\App\Http\Controllers\Api\AvailabilityController::class, 'roomsWithTimeline']);
});

// Auth endpoints
Route::prefix('api/auth')->group(function () {
    Route::post('/register', [\App\Http\Controllers\Api\AuthController::class, 'register']);
    Route::post('/login', [\App\Http\Controllers\Api\AuthController::class, 'login']);
    Route::post('/admin/login', [\App\Http\Controllers\Api\AuthController::class, 'adminLogin']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [\App\Http\Controllers\Api\AuthController::class, 'logout']);
        Route::get('/user', [\App\Http\Controllers\Api\AuthController::class, 'user']);
    });
});

// Protected booking endpoints
Route::prefix('api')->middleware('auth:sanctum')->group(function () {
    Route::apiResource('bookings', \App\Http\Controllers\Api\BookingController::class);
    Route::post('/bookings/{booking}/cancel', [\App\Http\Controllers\Api\BookingController::class, 'cancel']);
    Route::post('/bookings/recurring', [\App\Http\Controllers\Api\BookingController::class, 'storeRecurring']);
});

// Admin endpoints
Route::prefix('api/admin')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/bookings', [\App\Http\Controllers\Api\AdminController::class, 'bookings']);
    Route::post('/bookings/{booking}/approve', [\App\Http\Controllers\Api\AdminController::class, 'approve']);
    Route::post('/bookings/{booking}/reject', [\App\Http\Controllers\Api\AdminController::class, 'reject']);
    Route::put('/bookings/{booking}', [\App\Http\Controllers\Api\AdminController::class, 'updateBooking']);
    Route::get('/dashboard', [\App\Http\Controllers\Api\AdminController::class, 'dashboard']);

    // Room management
    Route::apiResource('rooms', \App\Http\Controllers\Api\RoomController::class);
    
    // Reports
    Route::get('/reports/utilization', [\App\Http\Controllers\Api\ReportController::class, 'utilization']);
    Route::get('/reports/peak-hours', [\App\Http\Controllers\Api\ReportController::class, 'peakHours']);
});

// Calendar (public, read-only)
Route::prefix('api')->group(function () {
    Route::get('/calendar', [\App\Http\Controllers\Api\CalendarController::class, 'index']);
    Route::get('/locations', [\App\Http\Controllers\Api\LocationController::class, 'index']);
    Route::get('/rooms', [\App\Http\Controllers\Api\RoomController::class, 'publicIndex']);
});

/*
|--------------------------------------------------------------------------
| SPA Catch-All Route
|--------------------------------------------------------------------------
|
| This route serves the React SPA for all non-API routes.
| React Router handles client-side routing from here.
|
*/
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
