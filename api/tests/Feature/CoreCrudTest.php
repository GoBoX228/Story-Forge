<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\Chapter;
use App\Models\Character;
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

        $chapterResponse = $this->postJson("/api/scenarios/{$scenarioId}/chapters", [
            'title' => 'Chapter One',
        ]);
        $chapterResponse->assertStatus(201)->assertJsonPath('order_index', 0);
        $chapterId = (string) $chapterResponse->json('id');

        $blockResponse = $this->postJson("/api/chapters/{$chapterId}/blocks", [
            'type' => 'scene',
            'content' => 'Block content',
        ]);
        $blockResponse->assertStatus(201)->assertJsonPath('order_index', 0);
        $blockId = (string) $blockResponse->json('id');

        $mapResponse = $this->postJson('/api/maps', [
            'name' => 'Map One',
            'width' => 20,
            'height' => 20,
            'cell_size' => 32,
            'data' => ['tiles' => []],
            'scenario_id' => (int) $scenarioId,
            'campaign_id' => (int) $campaignId,
        ]);
        $mapResponse->assertStatus(201);
        $mapId = (string) $mapResponse->json('id');

        $characterResponse = $this->postJson('/api/characters', [
            'name' => 'Character One',
            'role' => 'NPC',
            'scenario_id' => (int) $scenarioId,
            'campaign_id' => (int) $campaignId,
            'stats' => ['str' => 10],
            'inventory' => ['item' => 'rope'],
        ]);
        $characterResponse->assertStatus(201);
        $characterId = (string) $characterResponse->json('id');

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

        $this->patchJson("/api/chapters/{$chapterId}", ['title' => 'Chapter Updated'])
            ->assertStatus(200)
            ->assertJsonPath('title', 'Chapter Updated');

        $this->patchJson("/api/blocks/{$blockId}", ['content' => 'Updated block'])
            ->assertStatus(200)
            ->assertJsonPath('content', 'Updated block');

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
            ->assertJsonPath('chapters.0.id', (int) $chapterId)
            ->assertJsonPath('chapters.0.blocks.0.id', (int) $blockId);

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

        $chapter = Chapter::create([
            'scenario_id' => $scenario->id,
            'title' => 'Owner Chapter',
            'order_index' => 0,
        ]);

        $block = $chapter->blocks()->create([
            'type' => 'scene',
            'content' => 'Owner Block',
            'order_index' => 0,
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
            'level' => 1,
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
        $this->patchJson("/api/chapters/{$chapter->id}", ['title' => 'x'])->assertStatus(404);
        $this->patchJson("/api/blocks/{$block->id}", ['content' => 'x'])->assertStatus(404);
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

        $this->postJson('/api/maps', [
            'name' => 'My Map',
            'width' => 10,
            'height' => 10,
            'cell_size' => 32,
            'scenario_id' => $foreignScenario->id,
        ])->assertStatus(404);

        $this->postJson('/api/characters', [
            'name' => 'My Character',
            'campaign_id' => $foreignCampaign->id,
        ])->assertStatus(404);

        $this->postJson('/api/campaigns', [
            'title' => 'My Campaign',
            'scenario_ids' => [$foreignScenario->id],
        ])->assertStatus(422)->assertJsonValidationErrors(['scenario_ids']);
    }

    public function test_default_order_index_and_reorder_flow_for_chapters_and_blocks(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create([
            'user_id' => $user->id,
            'title' => 'Scenario',
        ]);

        $firstChapter = $this->postJson("/api/scenarios/{$scenario->id}/chapters", [
            'title' => 'Chapter A',
        ])->assertStatus(201)->assertJsonPath('order_index', 0)->json();

        $secondChapter = $this->postJson("/api/scenarios/{$scenario->id}/chapters", [
            'title' => 'Chapter B',
        ])->assertStatus(201)->assertJsonPath('order_index', 1)->json();

        $firstBlock = $this->postJson('/api/chapters/' . $firstChapter['id'] . '/blocks', [
            'type' => 'scene',
            'content' => 'Block A',
        ])->assertStatus(201)->assertJsonPath('order_index', 0)->json();

        $this->postJson('/api/chapters/' . $firstChapter['id'] . '/blocks', [
            'type' => 'scene',
            'content' => 'Block B',
        ])->assertStatus(201)->assertJsonPath('order_index', 1);

        $this->postJson('/api/blocks/' . $firstBlock['id'] . '/reorder', [
            'order_index' => 7,
        ])->assertStatus(200)->assertJsonPath('order_index', 7);

        $this->assertSame(1, $secondChapter['order_index']);
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

        Map::create([
            'user_id' => $user->id,
            'scenario_id' => $scenarioA->id,
            'name' => 'Map A',
            'width' => 10,
            'height' => 10,
            'cell_size' => 32,
        ]);

        Map::create([
            'user_id' => $user->id,
            'scenario_id' => $scenarioB->id,
            'name' => 'Map B',
            'width' => 10,
            'height' => 10,
            'cell_size' => 32,
        ]);

        $this->getJson('/api/maps?scenarioId=' . $scenarioA->id)
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.scenario_id', $scenarioA->id);

        Character::create([
            'user_id' => $user->id,
            'scenario_id' => $scenarioA->id,
            'name' => 'Goblin Shaman',
            'role' => 'NPC',
            'level' => 1,
        ]);

        Character::create([
            'user_id' => $user->id,
            'scenario_id' => $scenarioB->id,
            'name' => 'Knight',
            'role' => 'NPC',
            'level' => 1,
        ]);

        $this->getJson('/api/characters?scenarioId=' . $scenarioA->id . '&q=gob')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Goblin Shaman');

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
            'scenario_id' => $scenario->id,
            'name' => 'Map',
            'width' => 10,
            'height' => 10,
            'cell_size' => 32,
        ]);

        $character = Character::create([
            'user_id' => $user->id,
            'scenario_id' => $scenario->id,
            'name' => 'Character',
            'role' => 'NPC',
            'level' => 1,
        ]);

        $campaignResponse = $this->postJson('/api/campaigns', [
            'title' => 'Campaign',
            'scenario_ids' => [$scenario->id],
            'map_ids' => [$map->id],
            'character_ids' => [$character->id],
        ])->assertStatus(201);

        $campaignKeys = array_keys($campaignResponse->json());
        $this->assertSame([
            'id',
            'title',
            'description',
            'tags',
            'resources',
            'progress',
            'last_played',
            'scenario_ids',
            'map_ids',
            'character_ids',
            'created_at',
            'updated_at',
        ], $campaignKeys);

        $chapter = Chapter::create([
            'scenario_id' => $scenario->id,
            'title' => 'Chapter',
            'order_index' => 0,
        ]);
        $chapter->blocks()->create([
            'type' => 'scene',
            'content' => 'Block',
            'order_index' => 0,
        ]);

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
                'chapters' => [
                    '*' => [
                        'id',
                        'scenario_id',
                        'title',
                        'order_index',
                        'created_at',
                        'updated_at',
                        'blocks' => [
                            '*' => [
                                'id',
                                'chapter_id',
                                'type',
                                'content',
                                'order_index',
                                'difficulty',
                                'created_at',
                                'updated_at',
                            ],
                        ],
                    ],
                ],
            ]);

        $this->deleteJson('/api/campaigns/' . $campaignResponse->json('id'))
            ->assertStatus(200)
            ->assertExactJson(['message' => 'Deleted']);
    }
}
