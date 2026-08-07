<?php

use App\Http\Controllers\Api\CalendarFeedController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SPA + Public Feed Routes
|--------------------------------------------------------------------------
|
| The calendar feed is a public web resource (not a JSON API endpoint),
| so it must be defined BEFORE the SPA catch-all below.
|
*/

Route::get('/calendar/feed/{token}.ics', [CalendarFeedController::class, 'userFeed']);

/*
|--------------------------------------------------------------------------
| SPA Routes
|--------------------------------------------------------------------------
|
| This route serves the React SPA for all non-API routes.
| React Router handles client-side routing from here.
|
*/

Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
