<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Services\AvailabilityCacheService;
use Illuminate\Http\JsonResponse;

class LocationController extends Controller
{
    /**
     * GET /api/locations
     * List all active locations.
     */
    public function index(): JsonResponse
    {
        // Cache plain arrays, never Eloquent models: the cache store refuses
        // to unserialize PHP classes (serializable_classes => false), so
        // object payloads come back as __PHP_Incomplete_Class and break
        // response shapes.
        $locations = app(AvailabilityCacheService::class)->remember('locations', 86400, function () {
            return Location::where('is_active', true)
                ->withCount(['rooms' => function ($q) {
                    $q->where('is_active', true);
                }])
                ->get()
                ->toArray();
        });

        return response()->json($locations);
    }
}
