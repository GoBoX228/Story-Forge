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
use App\Models\User;
use App\Models\WorldEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UniversalEntityLinkTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_list_update_and_delete_universal_links(): void
    {
        $user = User::factory()->create();
        $character = $this->createCharacter($user);
        $faction = $this->createFaction($user);
        Sanctum::actingAs($user);

        $link = $this->postJson("/api/entity-links/character/{$character->id}", [
            'target_type' => EntityLink::TARGET_FACTION,
            'target_id' => $faction->id,
            'relation_type' => EntityLink::RELATION_MEMBER_OF,
            'label' => 'Captain',
        ])
            ->assertStatus(201)
            ->assertJsonPath('source_type', EntityLink::TARGET_CHARACTER)
            ->assertJsonPath('target_type', EntityLink::TARGET_FACTION)
            ->assertJsonPath('relation_type', EntityLink::RELATION_MEMBER_OF)
            ->assertJsonPath('label', 'Captain')
            ->json();

        $duplicate = $this->postJson("/api/entity-links/character/{$character->id}", [
            'target_type' => EntityLink::TARGET_FACTION,
            'target_id' => $faction->id,
            'relation_type' => EntityLink::RELATION_MEMBER_OF,
            'label' => 'Commander',
        ])
            ->assertStatus(201)
            ->assertJsonPath('id', $link['id'])
            ->assertJsonPath('label', 'Commander')
            ->json();

        $this->assertSame($link['id'], $duplicate['id']);
        $this->assertDatabaseCount('entity_links', 1);

        $this->getJson("/api/entity-links/character/{$character->id}")
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $link['id']);

        $this->patchJson('/api/entity-links/' . $link['id'], [
            'relation_type' => EntityLink::RELATION_RELATED,
            'label' => 'Ally',
        ])
            ->assertStatus(200)
            ->assertJsonPath('relation_type', EntityLink::RELATION_RELATED)
            ->assertJsonPath('label', 'Ally');

        $this->deleteJson('/api/entity-links/' . $link['id'])
            ->assertStatus(200)
            ->assertJsonPath('message', 'Deleted');

        $this->assertDatabaseMissing('entity_links', ['id' => $link['id']]);
    }

    public function test_user_can_link_supported_material_pairs(): void
    {
        $user = User::factory()->create();
        $scenario = $this->createScenario($user);
        $map = $this->createMap($user);
        $item = $this->createItem($user);
        $asset = $this->createAsset($user);
        $location = $this->createLocation($user);
        $event = $this->createEvent($user);
        Sanctum::actingAs($user);

        $this->postJson("/api/entity-links/location/{$location->id}", [
            'target_type' => EntityLink::TARGET_MAP,
            'target_id' => $map->id,
            'relation_type' => EntityLink::RELATION_LOCATED_IN,
        ])->assertStatus(201);

        $this->postJson("/api/entity-links/item/{$item->id}", [
            'target_type' => EntityLink::TARGET_ASSET,
            'target_id' => $asset->id,
            'relation_type' => EntityLink::RELATION_USES,
        ])->assertStatus(201);

        $this->postJson("/api/entity-links/event/{$event->id}", [
            'target_type' => EntityLink::TARGET_SCENARIO,
            'target_id' => $scenario->id,
            'relation_type' => EntityLink::RELATION_MENTIONS,
        ])->assertStatus(201);

        $this->assertDatabaseCount('entity_links', 3);
    }

    public function test_asset_link_metadata_roles_are_preserved_and_part_of_duplicate_identity(): void
    {
        $user = User::factory()->create();
        $character = $this->createCharacter($user);
        $asset = $this->createAsset($user);
        Sanctum::actingAs($user);

        $portrait = $this->postJson("/api/entity-links/character/{$character->id}", [
            'target_type' => EntityLink::TARGET_ASSET,
            'target_id' => $asset->id,
            'relation_type' => EntityLink::RELATION_USES,
            'label' => 'Portrait',
            'metadata' => ['role' => 'portrait'],
        ])
            ->assertStatus(201)
            ->assertJsonPath('metadata.role', 'portrait')
            ->json();

        $token = $this->postJson("/api/entity-links/character/{$character->id}", [
            'target_type' => EntityLink::TARGET_ASSET,
            'target_id' => $asset->id,
            'relation_type' => EntityLink::RELATION_USES,
            'label' => 'Token',
            'metadata' => ['role' => 'token'],
        ])
            ->assertStatus(201)
            ->assertJsonPath('metadata.role', 'token')
            ->json();

        $duplicatePortrait = $this->postJson("/api/entity-links/character/{$character->id}", [
            'target_type' => EntityLink::TARGET_ASSET,
            'target_id' => $asset->id,
            'relation_type' => EntityLink::RELATION_USES,
            'label' => 'Updated Portrait',
            'metadata' => ['role' => 'portrait'],
        ])
            ->assertStatus(201)
            ->assertJsonPath('id', $portrait['id'])
            ->assertJsonPath('label', 'Updated Portrait')
            ->assertJsonPath('metadata.role', 'portrait')
            ->json();

        $this->assertNotSame($portrait['id'], $token['id']);
        $this->assertSame($portrait['id'], $duplicatePortrait['id']);
        $this->assertDatabaseCount('entity_links', 2);

        $this->patchJson('/api/entity-links/' . $token['id'], [
            'metadata' => ['role' => 'portrait'],
        ])
            ->assertStatus(200)
            ->assertJsonPath('metadata.role', 'portrait');
    }

    public function test_asset_link_metadata_rejects_invalid_role_and_non_asset_role(): void
    {
        $user = User::factory()->create();
        $character = $this->createCharacter($user);
        $asset = $this->createAsset($user);
        $faction = $this->createFaction($user);
        Sanctum::actingAs($user);

        $this->postJson("/api/entity-links/character/{$character->id}", [
            'target_type' => EntityLink::TARGET_ASSET,
            'target_id' => $asset->id,
            'metadata' => ['role' => 'invalid_role'],
        ])->assertStatus(422);

        $this->postJson("/api/entity-links/character/{$character->id}", [
            'target_type' => EntityLink::TARGET_FACTION,
            'target_id' => $faction->id,
            'metadata' => ['role' => 'portrait'],
        ])->assertStatus(422);
    }

    public function test_foreign_source_target_and_link_return_404(): void
    {
        $user = User::factory()->create();
        $foreign = User::factory()->create();
        $ownCharacter = $this->createCharacter($user);
        $foreignCharacter = $this->createCharacter($foreign);
        $ownFaction = $this->createFaction($user);
        $foreignFaction = $this->createFaction($foreign);

        $foreignLink = EntityLink::create([
            'source_type' => EntityLink::TARGET_CHARACTER,
            'source_id' => $foreignCharacter->id,
            'target_type' => EntityLink::TARGET_FACTION,
            'target_id' => $foreignFaction->id,
            'relation_type' => EntityLink::RELATION_RELATED,
            'metadata' => [],
        ]);

        Sanctum::actingAs($user);

        $this->getJson("/api/entity-links/character/{$foreignCharacter->id}")
            ->assertStatus(404);

        $this->postJson("/api/entity-links/character/{$ownCharacter->id}", [
            'target_type' => EntityLink::TARGET_FACTION,
            'target_id' => $foreignFaction->id,
        ])->assertStatus(404);

        $ownLink = $this->postJson("/api/entity-links/character/{$ownCharacter->id}", [
            'target_type' => EntityLink::TARGET_FACTION,
            'target_id' => $ownFaction->id,
        ])->assertStatus(201)->json();

        $this->patchJson('/api/entity-links/' . $foreignLink->id, ['label' => 'nope'])
            ->assertStatus(404);

        $this->deleteJson('/api/entity-links/' . $foreignLink->id)
            ->assertStatus(404);

        $this->deleteJson('/api/entity-links/' . $ownLink['id'])
            ->assertStatus(200);
    }

    public function test_unsupported_type_is_rejected(): void
    {
        $user = User::factory()->create();
        $scenario = $this->createScenario($user);
        Sanctum::actingAs($user);

        $this->getJson("/api/entity-links/unknown/{$scenario->id}")
            ->assertStatus(422);

        $this->postJson("/api/entity-links/scenario/{$scenario->id}", [
            'target_type' => 'unknown',
            'target_id' => $scenario->id,
        ])->assertStatus(422);
    }

    private function createScenario(User $user): Scenario
    {
        return Scenario::create([
            'user_id' => $user->id,
            'title' => 'Scenario',
            'description' => '',
        ]);
    }

    private function createMap(User $user): Map
    {
        return Map::create([
            'user_id' => $user->id,
            'name' => 'Map',
            'width' => 10,
            'height' => 10,
            'cell_size' => 32,
            'data' => ['objects' => []],
        ]);
    }

    private function createCharacter(User $user): Character
    {
        return Character::create([
            'user_id' => $user->id,
            'name' => 'Character',
            'role' => 'NPC',
            'race' => '',
            'description' => '',
            'level' => 1,
            'stats' => [],
            'inventory' => [],
        ]);
    }

    private function createItem(User $user): Item
    {
        return Item::create([
            'user_id' => $user->id,
            'name' => 'Item',
            'type' => 'Прочее',
            'rarity' => 'Обычный',
            'description' => '',
            'modifiers' => [],
            'weight' => 0,
            'value' => 0,
        ]);
    }

    private function createAsset(User $user): Asset
    {
        return Asset::create([
            'user_id' => $user->id,
            'type' => Asset::TYPE_OTHER,
            'name' => 'Asset',
            'metadata' => [],
        ]);
    }

    private function createLocation(User $user): Location
    {
        return Location::create([
            'user_id' => $user->id,
            'name' => 'Location',
            'metadata' => [],
        ]);
    }

    private function createFaction(User $user): Faction
    {
        return Faction::create([
            'user_id' => $user->id,
            'name' => 'Faction',
            'metadata' => [],
        ]);
    }

    private function createEvent(User $user): WorldEvent
    {
        return WorldEvent::create([
            'user_id' => $user->id,
            'title' => 'Event',
            'metadata' => [],
        ]);
    }
}
