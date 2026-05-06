<?php

namespace Tests\Feature;

use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\ScenarioTransition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ScenarioGraphTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_create_update_and_delete_nodes(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create([
            'user_id' => $user->id,
            'title' => 'Graph Scenario',
        ]);

        $first = $this->postJson("/api/scenarios/{$scenario->id}/nodes", [
            'type' => 'description',
            'title' => 'Opening',
            'content' => 'Scene starts here.',
            'position' => ['x' => 120, 'y' => 80],
            'config' => ['scene' => 'intro'],
        ])->assertStatus(201)
            ->assertJsonPath('order_index', 0)
            ->assertJsonPath('position.x', 120)
            ->assertJsonPath('config.scene', 'intro')
            ->json();

        $second = $this->postJson("/api/scenarios/{$scenario->id}/nodes", [
            'type' => 'dialog',
            'title' => 'NPC Talk',
        ])->assertStatus(201)
            ->assertJsonPath('order_index', 1)
            ->json();

        $this->getJson("/api/scenarios/{$scenario->id}/nodes")
            ->assertStatus(200)
            ->assertJsonCount(2)
            ->assertJsonPath('0.id', $first['id'])
            ->assertJsonPath('1.id', $second['id']);

        $this->patchJson('/api/scenario-nodes/' . $first['id'], [
            'title' => 'Updated Opening',
            'order_index' => 7,
        ])->assertStatus(200)
            ->assertJsonPath('title', 'Updated Opening')
            ->assertJsonPath('order_index', 7);

        $this->deleteJson('/api/scenario-nodes/' . $second['id'])
            ->assertStatus(200)
            ->assertExactJson(['message' => 'Deleted']);

        $this->assertDatabaseMissing('scenario_nodes', ['id' => $second['id']]);
    }

    public function test_graph_node_contract_validates_type_specific_config(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create([
            'user_id' => $user->id,
            'title' => 'Typed Graph Scenario',
        ]);

        $validNodes = [
            ['type' => 'description', 'config' => ['scene' => 'intro']],
            ['type' => 'dialog', 'config' => ['speaker' => 'elder']],
            ['type' => 'location', 'config' => ['map_hint' => 'temple_gate']],
            ['type' => 'check', 'config' => ['skill' => 'perception', 'dc' => 12]],
            ['type' => 'loot', 'config' => ['item_hint' => 'rift_shard']],
            ['type' => 'combat', 'config' => ['encounter' => 'medium']],
        ];

        foreach ($validNodes as $index => $payload) {
            $this->postJson("/api/scenarios/{$scenario->id}/nodes", [
                ...$payload,
                'title' => 'Node ' . $index,
            ])->assertStatus(201)
                ->assertJsonPath('type', $payload['type']);
        }

        $this->postJson("/api/scenarios/{$scenario->id}/nodes", [
            'type' => 'unknown',
        ])->assertStatus(422);

        $this->postJson("/api/scenarios/{$scenario->id}/nodes", [
            'type' => 'check',
            'config' => ['skill' => 'perception', 'dc' => 99],
        ])->assertStatus(422);

        $this->postJson("/api/scenarios/{$scenario->id}/nodes", [
            'type' => 'description',
            'config' => ['speaker' => 'wrong-config'],
        ])->assertStatus(422);
    }

    public function test_user_can_list_create_update_and_delete_transitions(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create([
            'user_id' => $user->id,
            'title' => 'Graph Scenario',
        ]);

        $start = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'title' => 'Start',
            'order_index' => 0,
        ]);
        $success = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'check',
            'title' => 'Success',
            'order_index' => 1,
        ]);
        $failure = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'combat',
            'title' => 'Failure',
            'order_index' => 2,
        ]);

        $first = $this->postJson("/api/scenarios/{$scenario->id}/transitions", [
            'from_node_id' => $start->id,
            'to_node_id' => $success->id,
            'type' => 'success',
            'label' => 'Passed',
            'condition' => ['dc' => 12],
            'metadata' => [
                'visual' => [
                    'waypoints' => [
                        ['x' => 180, 'y' => 120],
                        ['x' => 220, 'y' => 160],
                    ],
                ],
            ],
        ])->assertStatus(201)
            ->assertJsonPath('order_index', 0)
            ->assertJsonPath('condition.dc', 12)
            ->assertJsonPath('condition.outcome', 'success')
            ->assertJsonPath('metadata.visual.waypoints.0.x', 180)
            ->assertJsonPath('metadata.visual.waypoints.1.y', 160)
            ->json();

        $second = $this->postJson("/api/scenarios/{$scenario->id}/transitions", [
            'from_node_id' => $start->id,
            'to_node_id' => $failure->id,
            'type' => 'failure',
        ])->assertStatus(201)
            ->assertJsonPath('order_index', 1)
            ->json();

        $this->getJson("/api/scenarios/{$scenario->id}/transitions")
            ->assertStatus(200)
            ->assertJsonCount(2)
            ->assertJsonPath('0.id', $first['id'])
            ->assertJsonPath('1.id', $second['id']);

        $this->patchJson('/api/scenario-transitions/' . $first['id'], [
            'label' => 'Passed check',
            'condition' => ['dc' => 14],
            'metadata' => [
                'visual' => [
                    'waypoints' => [
                        ['x' => 300, 'y' => 280],
                    ],
                ],
            ],
            'order_index' => 4,
        ])->assertStatus(200)
            ->assertJsonPath('label', 'Passed check')
            ->assertJsonPath('condition.dc', 14)
            ->assertJsonPath('condition.outcome', 'success')
            ->assertJsonPath('metadata.visual.waypoints.0.x', 300)
            ->assertJsonPath('order_index', 4);

        $this->deleteJson('/api/scenario-transitions/' . $second['id'])
            ->assertStatus(200)
            ->assertExactJson(['message' => 'Deleted']);

        $this->assertDatabaseMissing('scenario_transitions', ['id' => $second['id']]);
    }

    public function test_graph_transition_contract_validates_types_conditions_and_outcomes(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create([
            'user_id' => $user->id,
            'title' => 'Typed Transition Scenario',
        ]);

        $from = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'check',
            'order_index' => 0,
        ]);
        $to = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'order_index' => 1,
        ]);

        foreach (['linear', 'choice', 'success', 'failure'] as $type) {
            $condition = in_array($type, ['success', 'failure'], true)
                ? ['dc' => 10, 'outcome' => $type]
                : [];

            $this->postJson("/api/scenarios/{$scenario->id}/transitions", [
                'from_node_id' => $from->id,
                'to_node_id' => $to->id,
                'type' => $type,
                'condition' => $condition,
            ])->assertStatus(201)
                ->assertJsonPath('type', $type);
        }

        $this->postJson("/api/scenarios/{$scenario->id}/transitions", [
            'from_node_id' => $from->id,
            'to_node_id' => $to->id,
            'type' => 'teleport',
        ])->assertStatus(422);

        $this->postJson("/api/scenarios/{$scenario->id}/transitions", [
            'from_node_id' => $from->id,
            'to_node_id' => $to->id,
            'type' => 'success',
            'condition' => ['dc' => 10, 'outcome' => 'failure'],
        ])->assertStatus(422);

        $this->postJson("/api/scenarios/{$scenario->id}/transitions", [
            'from_node_id' => $from->id,
            'to_node_id' => $to->id,
            'type' => 'failure',
            'condition' => ['dc' => 99, 'outcome' => 'failure'],
        ])->assertStatus(422);

        $this->postJson("/api/scenarios/{$scenario->id}/transitions", [
            'from_node_id' => $from->id,
            'to_node_id' => $to->id,
            'type' => 'linear',
            'condition' => ['_visual' => ['waypoints' => []]],
        ])->assertStatus(422);
    }

    public function test_graph_transition_metadata_validates_visual_waypoints(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create([
            'user_id' => $user->id,
            'title' => 'Transition Metadata Scenario',
        ]);
        $from = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'order_index' => 0,
        ]);
        $to = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'order_index' => 1,
        ]);

        $created = $this->postJson("/api/scenarios/{$scenario->id}/transitions", [
            'from_node_id' => $from->id,
            'to_node_id' => $to->id,
        ])->assertStatus(201)
            ->json();

        $this->assertSame([], $created['metadata']);

        $transition = $this->postJson("/api/scenarios/{$scenario->id}/transitions", [
            'from_node_id' => $from->id,
            'to_node_id' => $to->id,
            'metadata' => [
                'visual' => [
                    'waypoints' => [
                        ['x' => 10, 'y' => 20],
                    ],
                ],
            ],
        ])->assertStatus(201)
            ->assertJsonPath('metadata.visual.waypoints.0.x', 10)
            ->assertJsonPath('metadata.visual.waypoints.0.y', 20)
            ->json();

        $this->patchJson('/api/scenario-transitions/' . $transition['id'], [
            'metadata' => [
                'visual' => [
                    'waypoints' => [
                        ['x' => 30.5, 'y' => 40.25],
                    ],
                ],
            ],
        ])->assertStatus(200)
            ->assertJsonPath('metadata.visual.waypoints.0.x', 30.5)
            ->assertJsonPath('metadata.visual.waypoints.0.y', 40.25);

        $this->postJson("/api/scenarios/{$scenario->id}/transitions", [
            'from_node_id' => $from->id,
            'to_node_id' => $to->id,
            'metadata' => ['visual' => ['waypoints' => [['x' => 10]]]],
        ])->assertStatus(422);

        $this->postJson("/api/scenarios/{$scenario->id}/transitions", [
            'from_node_id' => $from->id,
            'to_node_id' => $to->id,
            'metadata' => ['visual' => ['route' => []]],
        ])->assertStatus(422);
    }

    public function test_transition_creation_rejects_nodes_from_another_scenario(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create(['user_id' => $user->id, 'title' => 'Scenario A']);
        $otherScenario = Scenario::create(['user_id' => $user->id, 'title' => 'Scenario B']);

        $node = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'order_index' => 0,
        ]);
        $foreignNode = ScenarioNode::create([
            'scenario_id' => $otherScenario->id,
            'type' => 'loot',
            'order_index' => 0,
        ]);

        $this->postJson("/api/scenarios/{$scenario->id}/transitions", [
            'from_node_id' => $node->id,
            'to_node_id' => $foreignNode->id,
        ])->assertStatus(404);
    }

    public function test_foreign_user_receives_404_for_graph_endpoints(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $scenario = Scenario::create(['user_id' => $owner->id, 'title' => 'Owner Scenario']);
        $first = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'order_index' => 0,
        ]);
        $second = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'dialog',
            'order_index' => 1,
        ]);
        $transition = ScenarioTransition::create([
            'scenario_id' => $scenario->id,
            'from_node_id' => $first->id,
            'to_node_id' => $second->id,
            'type' => 'linear',
            'order_index' => 0,
        ]);

        Sanctum::actingAs($intruder);

        $this->getJson("/api/scenarios/{$scenario->id}/nodes")->assertStatus(404);
        $this->postJson("/api/scenarios/{$scenario->id}/nodes", ['type' => 'description'])->assertStatus(404);
        $this->patchJson("/api/scenario-nodes/{$first->id}", ['title' => 'x'])->assertStatus(404);
        $this->deleteJson("/api/scenario-nodes/{$first->id}")->assertStatus(404);

        $this->getJson("/api/scenarios/{$scenario->id}/transitions")->assertStatus(404);
        $this->postJson("/api/scenarios/{$scenario->id}/transitions", [
            'from_node_id' => $first->id,
            'to_node_id' => $second->id,
        ])->assertStatus(404);
        $this->patchJson("/api/scenario-transitions/{$transition->id}", ['label' => 'x'])->assertStatus(404);
        $this->deleteJson("/api/scenario-transitions/{$transition->id}")->assertStatus(404);
    }

    public function test_deleting_scenario_cascades_graph_records(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create(['user_id' => $user->id, 'title' => 'Scenario']);
        $first = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'order_index' => 0,
        ]);
        $second = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'dialog',
            'order_index' => 1,
        ]);
        $transition = ScenarioTransition::create([
            'scenario_id' => $scenario->id,
            'from_node_id' => $first->id,
            'to_node_id' => $second->id,
            'type' => 'linear',
            'order_index' => 0,
        ]);

        $this->deleteJson("/api/scenarios/{$scenario->id}")->assertStatus(200);

        $this->assertDatabaseMissing('scenario_nodes', ['id' => $first->id]);
        $this->assertDatabaseMissing('scenario_nodes', ['id' => $second->id]);
        $this->assertDatabaseMissing('scenario_transitions', ['id' => $transition->id]);
    }

    public function test_existing_scenario_show_excludes_graph_and_legacy_payloads(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $scenario = Scenario::create(['user_id' => $user->id, 'title' => 'Scenario']);
        ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'description',
            'order_index' => 0,
        ]);

        $payload = $this->getJson("/api/scenarios/{$scenario->id}")
            ->assertStatus(200)
            ->assertJsonMissingPath('chapters')
            ->json();

        $this->assertArrayNotHasKey('nodes', $payload);
        $this->assertArrayNotHasKey('transitions', $payload);
    }
}
