<?php

use Illuminate\Support\Facades\Route;

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
