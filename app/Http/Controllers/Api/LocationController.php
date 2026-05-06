<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Location;
use Illuminate\Http\JsonResponse;

class LocationController extends Controller
{
    /**
     * GET /api/locations
     * List all active locations.
     */
    public function index(): JsonResponse
    {
        $locations = Location::where('is_active', true)
            ->withCount(['rooms' => function ($q) {
                $q->where('is_active', true);
            }])
            ->get();

        return response()->json($locations);
    }
}
