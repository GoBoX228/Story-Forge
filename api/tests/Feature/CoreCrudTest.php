<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\Character;
use App\Models\EntityLink;
use App\Models\Item;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CoreCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_core_crud_happy_path_for_all_resources(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $campaignResponse = $this->postJson('/api/campaigns', [
            'title' => 'Campaign One',
            'description' => 'Campaign Description',
        ]);
        $campaignResponse->assertStatus(201);
        $campaignId = (string) $campaignResponse->json('id');

        $scenarioResponse = $this->postJson('/api/scenarios', [
            'title' => 'Scenario One',
            'description' => 'Scenario Description',
            'campaign_id' => (int) $campaignId,
        ]);
        $scenarioResponse->assertStatus(201);
        $scenarioId = (string) $scenarioResponse->json('id');

        $mapResponse = $this->postJson('/api/maps', [
            'name' => 'Map One',
            'width' => 20,
            'height' => 20,
            'cell_size' => 32,
            'data' => ['tiles' => []],
            'campaign_id' => (int) $campaignId,
        ]);
        $mapResponse->assertStatus(201);
        $mapId = (string) $mapResponse->json('id');

        $characterResponse = $this->postJson('/api/characters', [
            'name' => 'Character One',
            'role' => 'NPC',
            'campaign_id' => (int) $campaignId,
            'stats' => ['str' => 10],
            'inventory' => ['item' => 'rope'],
        ]);
        $characterResponse->assertStatus(201);
        $characterId = (string) $characterResponse->json('id');

        $this->postJson("/api/entity-links/scenario/{$scenarioId}", [
            'target_type' => EntityLink::TARGET_MAP,
            'target_id' => (int) $mapId,
            'relation_type' => EntityLink::RELATION_USES,
        ])->assertStatus(201);

        $this->postJson("/api/entity-links/scenario/{$scenarioId}", [
            'target_type' => EntityLink::TARGET_CHARACTER,
            'target_id' => (int) $characterId,
            'relation_type' => EntityLink::RELATION_USES,
        ])->assertStatus(201);

        $itemResponse = $this->postJson('/api/items', [
            'name' => 'Item One',
            'type' => 'weapon',
            'rarity' => 'rare',
            'modifiers' => [
                ['stat' => 'str', 'value' => 2],
            ],
            'weight' => 1.5,
            'value' => 150,
        ]);
        $itemResponse->assertStatus(201);
        $itemId = (string) $itemResponse->json('id');

        $this->patchJson("/api/campaigns/{$campaignId}", ['title' => 'Campaign Updated'])
            ->assertStatus(200)
            ->assertJsonPath('title', 'Campaign Updated');

        $this->patchJson("/api/scenarios/{$scenarioId}", ['title' => 'Scenario Updated'])
            ->assertStatus(200)
            ->assertJsonPath('title', 'Scenario Updated');

        $this->patchJson("/api/maps/{$mapId}", ['name' => 'Map Updated'])
            ->assertStatus(200)
            ->assertJsonPath('name', 'Map Updated');

        $this->patchJson("/api/characters/{$characterId}", ['name' => 'Character Updated'])
            ->assertStatus(200)
            ->assertJsonPath('name', 'Character Updated');

        $this->patchJson("/api/items/{$itemId}", ['name' => 'Item Updated'])
            ->assertStatus(200)
            ->assertJsonPath('name', 'Item Updated');

        $this->getJson("/api/scenarios/{$scenarioId}")
            ->assertStatus(200)
            ->assertJsonPath('id', (int) $scenarioId)
            ->assertJsonMissingPath('chapters');

        $this->deleteJson("/api/items/{$itemId}")
            ->assertStatus(200)
            ->assertExactJson(['message' => 'Deleted']);
    }

    public function test_ownership_boundaries_stay_404_for_foreign_core_entities(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $campaign = Campaign::create([
            'user_id' => $owner->id,
            'title' => 'Owner Campaign',
        ]);

        $scenario = Scenario::create([
            'user_id' => $owner->id,
            'title' => 'Owner Scenario',
        ]);

        $map = Map::create([
            'user_id' => $owner->id,
            'name' => 'Owner Map',
            'width' => 10,
            'height' => 10,
            'cell_size' => 32,
            'data' => ['tiles' => []],
        ]);

        $character = Character::create([
            'user_id' => $owner->id,
            'name' => 'Owner Character',
            'role' => 'NPC',
        ]);

        $item = Item::create([
            'user_id' => $owner->id,
            'name' => 'Owner Item',
            'type' => 'misc',
            'rarity' => 'common',
        ]);

        Sanctum::actingAs($intruder);

        $this->getJson("/api/campaigns/{$campaign->id}")->assertStatus(404);
        $this->getJson("/api/scenarios/{$scenario->id}")->assertStatus(404);
        $this->getJson("/api/maps/{$map->id}")->assertStatus(404);
        $this->patchJson("/api/characters/{$character->id}", ['name' => 'x'])->assertStatus(404);
        $this->getJson("/api/items/{$item->id}")->assertStatus(404);
    }

    public function test_relation_validation_and_foreign_links_contract_is_preserved(): void
    {
        $owner = User::factory()->create();
        $foreign = User::factory()->create();
        Sanctum::actingAs($owner);

        $foreignCampaign = Campaign::create([
            'user_id' => $foreign->id,
            'title' => 'Foreign Campaign',
        ]);

        $foreignScenario = Scenario::create([
            'user_id' => $foreign->id,
            'title' => 'Foreign Scenario',
        ]);

        $this->postJson('/api/scenarios', [
            'title' => 'My Scenario',
            'campaign_id' => $foreignCampaign->id,
        ])->assertStatus(404);

        $ownMap = Map::create([
            'user_id' => $owner->id,
            'name' => 'My Map',
            'width' => 10,
            'height' => 10,
            'cell_size' => 32,
        ]);

        $this->postJson("/api/entity-links/scenario/{$foreignScenario->id}", [
            'target_type' => EntityLink::TARGET_MAP,
            'target_id' => $ownMap->id,
            'relation_type' => EntityLink::RELATION_USES,
        ])->assertStatus(404);

        $ownCampaign = Campaign::create([
            'user_id' => $owner->id,
            'title' => 'My Campaign',
        ]);

        $this->postJson("/api/entity-links/campaign/{$ownCampaign->id}", [
            'target_type' => EntityLink::TARGET_SCENARIO,
            'target_id' => $foreignScenario->id,
            'relation_type' => EntityLink::RELATION_USES,
        ])->assertStatus(404);
    }

    public function test_list_filters_search_and_sorting_behavior_are_preserved(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenarioA = Scenario::create([
            'user_id' => $user->id,
            'title' => 'A Scenario',
        ]);

        sleep(1);

        $scenarioB = Scenario::create([
            'user_id' => $user->id,
            'title' => 'B Scenario',
        ]);

        $this->getJson('/api/scenarios')
            ->assertStatus(200)
            ->assertJsonPath('0.id', $scenarioB->id);

        $mapA = Map::create([
            'user_id' => $user->id,
            'name' => 'Map A',
            'width' => 10,
            'height' => 10,
            'cell_size' => 32,
        ]);

        $mapB = Map::create([
            'user_id' => $user->id,
            'name' => 'Map B',
            'width' => 10,
            'height' => 10,
            'cell_size' => 32,
        ]);

        EntityLink::create([
            'source_type' => EntityLink::TARGET_SCENARIO,
            'source_id' => $scenarioA->id,
            'target_type' => EntityLink::TARGET_MAP,
            'target_id' => $mapA->id,
            'relation_type' => EntityLink::RELATION_USES,
        ]);
        EntityLink::create([
            'source_type' => EntityLink::TARGET_SCENARIO,
            'source_id' => $scenarioB->id,
            'target_type' => EntityLink::TARGET_MAP,
            'target_id' => $mapB->id,
            'relation_type' => EntityLink::RELATION_USES,
        ]);

        $this->getJson('/api/maps?scenarioId=' . $scenarioA->id)
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $mapA->id)
            ->assertJsonMissingPath('0.scenario_id');

        $characterA = Character::create([
            'user_id' => $user->id,
            'name' => 'Goblin Shaman',
            'role' => 'NPC',
        ]);

        $characterB = Character::create([
            'user_id' => $user->id,
            'name' => 'Knight',
            'role' => 'NPC',
        ]);

        EntityLink::create([
            'source_type' => EntityLink::TARGET_SCENARIO,
            'source_id' => $scenarioA->id,
            'target_type' => EntityLink::TARGET_CHARACTER,
            'target_id' => $characterA->id,
            'relation_type' => EntityLink::RELATION_USES,
        ]);
        EntityLink::create([
            'source_type' => EntityLink::TARGET_SCENARIO,
            'source_id' => $scenarioB->id,
            'target_type' => EntityLink::TARGET_CHARACTER,
            'target_id' => $characterB->id,
            'relation_type' => EntityLink::RELATION_USES,
        ]);

        $this->getJson('/api/characters?scenarioId=' . $scenarioA->id . '&q=gob')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Goblin Shaman');

        $this->getJson('/api/characters?scenario_id=' . $scenarioA->id . '&q=gob')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $characterA->id)
            ->assertJsonMissingPath('0.scenario_id');

        Item::create([
            'user_id' => $user->id,
            'name' => 'Iron Sword',
            'type' => 'Weapon',
            'rarity' => 'Common',
        ]);

        Item::create([
            'user_id' => $user->id,
            'name' => 'Silk Rope',
            'type' => 'Tool',
            'rarity' => 'Rare',
        ]);

        $this->getJson('/api/items?q=weapon')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Iron Sword');
    }

    public function test_contract_keys_for_campaign_payload_scenario_detail_and_delete_message(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create([
            'user_id' => $user->id,
            'title' => 'Scenario',
        ]);

        $map = Map::create([
            'user_id' => $user->id,
            'name' => 'Map',
            'width' => 10,
            'height' => 10,
            'cell_size' => 32,
        ]);

        $character = Character::create([
            'user_id' => $user->id,
            'name' => 'Character',
            'role' => 'NPC',
        ]);

        $campaignResponse = $this->postJson('/api/campaigns', [
            'title' => 'Campaign',
        ])->assertStatus(201);

        $campaignKeys = array_keys($campaignResponse->json());
        $this->assertSame([
            'id',
            'title',
            'description',
            'scenario_ids',
            'map_ids',
            'character_ids',
            'item_ids',
            'created_at',
            'updated_at',
        ], $campaignKeys);

        $this->getJson('/api/scenarios/' . $scenario->id)
            ->assertStatus(200)
            ->assertJsonStructure([
                'id',
                'user_id',
                'campaign_id',
                'title',
                'description',
                'created_at',
                'updated_at',
            ])
            ->assertJsonMissingPath('chapters');

        $this->deleteJson('/api/campaigns/' . $campaignResponse->json('id'))
            ->assertStatus(200)
            ->assertExactJson(['message' => 'Deleted']);
    }
}
