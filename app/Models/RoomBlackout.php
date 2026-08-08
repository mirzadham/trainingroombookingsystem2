<?php

namespace App\Models;

use App\Models\Concerns\BumpsAvailabilityCache;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomBlackout extends Model
{
    use BumpsAvailabilityCache;
    use HasFactory;

    protected $fillable = [
        'room_id',
        'title',
        'description',
        'start_time',
        'end_time',
        'created_by',
        'recurrence',
        'recurrence_end_date',
        'recurrence_weekdays',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'recurrence_end_date' => 'date',
        'recurrence_weekdays' => 'array',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Whether this blackout repeats (daily / weekly / monthly).
     */
    public function isRecurring(): bool
    {
        return $this->recurrence !== null && $this->recurrence !== 'none';
    }

    /**
     * Scope: blackouts that could possibly cover the given range.
     *
     * For one-off blackouts this is a plain overlap check. For recurring
     * blackouts the first occurrence may lie before the range, so we also
     * include patterns whose end date (if any) has not yet passed.
     */
    public function scopeOverlapping($query, Carbon $start, Carbon $end)
    {
        return $query->where('start_time', '<', $end)
            ->where(function ($q) use ($start) {
                $q->where('end_time', '>', $start)
                    ->orWhere(function ($q2) use ($start) {
                        $q2->where('recurrence', '!=', 'none')
                            ->where(function ($q3) use ($start) {
                                $q3->whereNull('recurrence_end_date')
                                    ->orWhere('recurrence_end_date', '>=', $start->toDateString());
                            });
                    });
            });
    }

    /**
     * Precise overlap check that expands recurring occurrences.
     *
     * @return bool true if any occurrence of this blackout overlaps [start, end]
     */
    public function overlaps(Carbon $start, Carbon $end): bool
    {
        if (! $this->isRecurring()) {
            return $this->start_time < $end && $this->end_time > $start;
        }

        // Quick fail: the pattern has already ended before the queried range.
        if ($this->recurrence_end_date && Carbon::parse($this->recurrence_end_date)->endOfDay() <= $start) {
            return false;
        }

        // Weekly patterns with selected weekdays generate one occurrence per
        // selected weekday — check those directly.
        if ($this->recurrence === 'weekly' && ! empty($this->recurrence_weekdays)) {
            foreach ($this->weeklyWeekdayOccurrences($start, $end) as $occurrence) {
                if ($occurrence['start'] < $end && $occurrence['end'] > $start) {
                    return true;
                }
            }

            return false;
        }

        $durationMinutes = (int) $this->start_time->diffInMinutes($this->end_time);
        $limit = $this->recurrence_end_date
            ? Carbon::parse($this->recurrence_end_date)->endOfDay()
            : $end->copy();

        $guard = 0;
        for ($occurrenceStart = $this->skipToRelevantWindow($this->start_time->copy(), $start, $durationMinutes); $occurrenceStart <= $limit && $guard++ < 100000;) {
            $occurrenceEnd = $occurrenceStart->copy()->addMinutes($durationMinutes);

            if ($occurrenceStart < $end && $occurrenceEnd > $start) {
                return true;
            }

            // Occurrences are strictly increasing — nothing else can overlap.
            if ($occurrenceStart >= $end) {
                break;
            }

            $occurrenceStart = $this->nextOccurrence($occurrenceStart);
        }

        return false;
    }

    /**
     * Expand this blackout into concrete occurrences within a range.
     *
     * @return array<int, array{start: Carbon, end: Carbon}>
     */
    public function instancesBetween(Carbon $rangeStart, Carbon $rangeEnd): array
    {
        $instances = [];

        if (! $this->isRecurring()) {
            if ($this->start_time < $rangeEnd && $this->end_time > $rangeStart) {
                $instances[] = ['start' => $this->start_time, 'end' => $this->end_time];
            }

            return $instances;
        }

        // Weekly patterns with selected weekdays generate one occurrence per
        // selected weekday — expand those directly.
        if ($this->recurrence === 'weekly' && ! empty($this->recurrence_weekdays)) {
            foreach ($this->weeklyWeekdayOccurrences($rangeStart, $rangeEnd) as $occurrence) {
                if ($occurrence['start'] < $rangeEnd && $occurrence['end'] > $rangeStart) {
                    $instances[] = $occurrence;
                }
            }

            return $instances;
        }

        $durationMinutes = (int) $this->start_time->diffInMinutes($this->end_time);
        $limit = $this->recurrence_end_date
            ? Carbon::parse($this->recurrence_end_date)->endOfDay()
            : $rangeEnd->copy();

        $guard = 0;
        for ($occurrenceStart = $this->skipToRelevantWindow($this->start_time->copy(), $rangeStart, $durationMinutes); $occurrenceStart <= $limit && $guard++ < 100000;) {
            $occurrenceEnd = $occurrenceStart->copy()->addMinutes($durationMinutes);

            if ($occurrenceStart < $rangeEnd && $occurrenceEnd > $rangeStart) {
                $instances[] = ['start' => $occurrenceStart, 'end' => $occurrenceEnd];
            }

            $occurrenceStart = $this->nextOccurrence($occurrenceStart);
        }

        return $instances;
    }

    /**
     * Generate occurrences for weekly patterns with selected weekdays.
     *
     * Each selected weekday between the blackout's start and end date
     * produces an occurrence at the blackout's time of day. Iteration is
     * bounded to the queried range (plus the occurrence duration).
     *
     * @return array<int, array{start: Carbon, end: Carbon}>
     */
    private function weeklyWeekdayOccurrences(Carbon $rangeStart, Carbon $rangeEnd): array
    {
        $durationMinutes = (int) $this->start_time->diffInMinutes($this->end_time);

        $limit = $this->recurrence_end_date
            ? Carbon::parse($this->recurrence_end_date)->endOfDay()
            : $rangeEnd->copy();

        // Earliest day that could still produce an overlapping occurrence.
        $earliestRelevantDay = $rangeStart->copy()->subMinutes($durationMinutes + 1)->startOfDay();
        $firstDay = $this->start_time->copy()->startOfDay();

        if ($firstDay->lt($earliestRelevantDay)) {
            $firstDay = $earliestRelevantDay->copy();
        }

        $occurrences = [];
        $guard = 0;

        for ($day = $firstDay->copy(); $day <= $limit && $guard++ < 100000; $day->addDay()) {
            $weekday = strtolower($day->format('D'));

            if (! in_array($weekday, $this->recurrence_weekdays, true)) {
                continue;
            }

            $occurrenceStart = $day->copy()->setTimeFrom($this->start_time);
            $occurrenceEnd = $occurrenceStart->copy()->addMinutes($durationMinutes);

            if ($occurrenceStart < $rangeEnd && $occurrenceEnd > $rangeStart) {
                $occurrences[] = ['start' => $occurrenceStart, 'end' => $occurrenceEnd];
            }
        }

        return $occurrences;
    }

    /**
     * Jump the occurrence iteration to just before the queried range so work
     * is bounded by the range length instead of the full recurrence span.
     *
     * Whole recurrence units are used so alignment is preserved
     * (weekday for weekly, day-of-month for monthly).
     */
    private function skipToRelevantWindow(Carbon $occurrenceStart, Carbon $rangeStart, int $durationMinutes): Carbon
    {
        // The earliest occurrence that could still overlap the range starts
        // at most $durationMinutes before it — anything earlier ends before
        // the range begins and can never overlap.
        $earliestRelevant = $rangeStart->copy()->subMinutes($durationMinutes + 1);

        if ($occurrenceStart->gte($earliestRelevant)) {
            return $occurrenceStart;
        }

        return match ($this->recurrence) {
            'daily' => $occurrenceStart->copy()->addDays((int) $occurrenceStart->diffInDays($earliestRelevant)),
            'weekly' => $occurrenceStart->copy()->addWeeks((int) $occurrenceStart->diffInWeeks($earliestRelevant)),
            'monthly' => $occurrenceStart->copy()->addMonthsNoOverflow((int) $occurrenceStart->diffInMonths($earliestRelevant)),
            default => $occurrenceStart,
        };
    }

    /**
     * Advance to the next occurrence for anchored recurrences
     * (daily / weekly without weekday selection / monthly).
     */
    private function nextOccurrence(Carbon $occurrenceStart): Carbon
    {
        return match ($this->recurrence) {
            'daily' => $occurrenceStart->addDay(),
            'weekly' => $occurrenceStart->addWeek(),
            'monthly' => $occurrenceStart->addMonthsNoOverflow(),
            default => $occurrenceStart->addDay(),
        };
    }
}
