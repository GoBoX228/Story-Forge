<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\Chronicle;
use App\Models\Faction;
use App\Models\Location;
use App\Models\User;
use App\Models\WorldEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorldModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_crud_locations_factions_and_events(): void
    {
        $user = User::factory()->create();
        $campaign = $this->createCampaign($user, 'Northern Campaign');

        Sanctum::actingAs($user);

        $location = $this->postJson('/api/locations', [
            'name' => 'White Storm Temple',
            'description' => 'Ancient ice shrine.',
            'campaign_id' => $campaign->id,
        ])->assertStatus(201)
            ->assertJsonPath('name', 'White Storm Temple')
            ->assertJsonPath('campaign_id', $campaign->id)
            ->json();

        $faction = $this->postJson('/api/factions', [
            'name' => 'Northern Clans',
            'description' => 'Rival clans at the border.',
            'campaign_id' => $campaign->id,
        ])->assertStatus(201)
            ->assertJsonPath('name', 'Northern Clans')
            ->json();

        $event = $this->postJson('/api/events', [
            'title' => 'Blizzard Treaty',
            'description' => 'A fragile pact is signed.',
            'starts_at' => '2026-05-01T10:00:00Z',
            'ends_at' => '2026-05-01T11:00:00Z',
            'campaign_id' => $campaign->id,
        ])->assertStatus(201)
            ->assertJsonPath('title', 'Blizzard Treaty')
            ->assertJsonPath('campaign_id', $campaign->id)
            ->json();

        $this->getJson('/api/locations?campaignId=' . $campaign->id . '&search=Temple')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $location['id']);

        $this->getJson('/api/factions?search=Clans')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $faction['id']);

        $this->getJson('/api/events?search=Treaty')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $event['id']);

        $this->getJson('/api/locations/' . $location['id'])->assertStatus(200);
        $this->getJson('/api/factions/' . $faction['id'])->assertStatus(200);
        $this->getJson('/api/events/' . $event['id'])->assertStatus(200);

        $this->patchJson('/api/locations/' . $location['id'], [
            'name' => 'Broken Rift',
            'campaign_id' => null,
        ])->assertStatus(200)
            ->assertJsonPath('name', 'Broken Rift')
            ->assertJsonPath('campaign_id', null);

        $this->patchJson('/api/factions/' . $faction['id'], [
            'description' => 'Updated faction notes.',
        ])->assertStatus(200)
            ->assertJsonPath('description', 'Updated faction notes.');

        $this->patchJson('/api/events/' . $event['id'], [
            'title' => 'Updated Treaty',
            'ends_at' => null,
        ])->assertStatus(200)
            ->assertJsonPath('title', 'Updated Treaty')
            ->assertJsonPath('ends_at', null);

        $this->deleteJson('/api/locations/' . $location['id'])->assertStatus(200);
        $this->deleteJson('/api/factions/' . $faction['id'])->assertStatus(200);
        $this->deleteJson('/api/events/' . $event['id'])->assertStatus(200);

        $this->assertDatabaseMissing('locations', ['id' => $location['id']]);
        $this->assertDatabaseMissing('factions', ['id' => $faction['id']]);
        $this->assertDatabaseMissing('events', ['id' => $event['id']]);
    }

    public function test_user_can_manage_chronicles_and_timeline_events(): void
    {
        $user = User::factory()->create();
        $campaign = $this->createCampaign($user, 'Timeline Campaign');

        Sanctum::actingAs($user);

        $chronicle = $this->postJson('/api/chronicles', [
            'title' => 'Icefall Chronicle',
            'description' => 'Season arc.',
            'start_label' => 'Day 1',
            'end_label' => 'Day 30',
            'step_size' => 5,
            'campaign_id' => $campaign->id,
        ])->assertStatus(201)
            ->assertJsonPath('title', 'Icefall Chronicle')
            ->assertJsonPath('start_label', 'Day 1')
            ->assertJsonPath('step_size', 5)
            ->json();

        $event = $this->postJson('/api/events', [
            'title' => 'Gate Opens',
            'chronicle_id' => $chronicle['id'],
            'position' => 10,
            'end_position' => 15,
            'start_label' => 'Dawn',
            'end_label' => 'Noon',
            'campaign_id' => $campaign->id,
        ])->assertStatus(201)
            ->assertJsonPath('chronicle_id', $chronicle['id'])
            ->assertJsonPath('position', 10)
            ->assertJsonPath('end_position', 15)
            ->assertJsonPath('start_label', 'Dawn')
            ->json();

        $this->getJson('/api/chronicles?search=Icefall')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $chronicle['id']);

        $this->getJson('/api/events?chronicleId=' . $chronicle['id'])
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $event['id']);

        $this->patchJson('/api/chronicles/' . $chronicle['id'], [
            'title' => 'Updated Chronicle',
            'end_label' => 'Day 40',
        ])->assertStatus(200)
            ->assertJsonPath('title', 'Updated Chronicle')
            ->assertJsonPath('end_label', 'Day 40');

        $this->patchJson('/api/events/' . $event['id'], [
            'position' => 20,
            'end_position' => null,
        ])->assertStatus(200)
            ->assertJsonPath('position', 20)
            ->assertJsonPath('end_position', null);

        $this->deleteJson('/api/chronicles/' . $chronicle['id'])->assertStatus(200);

        $this->assertDatabaseMissing('chronicles', ['id' => $chronicle['id']]);
        $this->assertDatabaseHas('events', [
            'id' => $event['id'],
            'chronicle_id' => null,
        ]);
    }

    public function test_world_records_are_scoped_to_owner(): void
    {
        $owner = User::factory()->create();
        $foreign = User::factory()->create();

        $location = Location::create([
            'user_id' => $owner->id,
            'name' => 'Owner Location',
            'metadata' => [],
        ]);
        $faction = Faction::create([
            'user_id' => $owner->id,
            'name' => 'Owner Faction',
            'metadata' => [],
        ]);
        $event = WorldEvent::create([
            'user_id' => $owner->id,
            'title' => 'Owner Event',
            'metadata' => [],
        ]);
        $chronicle = Chronicle::create([
            'user_id' => $owner->id,
            'title' => 'Owner Chronicle',
            'metadata' => [],
        ]);

        Sanctum::actingAs($foreign);

        $this->getJson('/api/locations/' . $location->id)->assertStatus(404);
        $this->patchJson('/api/factions/' . $faction->id, ['name' => 'Stolen'])->assertStatus(404);
        $this->getJson('/api/chronicles/' . $chronicle->id)->assertStatus(404);
        $this->deleteJson('/api/events/' . $event->id)->assertStatus(404);

        $this->getJson('/api/locations')->assertStatus(200)->assertJsonCount(0);
        $this->getJson('/api/factions')->assertStatus(200)->assertJsonCount(0);
        $this->getJson('/api/chronicles')->assertStatus(200)->assertJsonCount(0);
        $this->getJson('/api/events')->assertStatus(200)->assertJsonCount(0);
    }

    public function test_world_records_reject_foreign_campaign(): void
    {
        $user = User::factory()->create();
        $foreign = User::factory()->create();
        $foreignCampaign = $this->createCampaign($foreign, 'Foreign Campaign');

        Sanctum::actingAs($user);

        $this->postJson('/api/locations', [
            'name' => 'Invalid Location',
            'campaign_id' => $foreignCampaign->id,
        ])->assertStatus(404);

        $this->postJson('/api/factions', [
            'name' => 'Invalid Faction',
            'campaign_id' => $foreignCampaign->id,
        ])->assertStatus(404);

        $this->postJson('/api/events', [
            'title' => 'Invalid Event',
            'campaign_id' => $foreignCampaign->id,
        ])->assertStatus(404);

        $foreignChronicle = Chronicle::create([
            'user_id' => $foreign->id,
            'title' => 'Foreign Chronicle',
            'metadata' => [],
        ]);

        $this->postJson('/api/events', [
            'title' => 'Invalid Chronicle Event',
            'chronicle_id' => $foreignChronicle->id,
        ])->assertStatus(404);
    }

    public function test_world_record_validation_rejects_invalid_payloads(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/locations', ['description' => 'No name'])
            ->assertStatus(422);

        $this->postJson('/api/factions', ['metadata' => 'invalid'])
            ->assertStatus(422);

        $this->postJson('/api/events', [
            'title' => 'Invalid Dates',
            'starts_at' => '2026-05-02T10:00:00Z',
            'ends_at' => '2026-05-01T10:00:00Z',
        ])->assertStatus(422);
    }

    private function createCampaign(User $user, string $title): Campaign
    {
        return Campaign::create([
            'user_id' => $user->id,
            'title' => $title,
            'description' => 'Campaign',
            'tags' => [],
            'resources' => [],
            'progress' => 0,
            'last_played' => now()->toDateString(),
        ]);
    }
}
