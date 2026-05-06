<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Character;
use App\Models\EntityLink;
use App\Models\Faction;
use App\Models\Item;
use App\Models\Location;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\User;
use App\Models\WorldEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ScenarioNodeEntityLinkTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_create_update_duplicate_and_delete_graph_node_links(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create(['user_id' => $user->id, 'title' => 'Scenario']);
        $node = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'order_index' => 0,
        ]);
        $map = Map::create([
            'user_id' => $user->id,
            'name' => 'Linked Map',
            'width' => 20,
            'height' => 20,
            'cell_size' => 40,
            'data' => ['objects' => []],
        ]);

        $first = $this->postJson("/api/scenario-nodes/{$node->id}/entity-links", [
            'target_type' => 'map',
            'target_id' => $map->id,
            'label' => 'Entrance',
        ])->assertStatus(201)
            ->assertJsonPath('source_type', EntityLink::SOURCE_SCENARIO_NODE)
            ->assertJsonPath('source_id', $node->id)
            ->assertJsonPath('target_type', EntityLink::TARGET_MAP)
            ->assertJsonPath('target_id', $map->id)
            ->assertJsonPath('relation_type', EntityLink::RELATION_RELATED)
            ->assertJsonPath('label', 'Entrance')
            ->json();

        $this->postJson("/api/scenario-nodes/{$node->id}/entity-links", [
            'target_type' => 'map',
            'target_id' => $map->id,
            'label' => 'Updated entrance',
        ])->assertStatus(201)
            ->assertJsonPath('id', $first['id'])
            ->assertJsonPath('label', 'Updated entrance');

        $this->assertDatabaseCount('entity_links', 1);

        $this->getJson("/api/scenario-nodes/{$node->id}/entity-links")
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $first['id'])
            ->assertJsonPath('0.label', 'Updated entrance');

        $this->deleteJson('/api/scenario-node-entity-links/' . $first['id'])
            ->assertStatus(200)
            ->assertExactJson(['message' => 'Deleted']);

        $this->assertDatabaseMissing('entity_links', ['id' => $first['id']]);
    }

    public function test_user_can_link_map_character_and_item_targets(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create(['user_id' => $user->id, 'title' => 'Scenario']);
        $node = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'order_index' => 0,
        ]);
        $map = Map::create([
            'user_id' => $user->id,
            'name' => 'Map',
            'width' => 20,
            'height' => 20,
            'cell_size' => 40,
            'data' => [],
        ]);
        $character = Character::create([
            'user_id' => $user->id,
            'name' => 'NPC',
            'role' => 'NPC',
            'level' => 1,
        ]);
        $item = Item::create([
            'user_id' => $user->id,
            'name' => 'Relic',
            'type' => 'Прочее',
            'rarity' => 'Обычный',
            'modifiers' => [],
            'weight' => 0,
            'value' => 0,
        ]);

        foreach ([
            ['type' => 'map', 'id' => $map->id],
            ['type' => 'character', 'id' => $character->id],
            ['type' => 'item', 'id' => $item->id],
        ] as $target) {
            $this->postJson("/api/scenario-nodes/{$node->id}/entity-links", [
                'target_type' => $target['type'],
                'target_id' => $target['id'],
            ])->assertStatus(201)
                ->assertJsonPath('target_type', $target['type'])
                ->assertJsonPath('target_id', $target['id']);
        }

        $this->assertDatabaseCount('entity_links', 3);
    }

    public function test_user_can_link_asset_location_faction_and_event_targets(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create(['user_id' => $user->id, 'title' => 'Scenario']);
        $node = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'order_index' => 0,
        ]);
        $asset = Asset::create([
            'user_id' => $user->id,
            'type' => Asset::TYPE_OTHER,
            'name' => 'Asset',
            'metadata' => [],
        ]);
        $location = Location::create([
            'user_id' => $user->id,
            'name' => 'Location',
            'metadata' => [],
        ]);
        $faction = Faction::create([
            'user_id' => $user->id,
            'name' => 'Faction',
            'metadata' => [],
        ]);
        $event = WorldEvent::create([
            'user_id' => $user->id,
            'title' => 'Event',
            'metadata' => [],
        ]);

        foreach ([
            ['type' => EntityLink::TARGET_ASSET, 'id' => $asset->id],
            ['type' => EntityLink::TARGET_LOCATION, 'id' => $location->id],
            ['type' => EntityLink::TARGET_FACTION, 'id' => $faction->id],
            ['type' => EntityLink::TARGET_EVENT, 'id' => $event->id],
        ] as $target) {
            $this->postJson("/api/scenario-nodes/{$node->id}/entity-links", [
                'target_type' => $target['type'],
                'target_id' => $target['id'],
                'label' => 'Reference',
            ])->assertStatus(201)
                ->assertJsonPath('target_type', $target['type'])
                ->assertJsonPath('target_id', $target['id'])
                ->assertJsonPath('relation_type', EntityLink::RELATION_RELATED);
        }

        $this->assertDatabaseCount('entity_links', 4);
    }

    public function test_user_cannot_link_foreign_target_or_access_foreign_node_and_link(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $scenario = Scenario::create(['user_id' => $owner->id, 'title' => 'Scenario']);
        $node = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'order_index' => 0,
        ]);
        $ownerMap = Map::create([
            'user_id' => $owner->id,
            'name' => 'Owner Map',
            'width' => 20,
            'height' => 20,
            'cell_size' => 40,
            'data' => [],
        ]);
        $intruderMap = Map::create([
            'user_id' => $intruder->id,
            'name' => 'Intruder Map',
            'width' => 20,
            'height' => 20,
            'cell_size' => 40,
            'data' => [],
        ]);
        $intruderAsset = Asset::create([
            'user_id' => $intruder->id,
            'type' => Asset::TYPE_OTHER,
            'name' => 'Intruder Asset',
            'metadata' => [],
        ]);

        Sanctum::actingAs($owner);

        $link = $this->postJson("/api/scenario-nodes/{$node->id}/entity-links", [
            'target_type' => 'map',
            'target_id' => $ownerMap->id,
        ])->assertStatus(201)->json();

        $this->postJson("/api/scenario-nodes/{$node->id}/entity-links", [
            'target_type' => 'map',
            'target_id' => $intruderMap->id,
        ])->assertStatus(404);
        $this->postJson("/api/scenario-nodes/{$node->id}/entity-links", [
            'target_type' => EntityLink::TARGET_ASSET,
            'target_id' => $intruderAsset->id,
        ])->assertStatus(404);

        Sanctum::actingAs($intruder);

        $this->getJson("/api/scenario-nodes/{$node->id}/entity-links")->assertStatus(404);
        $this->postJson("/api/scenario-nodes/{$node->id}/entity-links", [
            'target_type' => 'map',
            'target_id' => $intruderMap->id,
        ])->assertStatus(404);
        $this->deleteJson('/api/scenario-node-entity-links/' . $link['id'])->assertStatus(404);
    }

    public function test_deleting_graph_node_removes_entity_links(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create(['user_id' => $user->id, 'title' => 'Scenario']);
        $node = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'order_index' => 0,
        ]);
        $item = Item::create([
            'user_id' => $user->id,
            'name' => 'Relic',
            'type' => 'Прочее',
            'rarity' => 'Обычный',
            'modifiers' => [],
            'weight' => 0,
            'value' => 0,
        ]);

        $link = $this->postJson("/api/scenario-nodes/{$node->id}/entity-links", [
            'target_type' => 'item',
            'target_id' => $item->id,
        ])->assertStatus(201)->json();

        $this->deleteJson("/api/scenario-nodes/{$node->id}")->assertStatus(200);

        $this->assertDatabaseMissing('entity_links', ['id' => $link['id']]);
    }
}
