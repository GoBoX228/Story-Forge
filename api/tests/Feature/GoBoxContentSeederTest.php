<?php

namespace Tests\Feature;

use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\ScenarioTransition;
use App\Models\User;
use Database\Seeders\GoBoxContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoBoxContentSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_go_box_content_seeder_creates_graph_scenario_data(): void
    {
        $this->seed(GoBoxContentSeeder::class);

        $user = User::query()->where('email', 'vilyougiv@gmail.com')->first();
        $this->assertNotNull($user);

        $scenarios = Scenario::query()
            ->with(['nodes', 'transitions'])
            ->where('user_id', $user->id)
            ->get();

        $this->assertCount(4, $scenarios);

        foreach ($scenarios as $scenario) {
            $this->assertGreaterThanOrEqual(4, $scenario->nodes->count());
            $this->assertGreaterThanOrEqual(4, $scenario->transitions->count());

            $firstNode = $scenario->nodes->sortBy('order_index')->first();
            $this->assertInstanceOf(ScenarioNode::class, $firstNode);
            $this->assertIsArray($firstNode->position);
            $this->assertArrayHasKey('x', $firstNode->position);
            $this->assertArrayHasKey('y', $firstNode->position);
            $this->assertIsArray($firstNode->config);
            $this->assertSame(0, $firstNode->order_index);

            $firstTransition = $scenario->transitions->sortBy('order_index')->first();
            $this->assertInstanceOf(ScenarioTransition::class, $firstTransition);
            $this->assertSame($scenario->id, $firstTransition->scenario_id);
            $this->assertTrue($scenario->nodes->contains('id', $firstTransition->from_node_id));
            $this->assertTrue($scenario->nodes->contains('id', $firstTransition->to_node_id));
            $this->assertIsArray($firstTransition->condition);
        }
    }

    public function test_go_box_content_seeder_is_idempotent_for_graph_data(): void
    {
        $this->seed(GoBoxContentSeeder::class);

        $firstRunCounts = [
            'users' => User::query()->count(),
            'scenarios' => Scenario::query()->count(),
            'nodes' => ScenarioNode::query()->count(),
            'transitions' => ScenarioTransition::query()->count(),
        ];

        $this->seed(GoBoxContentSeeder::class);

        $this->assertSame($firstRunCounts['users'], User::query()->count());
        $this->assertSame($firstRunCounts['scenarios'], Scenario::query()->count());
        $this->assertSame($firstRunCounts['nodes'], ScenarioNode::query()->count());
        $this->assertSame($firstRunCounts['transitions'], ScenarioTransition::query()->count());
    }
}
