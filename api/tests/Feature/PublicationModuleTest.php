<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\Map;
use App\Models\PublishedContent;
use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\ScenarioTransition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublicationModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_update_list_show_and_delete_publication(): void
    {
        $user = User::factory()->create();
        $map = $this->createMap($user);
        Sanctum::actingAs($user);

        $publication = $this->postJson("/api/publication-targets/map/{$map->id}", [
            'status' => PublishedContent::STATUS_PUBLISHED,
            'visibility' => PublishedContent::VISIBILITY_PUBLIC,
            'metadata' => ['summary' => 'Public map summary'],
        ])
            ->assertStatus(201)
            ->assertJsonPath('content_type', PublishedContent::TYPE_MAP)
            ->assertJsonPath('content_id', $map->id)
            ->assertJsonPath('status', PublishedContent::STATUS_PUBLISHED)
            ->assertJsonPath('visibility', PublishedContent::VISIBILITY_PUBLIC)
            ->assertJsonPath('metadata.summary', 'Public map summary')
            ->assertJsonPath('target_title', 'Publication Map')
            ->json();

        $this->postJson("/api/publication-targets/map/{$map->id}", [
            'status' => PublishedContent::STATUS_DRAFT,
            'visibility' => PublishedContent::VISIBILITY_PRIVATE,
            'metadata' => ['summary' => 'Updated draft'],
        ])
            ->assertStatus(201)
            ->assertJsonPath('id', $publication['id'])
            ->assertJsonPath('metadata.summary', 'Updated draft');

        $this->assertDatabaseCount('published_contents', 1);

        $this->patchJson('/api/publications/' . $publication['id'], [
            'status' => PublishedContent::STATUS_PUBLISHED,
            'visibility' => PublishedContent::VISIBILITY_PUBLIC,
        ])
            ->assertStatus(200)
            ->assertJsonPath('status', PublishedContent::STATUS_PUBLISHED);

        $this->getJson('/api/publications?scope=public&search=publication')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $publication['id']);

        $this->getJson('/api/publications/' . $publication['slug'])
            ->assertStatus(200)
            ->assertJsonPath('id', $publication['id']);

        $this->deleteJson('/api/publications/' . $publication['id'])
            ->assertStatus(200)
            ->assertJsonPath('message', 'Deleted');

        $this->assertDatabaseMissing('published_contents', ['id' => $publication['id']]);
    }

    public function test_user_cannot_publish_or_modify_foreign_materials(): void
    {
        $owner = User::factory()->create();
        $foreign = User::factory()->create();
        $character = $this->createCharacter($foreign);
        $publication = PublishedContent::create([
            'content_type' => PublishedContent::TYPE_CHARACTER,
            'content_id' => $character->id,
            'user_id' => $foreign->id,
            'status' => PublishedContent::STATUS_DRAFT,
            'visibility' => PublishedContent::VISIBILITY_PRIVATE,
            'slug' => 'foreign-character',
            'metadata' => [],
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/publication-targets/character/{$character->id}", [
            'status' => PublishedContent::STATUS_DRAFT,
        ])->assertStatus(404);

        $this->patchJson('/api/publications/' . $publication->id, [
            'status' => PublishedContent::STATUS_PUBLISHED,
        ])->assertStatus(404);

        $this->deleteJson('/api/publications/' . $publication->id)
            ->assertStatus(404);
    }

    public function test_scenario_publication_is_blocked_by_graph_errors(): void
    {
        $user = User::factory()->create();
        $scenario = $this->createScenario($user);
        Sanctum::actingAs($user);

        $this->postJson("/api/publication-targets/scenario/{$scenario->id}", [
            'status' => PublishedContent::STATUS_PUBLISHED,
            'visibility' => PublishedContent::VISIBILITY_PUBLIC,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('graph');

        $start = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'title' => 'Start',
            'position' => [],
            'config' => [],
            'order_index' => 0,
        ]);
        $final = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'loot',
            'title' => 'Final',
            'position' => [],
            'config' => [],
            'order_index' => 1,
        ]);
        ScenarioTransition::create([
            'scenario_id' => $scenario->id,
            'from_node_id' => $start->id,
            'to_node_id' => $final->id,
            'type' => 'linear',
            'label' => '',
            'condition' => [],
            'metadata' => [],
            'order_index' => 0,
        ]);

        $this->postJson("/api/publication-targets/scenario/{$scenario->id}", [
            'status' => PublishedContent::STATUS_PUBLISHED,
            'visibility' => PublishedContent::VISIBILITY_PUBLIC,
        ])
            ->assertStatus(201)
            ->assertJsonPath('status', PublishedContent::STATUS_PUBLISHED);
    }

    private function createScenario(User $user): Scenario
    {
        return Scenario::create([
            'user_id' => $user->id,
            'title' => 'Publication Scenario',
            'description' => '',
        ]);
    }

    private function createMap(User $user): Map
    {
        return Map::create([
            'user_id' => $user->id,
            'name' => 'Publication Map',
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
            'name' => 'Publication Character',
            'role' => 'NPC',
            'race' => '',
            'description' => '',
            'level' => 1,
            'stats' => [],
            'inventory' => [],
        ]);
    }
}
