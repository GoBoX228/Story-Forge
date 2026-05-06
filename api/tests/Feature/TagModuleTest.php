<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Character;
use App\Models\Faction;
use App\Models\Item;
use App\Models\Location;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\Tag;
use App\Models\User;
use App\Models\WorldEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TagModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_list_update_and_delete_own_tags(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $tag = $this->postJson('/api/tags', ['name' => 'Лор'])
            ->assertStatus(201)
            ->assertJsonPath('name', 'Лор')
            ->json();

        $duplicate = $this->postJson('/api/tags', ['name' => 'Лор'])
            ->assertStatus(201)
            ->assertJsonPath('id', $tag['id'])
            ->json();

        $this->assertSame($tag['id'], $duplicate['id']);

        $this->getJson('/api/tags')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $tag['id']);

        $this->patchJson('/api/tags/' . $tag['id'], ['name' => 'Сюжет'])
            ->assertStatus(200)
            ->assertJsonPath('name', 'Сюжет');

        $this->deleteJson('/api/tags/' . $tag['id'])
            ->assertStatus(200)
            ->assertJsonPath('message', 'Deleted');

        $this->assertDatabaseMissing('tags', ['id' => $tag['id']]);
    }

    public function test_user_can_assign_and_replace_tags_for_supported_targets(): void
    {
        $user = User::factory()->create();
        $targets = $this->createTargets($user);
        Sanctum::actingAs($user);

        $tagId = $this->postJson('/api/tags', ['name' => 'Combat'])
            ->assertStatus(201)
            ->json('id');

        foreach ($targets as $type => $targetId) {
            $this->putJson("/api/tag-targets/{$type}/{$targetId}/tags", [
                'tag_ids' => [$tagId],
                'new_tags' => ['Important'],
            ])->assertStatus(200)
                ->assertJsonCount(2);

            $this->getJson("/api/tag-targets/{$type}/{$targetId}/tags")
                ->assertStatus(200)
                ->assertJsonCount(2);

            $this->putJson("/api/tag-targets/{$type}/{$targetId}/tags", [
                'tag_ids' => [$tagId],
                'new_tags' => [],
            ])->assertStatus(200)
                ->assertJsonCount(1)
                ->assertJsonPath('0.id', $tagId);
        }
    }

    public function test_tag_assignment_rejects_foreign_targets_and_tags(): void
    {
        $user = User::factory()->create();
        $foreign = User::factory()->create();
        $ownScenario = Scenario::create([
            'user_id' => $user->id,
            'title' => 'Own',
            'description' => '',
        ]);
        $foreignScenario = Scenario::create([
            'user_id' => $foreign->id,
            'title' => 'Foreign',
            'description' => '',
        ]);
        $foreignTag = Tag::create([
            'user_id' => $foreign->id,
            'name' => 'Foreign',
            'slug' => 'foreign',
        ]);

        Sanctum::actingAs($user);

        $this->putJson('/api/tag-targets/scenario/' . $foreignScenario->id . '/tags', [
            'new_tags' => ['Fail'],
        ])->assertStatus(404);

        $this->putJson('/api/tag-targets/scenario/' . $ownScenario->id . '/tags', [
            'tag_ids' => [$foreignTag->id],
        ])->assertStatus(404);
    }

    public function test_deleting_tag_removes_assignments_and_unknown_type_is_rejected(): void
    {
        $user = User::factory()->create();
        $scenario = Scenario::create([
            'user_id' => $user->id,
            'title' => 'Scenario',
            'description' => '',
        ]);
        Sanctum::actingAs($user);

        $tagId = $this->postJson('/api/tags', ['name' => 'Temporary'])
            ->assertStatus(201)
            ->json('id');

        $this->putJson('/api/tag-targets/scenario/' . $scenario->id . '/tags', [
            'tag_ids' => [$tagId],
        ])->assertStatus(200);

        $this->assertDatabaseHas('taggables', [
            'tag_id' => $tagId,
            'taggable_type' => 'scenario',
            'taggable_id' => $scenario->id,
        ]);

        $this->deleteJson('/api/tags/' . $tagId)->assertStatus(200);

        $this->assertDatabaseMissing('taggables', [
            'tag_id' => $tagId,
            'taggable_type' => 'scenario',
            'taggable_id' => $scenario->id,
        ]);

        $this->getJson('/api/tag-targets/unknown/' . $scenario->id . '/tags')
            ->assertStatus(422);
    }

    /**
     * @return array<string, int>
     */
    private function createTargets(User $user): array
    {
        $scenario = Scenario::create([
            'user_id' => $user->id,
            'title' => 'Scenario',
            'description' => '',
        ]);
        $map = Map::create([
            'user_id' => $user->id,
            'name' => 'Map',
            'width' => 10,
            'height' => 10,
            'cell_size' => 32,
            'data' => ['objects' => []],
        ]);
        $character = Character::create([
            'user_id' => $user->id,
            'name' => 'Character',
            'role' => 'NPC',
            'race' => '',
            'description' => '',
            'level' => 1,
            'stats' => [],
            'inventory' => [],
        ]);
        $item = Item::create([
            'user_id' => $user->id,
            'name' => 'Item',
            'type' => 'Прочее',
            'rarity' => 'Обычный',
            'description' => '',
            'modifiers' => [],
            'weight' => 0,
            'value' => 0,
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

        return [
            'scenario' => $scenario->id,
            'map' => $map->id,
            'character' => $character->id,
            'item' => $item->id,
            'asset' => $asset->id,
            'location' => $location->id,
            'faction' => $faction->id,
            'event' => $event->id,
        ];
    }
}
