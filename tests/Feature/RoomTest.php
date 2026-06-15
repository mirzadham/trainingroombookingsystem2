<?php

namespace Tests\Feature;

use App\Models\Location;
use App\Models\Room;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class RoomTest extends TestCase
{
    private Location $tpmLocation;
    private Location $khtpLocation;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup mock locations
        $this->tpmLocation = Location::create([
            'name' => 'Technology Park Malaysia',
            'code' => 'TPM',
            'address' => 'Kuala Lumpur',
        ]);

        $this->khtpLocation = Location::create([
            'name' => 'Kulim Hi-Tech Park',
            'code' => 'KHTP',
            'address' => 'Kedah',
        ]);
    }

    /**
     * Test public index endpoint.
     */
    public function test_public_can_list_active_rooms(): void
    {
        Room::factory()->create([
            'location_id' => $this->tpmLocation->id,
            'is_active' => true,
            'name' => 'Active Room',
        ]);

        Room::factory()->create([
            'location_id' => $this->tpmLocation->id,
            'is_active' => false,
            'name' => 'Inactive Room',
        ]);

        $response = $this->getJson('/api/rooms');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Active Room'])
            ->assertJsonMissing(['name' => 'Inactive Room']);
    }

    /**
     * Test public show endpoint.
     */
    public function test_public_view_room_by_id(): void
    {
        $activeRoom = Room::factory()->create([
            'location_id' => $this->tpmLocation->id,
            'is_active' => true,
        ]);

        $inactiveRoom = Room::factory()->create([
            'location_id' => $this->tpmLocation->id,
            'is_active' => false,
        ]);

        $this->getJson("/api/rooms/{$activeRoom->id}")
            ->assertStatus(200);

        $this->getJson("/api/rooms/{$inactiveRoom->id}")
            ->assertStatus(404);
    }

    /**
     * Test admin index endpoint with scoping.
     */
    public function test_admin_index_access_control(): void
    {
        $tpmRoom = Room::factory()->create(['location_id' => $this->tpmLocation->id, 'name' => 'TPM Room']);
        $khtpRoom = Room::factory()->create(['location_id' => $this->khtpLocation->id, 'name' => 'KHTP Room']);

        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $tpmAdmin = User::factory()->create([
            'role' => UserRole::LocationAdmin,
            'location_id' => $this->tpmLocation->id,
        ]);

        // Super Admin gets all rooms
        $this->actingAs($superAdmin)
            ->getJson('/api/admin/rooms')
            ->assertStatus(200)
            ->assertJsonCount(2);

        // Location Admin gets only their location's rooms
        $this->actingAs($tpmAdmin)
            ->getJson('/api/admin/rooms')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'TPM Room'])
            ->assertJsonMissing(['name' => 'KHTP Room']);
    }

    /**
     * Test room store authorization.
     */
    public function test_room_creation_authorization(): void
    {
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $tpmAdmin = User::factory()->create([
            'role' => UserRole::LocationAdmin,
            'location_id' => $this->tpmLocation->id,
        ]);
        $normalUser = User::factory()->create(['role' => UserRole::User]);

        $roomPayload = [
            'location_id' => $this->tpmLocation->id,
            'name' => 'New Room',
            'capacity' => 10,
            'amenities' => ['Projector'],
        ];

        // Normal user forbidden
        $this->actingAs($normalUser)
            ->postJson('/api/admin/rooms', $roomPayload)
            ->assertStatus(403);

        // TPM Admin can create in TPM
        $this->actingAs($tpmAdmin)
            ->postJson('/api/admin/rooms', $roomPayload)
            ->assertStatus(201);

        // TPM Admin cannot create in KHTP
        $badPayload = array_merge($roomPayload, ['location_id' => $this->khtpLocation->id]);
        $this->actingAs($tpmAdmin)
            ->postJson('/api/admin/rooms', $badPayload)
            ->assertStatus(403);

        // Super Admin can create anywhere
        $this->actingAs($superAdmin)
            ->postJson('/api/admin/rooms', $badPayload)
            ->assertStatus(201);
    }

    /**
     * Test room destroy (which soft-deactivates).
     */
    public function test_room_deactivation_on_destroy(): void
    {
        $room = Room::factory()->create(['location_id' => $this->tpmLocation->id, 'is_active' => true]);
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);

        $this->actingAs($superAdmin)
            ->deleteJson("/api/admin/rooms/{$room->id}")
            ->assertStatus(200);

        $this->assertFalse($room->fresh()->is_active);
    }

    /**
     * Test active toggle.
     */
    public function test_room_active_toggle(): void
    {
        $room = Room::factory()->create(['location_id' => $this->tpmLocation->id, 'is_active' => true]);
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);

        $this->actingAs($superAdmin)
            ->postJson("/api/admin/rooms/{$room->id}/toggle-active")
            ->assertStatus(200)
            ->assertJsonFragment(['is_active' => false]);

        $this->actingAs($superAdmin)
            ->postJson("/api/admin/rooms/{$room->id}/toggle-active")
            ->assertStatus(200)
            ->assertJsonFragment(['is_active' => true]);
    }

    /**
     * Test room image upload, deletion and setting primary image.
     */
    public function test_room_image_management_flow(): void
    {
        Storage::fake('public');
        config(['filesystems.default' => 'public']);

        $room = Room::factory()->create(['location_id' => $this->tpmLocation->id, 'image_url' => null]);
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin]);

        $file1 = UploadedFile::fake()->image('room1.jpg');
        $file2 = UploadedFile::fake()->image('room2.jpg');

        // 1. Upload Images
        $uploadResponse = $this->actingAs($superAdmin)
            ->postJson("/api/admin/rooms/{$room->id}/images", [
                'files' => [$file1, $file2],
            ]);

        $uploadResponse->assertStatus(200)
            ->assertJsonStructure(['image_url', 'images']);

        $room->refresh();
        $this->assertNotEmpty($room->image_url);
        $this->assertCount(2, $room->images);

        $uploadedUrl1 = $room->images[0];
        $uploadedUrl2 = $room->images[1];

        // 2. Set Cover Image
        $setCoverResponse = $this->actingAs($superAdmin)
            ->postJson("/api/admin/rooms/{$room->id}/images/set-primary", [
                'image_path' => $uploadedUrl2,
            ]);

        $setCoverResponse->assertStatus(200);
        $this->assertEquals($uploadedUrl2, $room->fresh()->image_url);

        // 3. Delete Cover Image (should fall back to remaining one)
        $deleteResponse = $this->actingAs($superAdmin)
            ->deleteJson("/api/admin/rooms/{$room->id}/images", [
                'image_path' => $uploadedUrl2,
            ]);

        $deleteResponse->assertStatus(200);
        $room->refresh();
        $this->assertEquals($uploadedUrl1, $room->image_url);
        $this->assertCount(1, $room->images);
    }
}
