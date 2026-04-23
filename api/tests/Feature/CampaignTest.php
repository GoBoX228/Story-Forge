<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CampaignTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_campaign_and_sync_relations(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create([
            'user_id' => $user->id,
            'title' => 'Scenario A',
            'description' => 'Desc',
        ]);

        $map = Map::create([
            'user_id' => $user->id,
            'scenario_id' => $scenario->id,
            'name' => 'Map A',
            'width' => 20,
            'height' => 20,
            'cell_size' => 32,
            'data' => ['objects' => []],
        ]);

        $character = Character::create([
            'user_id' => $user->id,
            'scenario_id' => $scenario->id,
            'name' => 'NPC A',
            'role' => 'NPC',
            'level' => 1,
            'stats' => [],
            'inventory' => [],
        ]);

        $response = $this->postJson('/api/campaigns', [
            'title' => 'Campaign A',
            'description' => 'Campaign description',
            'tags' => ['tag-a'],
            'resources' => ['resource-a'],
            'progress' => 45,
            'scenario_ids' => [$scenario->id],
            'map_ids' => [$map->id],
            'character_ids' => [$character->id],
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['title' => 'Campaign A'])
            ->assertJsonPath('scenario_ids.0', $scenario->id)
            ->assertJsonPath('map_ids.0', $map->id)
            ->assertJsonPath('character_ids.0', $character->id);

        $this->assertDatabaseHas('campaigns', [
            'title' => 'Campaign A',
            'user_id' => $user->id,
        ]);

        $scenario->refresh();
        $map->refresh();
        $character->refresh();

        $this->assertNotNull($scenario->campaign_id);
        $this->assertNotNull($map->campaign_id);
        $this->assertNotNull($character->campaign_id);
    }

    public function test_user_cannot_link_entities_from_another_user(): void
    {
        $owner = User::factory()->create();
        $foreignUser = User::factory()->create();
        Sanctum::actingAs($owner);

        $foreignScenario = Scenario::create([
            'user_id' => $foreignUser->id,
            'title' => 'Foreign Scenario',
            'description' => null,
        ]);

        $response = $this->postJson('/api/campaigns', [
            'title' => 'Campaign A',
            'scenario_ids' => [$foreignScenario->id],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('scenario_ids');
    }
}

