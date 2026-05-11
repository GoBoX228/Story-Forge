<?php

namespace Tests\Feature;

use App\Models\AssetCollection;
use App\Models\Character;
use App\Models\CharacterGroup;
use App\Models\Item;
use App\Models\ItemGroup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CharacterItemGroupTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_manage_character_groups_and_assign_characters(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $group = $this->postJson('/api/character-groups', [
            'name' => 'Villains',
            'description' => 'Major opponents',
        ])->assertStatus(201)
            ->assertJsonPath('name', 'Villains')
            ->json();

        $character = $this->postJson('/api/characters', [
            'name' => 'Cold Shaman',
            'role' => 'NPC',
            'group_id' => $group['id'],
        ])->assertStatus(201)
            ->assertJsonPath('character_group_id', $group['id'])
            ->json();

        $this->getJson('/api/characters?groupId=' . $group['id'])
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $character['id']);

        $this->patchJson('/api/character-groups/' . $group['id'], [
            'name' => 'Bosses',
        ])->assertStatus(200)
            ->assertJsonPath('name', 'Bosses');

        $this->deleteJson('/api/character-groups/' . $group['id'])
            ->assertStatus(200);

        $this->assertDatabaseHas('characters', [
            'id' => $character['id'],
            'character_group_id' => null,
        ]);
    }

    public function test_user_can_manage_item_groups_and_assign_items(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $group = $this->postJson('/api/item-groups', [
            'name' => 'Relics',
        ])->assertStatus(201)
            ->assertJsonPath('name', 'Relics')
            ->json();

        $item = $this->postJson('/api/items', [
            'name' => 'Frost Totem',
            'group_id' => $group['id'],
        ])->assertStatus(201)
            ->assertJsonPath('item_group_id', $group['id'])
            ->json();

        $this->getJson('/api/items?groupId=' . $group['id'])
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $item['id']);

        $this->deleteJson('/api/item-groups/' . $group['id'])
            ->assertStatus(200);

        $this->assertDatabaseHas('items', [
            'id' => $item['id'],
            'item_group_id' => null,
        ]);
    }

    public function test_groups_and_asset_collection_assignments_are_owner_scoped(): void
    {
        $owner = User::factory()->create();
        $foreign = User::factory()->create();
        $ownerGroup = CharacterGroup::create([
            'user_id' => $owner->id,
            'name' => 'Owner Group',
            'slug' => 'owner-group',
        ]);
        $foreignGroup = CharacterGroup::create([
            'user_id' => $foreign->id,
            'name' => 'Foreign Group',
            'slug' => 'foreign-group',
        ]);
        $ownerCollection = AssetCollection::create([
            'user_id' => $owner->id,
            'name' => 'Owner Set',
            'slug' => 'owner-set',
        ]);
        $character = Character::create([
            'user_id' => $owner->id,
            'name' => 'Owner Character',
            'role' => 'NPC',
        ]);

        Sanctum::actingAs($owner);

        $this->patchJson('/api/characters/' . $character->id, ['group_id' => $foreignGroup->id])
            ->assertStatus(404);

        $this->putJson("/api/asset-collection-targets/character_group/{$ownerGroup->id}/collections", [
            'collection_ids' => [$ownerCollection->id],
        ])->assertStatus(200)
            ->assertJsonCount(1);

        Sanctum::actingAs($foreign);

        $this->getJson('/api/character-groups/' . $ownerGroup->id)
            ->assertStatus(404);

        $this->putJson("/api/asset-collection-targets/character_group/{$ownerGroup->id}/collections", [
            'collection_ids' => [$ownerCollection->id],
        ])->assertStatus(404);
    }

    public function test_item_group_asset_collection_targets_work(): void
    {
        $user = User::factory()->create();
        $group = ItemGroup::create([
            'user_id' => $user->id,
            'name' => 'Weapons',
            'slug' => 'weapons',
        ]);
        $collection = AssetCollection::create([
            'user_id' => $user->id,
            'name' => 'Weapon Images',
            'slug' => 'weapon-images',
        ]);

        Sanctum::actingAs($user);

        $this->putJson("/api/asset-collection-targets/item_group/{$group->id}/collections", [
            'collection_ids' => [$collection->id],
        ])->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $collection->id);
    }
}
