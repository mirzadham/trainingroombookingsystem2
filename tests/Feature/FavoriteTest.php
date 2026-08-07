<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FavoriteTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private User $otherUser;

    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();

        $location = Location::create(['name' => 'Technology Park Malaysia', 'code' => 'TPM', 'address' => 'KL']);

        $this->room = Room::factory()->create([
            'location_id' => $location->id,
            'capacity' => 20,
            'is_active' => true,
        ]);

        $this->user = User::factory()->create(['role' => UserRole::User]);
        $this->otherUser = User::factory()->create(['role' => UserRole::User]);
    }

    /**
     * Test that a user can favourite and unfavourite a room.
     */
    public function test_add_and_remove_favorite(): void
    {
        $this->actingAs($this->user)
            ->postJson("/api/favorites/{$this->room->id}")
            ->assertStatus(201);

        $this->assertDatabaseHas('favorites', [
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
        ]);

        $this->actingAs($this->user)
            ->deleteJson("/api/favorites/{$this->room->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('favorites', [
            'user_id' => $this->user->id,
            'room_id' => $this->room->id,
        ]);
    }

    /**
     * Test that favouriting is idempotent (no duplicate rows).
     */
    public function test_adding_favorite_twice_is_idempotent(): void
    {
        $this->actingAs($this->user)->postJson("/api/favorites/{$this->room->id}")->assertStatus(201);
        $this->actingAs($this->user)->postJson("/api/favorites/{$this->room->id}")->assertStatus(201);

        $this->assertDatabaseCount('favorites', 1);
    }

    /**
     * Test that favourites are scoped per user.
     */
    public function test_favorites_are_scoped_per_user(): void
    {
        $this->actingAs($this->user)->postJson("/api/favorites/{$this->room->id}")->assertStatus(201);

        $response = $this->actingAs($this->otherUser)
            ->getJson('/api/favorites')
            ->assertStatus(200);

        $this->assertCount(0, $response->json());

        $response = $this->actingAs($this->user)
            ->getJson('/api/favorites')
            ->assertStatus(200);

        $this->assertCount(1, $response->json());
        $this->assertEquals($this->room->name, $response->json()[0]['name']);
    }

    /**
     * Test that guests cannot use favorites endpoints.
     */
    public function test_guests_cannot_use_favorites(): void
    {
        $this->getJson('/api/favorites')->assertStatus(401);
        $this->postJson("/api/favorites/{$this->room->id}")->assertStatus(401);
    }

    /**
     * Test that removing an inactive room from favorites still works.
     */
    public function test_remove_favorite_works_for_inactive_room(): void
    {
        $this->actingAs($this->user)->postJson("/api/favorites/{$this->room->id}")->assertStatus(201);

        $this->room->update(['is_active' => false]);

        $this->actingAs($this->user)
            ->deleteJson("/api/favorites/{$this->room->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('favorites', ['room_id' => $this->room->id]);
    }
}
