<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AdminInvitation;
use App\Models\AuditLog;
use App\Models\Room;
use App\Models\User;
use App\Notifications\AdminInvitationNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    /**
     * GET /api/admin/users
     * List all users (Active Users tab).
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['location', 'adminRooms']);

        // Filters
        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('location_id')) {
            $query->where('location_id', $request->location_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('name')->paginate(20);

        return response()->json($users);
    }

    /**
     * GET /api/admin/users/invitations
     * List all outstanding invitations.
     */
    public function invitations(): JsonResponse
    {
        $invitations = AdminInvitation::with(['location', 'inviter', 'rooms'])
            ->whereNull('accepted_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($invitations);
    }

    /**
     * POST /api/admin/users/invite
     * Invite a new administrator.
     */
    public function inviteAdmin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => [
                'required',
                'email',
                'max:255',
                function ($attribute, $value, $fail) {
                    $existingAdmin = User::where('email', $value)
                        ->whereIn('role', [UserRole::SuperAdmin, UserRole::LocationAdmin, UserRole::RoomAdmin])
                        ->first();
                    if ($existingAdmin) {
                        $fail('A user with administrative privileges already exists with this email address.');
                    }
                },
            ],
            'role' => ['required', Rule::in(['super_admin', 'location_admin', 'room_admin'])],
            'location_id' => [
                Rule::requiredIf(in_array($request->role, ['location_admin', 'room_admin'], true)),
                'nullable',
                'exists:locations,id',
            ],
            'room_ids' => [
                Rule::requiredIf($request->role === 'room_admin'),
                'nullable',
                'array',
                'min:1',
            ],
            'room_ids.*' => [
                'integer',
                'exists:rooms,id',
                function ($attribute, $value, $fail) use ($request) {
                    $room = Room::find($value);
                    if ($room && $request->location_id && (int) $room->location_id !== (int) $request->location_id) {
                        $fail('One or more selected rooms do not belong to the selected campus.');
                    }
                },
            ],
        ]);

        // Generate invitation
        $token = Str::random(60);

        $invitation = DB::transaction(function () use ($validated, $token, $request) {
            // Delete old pending invites for the same email to avoid duplicates
            AdminInvitation::where('email', $validated['email'])
                ->whereNull('accepted_at')
                ->delete();

            $invitation = AdminInvitation::create([
                'email' => $validated['email'],
                'role' => $validated['role'],
                'location_id' => in_array($validated['role'], ['location_admin', 'room_admin'], true) ? $validated['location_id'] : null,
                'token' => $token,
                'invited_by' => $request->user()->id,
                'expires_at' => now()->addHours(48),
            ]);

            if ($validated['role'] === 'room_admin') {
                $invitation->rooms()->attach($validated['room_ids']);
            }

            return $invitation;
        });

        // Send Email
        $invitation->load(['location', 'rooms']);
        Notification::route('mail', $invitation->email)
            ->notify(new AdminInvitationNotification($invitation));

        // Create Audit Log
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'invited_admin',
            'changes' => [
                'email' => $invitation->email,
                'role' => $invitation->role,
                'location_id' => $invitation->location_id,
                'room_ids' => $invitation->rooms()->pluck('rooms.id')->all(),
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Invitation sent successfully.',
            'invitation' => $invitation->load('location'),
        ], 201);
    }

    /**
     * POST /api/admin/users/invitations/{invitation}/resend
     * Resend/Renew a pending invitation.
     */
    public function resendInvite(Request $request, AdminInvitation $invitation): JsonResponse
    {
        if ($invitation->isAccepted()) {
            return response()->json(['message' => 'This invitation has already been accepted.'], 422);
        }

        // Renew token & lifespan
        $invitation->update([
            'token' => Str::random(60),
            'expires_at' => now()->addHours(48),
            'invited_by' => $request->user()->id,
        ]);

        // Dispatch Email
        Notification::route('mail', $invitation->email)
            ->notify(new AdminInvitationNotification($invitation));

        // Audit Log
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'resent_invite',
            'changes' => ['email' => $invitation->email],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Invitation resent and renewed successfully.',
            'invitation' => $invitation->load(['location', 'rooms']),
        ]);
    }

    /**
     * DELETE /api/admin/users/invitations/{invitation}
     * Revoke a pending invitation.
     */
    public function revokeInvite(Request $request, AdminInvitation $invitation): JsonResponse
    {
        if ($invitation->isAccepted()) {
            return response()->json(['message' => 'Cannot revoke an already accepted invitation.'], 422);
        }

        $email = $invitation->email;
        $invitation->delete();

        // Audit Log
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'revoked_invite',
            'changes' => ['email' => $email],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Invitation revoked successfully.',
        ]);
    }

    /**
     * PUT /api/admin/users/{user}
     * Update an existing user's details and role scope.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'role' => ['required', Rule::in(['user', 'location_admin', 'room_admin', 'super_admin'])],
            'user_type' => ['required', Rule::in(['internal', 'external'])],
            'location_id' => [
                Rule::requiredIf(in_array($request->role, ['location_admin', 'room_admin'], true)),
                'nullable',
                'exists:locations,id',
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'department' => ['nullable', 'string', 'max:255'],
            'room_ids' => [
                Rule::requiredIf($request->role === 'room_admin'),
                'nullable',
                'array',
                'min:1',
            ],
            'room_ids.*' => [
                'integer',
                'exists:rooms,id',
                function ($attribute, $value, $fail) use ($request) {
                    $room = Room::find($value);
                    if ($room && $request->location_id && (int) $room->location_id !== (int) $request->location_id) {
                        $fail('One or more selected rooms do not belong to the selected campus.');
                    }
                },
            ],
        ]);

        // Capture changes for audit
        $original = $user->only(['name', 'email', 'role', 'location_id', 'phone', 'department', 'user_type']);
        $originalRoomIds = $user->adminRooms()->pluck('rooms.id')->all();

        $roomIds = $validated['room_ids'] ?? [];
        unset($validated['room_ids']);

        $user->update($validated);

        // Sync room-admin scope (or clear it when the role is not room_admin)
        if ($user->role === UserRole::RoomAdmin) {
            $user->adminRooms()->sync($roomIds);
        } else {
            $user->adminRooms()->sync([]);
        }

        $changes = $user->getChanges();

        if ($originalRoomIds != $roomIds && $user->role === UserRole::RoomAdmin) {
            $changes['room_ids'] = ['before' => $originalRoomIds, 'after' => $roomIds];
        }

        if (! empty($changes)) {
            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'updated_user',
                'changes' => [
                    'user_id' => $user->id,
                    'before' => array_intersect_key($original, $changes),
                    'after' => $changes,
                ],
                'ip_address' => $request->ip(),
            ]);
        }

        return response()->json([
            'message' => 'User details updated successfully.',
            'user' => $user->load(['location', 'adminRooms']),
        ]);
    }

    /**
     * POST /api/admin/users/{user}/toggle-status
     * Suspend or Reactivate a user account.
     */
    public function toggleStatus(Request $request, User $user): JsonResponse
    {
        // Safe check: cannot suspend oneself
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Operation Denied. You cannot suspend your own administrative account.',
            ], 422);
        }

        $newStatus = $user->status === 'suspended' ? 'active' : 'suspended';

        $user->update(['status' => $newStatus]);

        // Revoke active sessions if suspended
        if ($newStatus === 'suspended') {
            $user->tokens()->delete();
        }

        // Audit Log
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $newStatus === 'suspended' ? 'suspended_user' : 'reactivated_user',
            'changes' => [
                'target_user_id' => $user->id,
                'target_email' => $user->email,
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => $newStatus === 'suspended'
                ? 'User account has been suspended. All active sessions terminated.'
                : 'User account has been reactivated.',
            'user' => $user->load('location'),
        ]);
    }

    /**
     * GET /api/admin/users/search
     * Search active users for booking association.
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:1',
        ]);

        $search = $request->query('q');

        $users = User::where('status', '!=', 'suspended')
            ->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            })
            ->limit(15)
            ->get(['id', 'name', 'email', 'phone', 'department']);

        return response()->json($users);
    }
}
