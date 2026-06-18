<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\EntityLink;
use App\Models\Item;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CampaignTest extends TestCase
{
    use RefreshDatabase;

    public function test_campaign_uses_scenario_ownership_and_reusable_material_links(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $campaign = $this->postJson('/api/campaigns', [
            'title' => 'Campaign A',
            'description' => 'Campaign description',
        ])->assertCreated()->json();

        $scenario = Scenario::create(['user_id' => $user->id, 'title' => 'Scenario A']);
        $map = Map::create([
            'user_id' => $user->id,
            'name' => 'Map A',
            'width' => 20,
            'height' => 20,
            'cell_size' => 32,
        ]);
        $character = Character::create(['user_id' => $user->id, 'name' => 'NPC A', 'role' => 'NPC']);
        $item = Item::create(['user_id' => $user->id, 'name' => 'Item A']);

        $this->patchJson("/api/scenarios/{$scenario->id}", [
            'campaign_id' => $campaign['id'],
        ])->assertOk()->assertJsonPath('campaign_id', $campaign['id']);

        foreach ([
            EntityLink::TARGET_MAP => $map->id,
            EntityLink::TARGET_CHARACTER => $character->id,
            EntityLink::TARGET_ITEM => $item->id,
        ] as $type => $id) {
            $this->postJson("/api/entity-links/campaign/{$campaign['id']}", [
                'target_type' => $type,
                'target_id' => $id,
                'relation_type' => EntityLink::RELATION_USES,
            ])->assertCreated();
        }

        $this->getJson("/api/campaigns/{$campaign['id']}")
            ->assertOk()
            ->assertJsonPath('scenario_ids.0', $scenario->id)
            ->assertJsonPath('map_ids.0', $map->id)
            ->assertJsonPath('character_ids.0', $character->id)
            ->assertJsonPath('item_ids.0', $item->id);

        $this->assertFalse(Schema::hasColumn('maps', 'campaign_id'));
        $this->assertFalse(Schema::hasColumn('characters', 'campaign_id'));
        $this->assertFalse(Schema::hasColumn('campaigns', 'resources'));
        $this->assertFalse(Schema::hasColumn('campaigns', 'progress'));
    }

    public function test_campaign_material_links_are_owner_scoped(): void
    {
        $owner = User::factory()->create();
        $foreignUser = User::factory()->create();
        Sanctum::actingAs($owner);

        $campaignId = $this->postJson('/api/campaigns', ['title' => 'Campaign A'])
            ->assertCreated()
            ->json('id');
        $foreignScenario = Scenario::create([
            'user_id' => $foreignUser->id,
            'title' => 'Foreign Scenario',
        ]);

        $this->postJson("/api/entity-links/campaign/{$campaignId}", [
            'target_type' => EntityLink::TARGET_SCENARIO,
            'target_id' => $foreignScenario->id,
            'relation_type' => EntityLink::RELATION_USES,
        ])->assertNotFound();
    }
}
