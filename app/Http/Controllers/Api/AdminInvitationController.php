<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\AdminInvitation;
use App\Models\AuditLog;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminInvitationController extends Controller
{
    /**
     * GET /api/auth/invitations/validate
     * Validate invitation token and return email context.
     */
    public function validateToken(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        $invitation = AdminInvitation::with('location')
            ->where('token', $request->token)
            ->first();

        if (!$invitation) {
            return response()->json(['message' => 'This invitation token is invalid.'], 404);
        }

        if ($invitation->isAccepted()) {
            return response()->json(['message' => 'This invitation has already been accepted.'], 400);
        }

        if ($invitation->isExpired()) {
            return response()->json(['message' => 'This invitation has expired. Please contact a Super Admin.'], 400);
        }

        return response()->json([
            'email' => $invitation->email,
            'role' => $invitation->role,
            'location' => $invitation->location,
        ]);
    }

    /**
     * POST /api/auth/invitations/claim
     * Claim invitation, set up account, and return access token.
     */
    public function claimInvite(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'name' => 'required|string|max:255',
            'department' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $invitation = AdminInvitation::where('token', $validated['token'])->first();

        if (!$invitation) {
            return response()->json(['message' => 'This invitation token is invalid.'], 404);
        }

        if ($invitation->isAccepted()) {
            return response()->json(['message' => 'This invitation has already been accepted.'], 400);
        }

        if ($invitation->isExpired()) {
            return response()->json(['message' => 'This invitation has expired.'], 400);
        }

        $user = DB::transaction(function () use ($invitation, $validated) {
            // Find existing user (if standard user was promoted) or create new
            $user = User::updateOrCreate(
                ['email' => $invitation->email],
                [
                    'name' => $validated['name'],
                    'password' => Hash::make($validated['password']),
                    'role' => $invitation->role,
                    'user_type' => 'internal',
                    'location_id' => $invitation->location_id,
                    'phone' => $validated['phone'] ?? null,
                    'department' => $validated['department'],
                    'status' => 'active',
                ]
            );

            // Mark invitation accepted
            $invitation->update([
                'accepted_at' => now(),
            ]);

            return $user;
        });

        // Issue auth token for Admin Panel
        $token = $user->createToken('admin-panel')->plainTextToken;

        // Log to system audits
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'claimed_admin_invite',
            'changes' => [
                'email' => $user->email,
                'role' => $user->role,
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'user' => new UserResource($user->load('location')),
            'token' => $token,
            'message' => 'Administrative account provisioned successfully.'
        ], 201);
    }
}
