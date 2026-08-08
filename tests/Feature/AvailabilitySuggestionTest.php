<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Location;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AvailabilitySuggestionTest extends TestCase
{
    use RefreshDatabase;

    private Location $kl;

    private Location $pj;

    private Room $klRoom;

    private Room $pjRoom;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();

        $this->kl = Location::factory()->create(['name' => 'Kuala Lumpur', 'code' => 'KL']);
        $this->pj = Location::factory()->create(['name' => 'Petaling Jaya', 'code' => 'PJ']);

        $this->klRoom = Room::factory()->create([
            'location_id' => $this->kl->id,
            'name' => 'KL Training Room',
            'capacity' => 20,
        ]);

        $this->pjRoom = Room::factory()->create([
            'location_id' => $this->pj->id,
            'name' => 'PJ Training Room',
            'capacity' => 20,
        ]);
    }

    private function searchDate(): string
    {
        return now()->addDays(30)->format('Y-m-d');
    }

    /**
     * When the exact slot is taken, nearby shifted slots (±2h) must still be
     * suggested — but never slots that overlap the conflicting booking.
     */
    public function test_nearby_time_suggestions_are_returned_when_exact_slot_is_taken(): void
    {
        Booking::factory()->create([
            'room_id' => $this->klRoom->id,
            'status' => BookingStatus::Approved,
            'start_time' => now()->addDays(30)->setTime(9, 0, 0),
            'end_time' => now()->addDays(30)->setTime(11, 0, 0),
        ]);

        $response = $this->getJson('/api/availability/search?location_id='.$this->kl->id
            .'&date='.$this->searchDate().'&start_time=09:00&end_time=11:00');

        $response->assertOk()
            ->assertJsonPath('meta.available_rooms', 0);

        $nearby = $response->json('suggestions.nearby_times');

        $this->assertNotEmpty($nearby);

        // -120 min shift (07:00–09:00) does not overlap the 09:00–11:00
        // booking, so it must be suggested.
        $this->assertTrue(
            collect($nearby)->contains(fn ($n) => str_starts_with($n['start_time'], now()->addDays(30)->format('Y-m-d').' 07:00')),
            'Expected a 07:00–09:00 nearby suggestion.'
        );

        // No suggestion may overlap the conflicting booking.
        $this->assertTrue(
            collect($nearby)->every(fn ($n) => $n['start_time'] < now()->addDays(30)->setTime(9, 0)->toDateTimeString()
                || $n['start_time'] >= now()->addDays(30)->setTime(11, 0)->toDateTimeString()),
            'A suggested nearby time overlaps the conflicting booking.'
        );
    }

    /**
     * Alternative rooms from other locations must be suggested when the
     * requested location is fully booked.
     */
    public function test_alternative_room_suggested_from_other_location(): void
    {
        Booking::factory()->create([
            'room_id' => $this->klRoom->id,
            'status' => BookingStatus::Approved,
            'start_time' => now()->addDays(30)->setTime(9, 0, 0),
            'end_time' => now()->addDays(30)->setTime(11, 0, 0),
        ]);

        $response = $this->getJson('/api/availability/search?location_id='.$this->kl->id
            .'&date='.$this->searchDate().'&start_time=09:00&end_time=11:00');

        $response->assertOk()
            ->assertJsonPath('meta.available_rooms', 0);

        $alternatives = $response->json('suggestions.alternative_rooms');

        $this->assertNotEmpty($alternatives);
        $this->assertSame($this->pjRoom->id, $alternatives[0]['room']['id']);
    }

    /**
     * No suggestions at all when every candidate room is occupied for the
     * whole operating day.
     */
    public function test_no_suggestions_when_all_rooms_fully_occupied(): void
    {
        $date = now()->addDays(30);
        $openHour = (int) config('booking.operating_hours.open');
        $closeHour = (int) config('booking.operating_hours.close');

        foreach ([$this->klRoom, $this->pjRoom] as $room) {
            Booking::factory()->create([
                'room_id' => $room->id,
                'status' => BookingStatus::Approved,
                'start_time' => $date->copy()->setTime($openHour, 0),
                'end_time' => $date->copy()->setTime($closeHour, 0),
            ]);
        }

        $response = $this->getJson('/api/availability/search?location_id='.$this->kl->id
            .'&date='.$this->searchDate().'&start_time=09:00&end_time=11:00');

        $response->assertOk()
            ->assertJsonPath('meta.available_rooms', 0)
            ->assertJsonPath('suggestions', []);
    }
}
