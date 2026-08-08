<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Cancels a recurring booking series atomically.
 *
 * Shared by the user-facing and admin-facing series-cancel endpoints: the
 * transaction, per-instance row locking + re-check, freed-slot tracking and
 * post-commit side effects (relations, notifications, waitlist alerts) live
 * here so both callers stay in lockstep.
 *
 * Callers plug in the two behaviours that differ between contexts:
 * - $authorize: per-instance permission check (throws to abort the whole
 *   series); null for the user endpoint where the query already scopes to
 *   the caller's own bookings.
 * - $applyCancellation: the status update + audit log per instance;
 *   defaults to the user behaviour (status only + 'cancelled' audit).
 */
class SeriesCancelService
{
    public function __construct(
        private AuditService $auditService,
        private NotificationService $notificationService
    ) {}

    /**
     * Cancel a recurring series (this instance + future ones by default).
     *
     * @param  callable(Booking): void|null  $authorize  throws to abort the whole series
     * @param  callable(Booking, User, BookingStatus): void|null  $applyCancellation
     * @return array{cancelled: Collection<int, Booking>, skipped: int}
     */
    public function cancel(
        Booking $booking,
        User $user,
        bool $futureOnly = true,
        ?callable $authorize = null,
        ?callable $applyCancellation = null,
        string $notificationType = 'cancelled'
    ): array {
        $query = Booking::where('recurrence_group_id', $booking->recurrence_group_id)
            ->whereIn('status', [BookingStatus::Pending, BookingStatus::Approved])
            ->orderBy('start_time');

        // Defence in depth: non-admin callers only ever see their own series.
        if (! $user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        if ($futureOnly) {
            $query->where('start_time', '>=', $booking->start_time);
        }

        $instances = $query->get();

        if ($instances->isEmpty()) {
            return ['cancelled' => collect(), 'skipped' => 0];
        }

        $applyCancellation ??= fn (Booking $instance, User $actor, BookingStatus $oldStatus) => $this->applyUserCancellation($instance, $actor, $oldStatus);

        $cancelled = collect();
        $freedSlots = collect();
        $oldStatuses = [];
        $skipped = 0;

        // One transaction: the whole series transitions together (row locks
        // + re-checks guard against concurrent approvals), so a failure
        // mid-way can never leave a partially cancelled series.
        DB::transaction(function () use ($instances, $user, $authorize, $applyCancellation, &$cancelled, &$freedSlots, &$oldStatuses, &$skipped) {
            foreach ($instances as $instance) {
                if ($authorize) {
                    $authorize($instance);
                }

                $locked = Booking::lockForUpdate()->find($instance->id);

                if (! $locked || ! $locked->canTransitionTo(BookingStatus::Cancelled)) {
                    // Concurrently changed (e.g. already cancelled/expired)
                    // between the query above and the lock.
                    $skipped++;

                    continue;
                }

                $oldStatus = $locked->status;
                $oldStatuses[$locked->id] = $oldStatus;

                $applyCancellation($locked, $user, $oldStatus);

                $cancelled->push($locked);

                if ($oldStatus === BookingStatus::Approved) {
                    $freedSlots->push($locked);
                }
            }
        });

        if ($cancelled->isEmpty()) {
            return ['cancelled' => $cancelled, 'skipped' => $skipped];
        }

        // Load relations for serialization before side effects.
        foreach ($cancelled as $instance) {
            $instance->load(['room.location', 'user', 'canceller']);
        }

        // Side effects after the transaction commits — never hold DB locks
        // while queueing email.
        foreach ($cancelled as $instance) {
            $this->notificationService->sendBookingNotification(
                $instance,
                $notificationType,
                $oldStatuses[$instance->id] ?? null
            );
        }

        foreach ($freedSlots as $instance) {
            app(WaitlistService::class)->notifyForFreedSlot($instance);
        }

        return ['cancelled' => $cancelled, 'skipped' => $skipped];
    }

    /**
     * Default per-instance cancellation for the user endpoint: status
     * transition + audit (no cancellation reason).
     */
    private function applyUserCancellation(Booking $booking, User $user, BookingStatus $oldStatus): void
    {
        $booking->update(['status' => BookingStatus::Cancelled]);

        $this->auditService->log($user, $booking, 'cancelled', [
            'before' => ['status' => $oldStatus->value],
            'after' => ['status' => BookingStatus::Cancelled->value],
            'series_cancelled' => true,
        ]);
    }
}
