<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\EntityLink;
use App\Models\Item;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\ScenarioTransition;
use App\Models\User;
use Database\Seeders\GoBoxContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
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

        $this->assertCount(1, $scenarios);

        $scenario = $scenarios->first();
        $this->assertSame('Петля ледяного маяка', $scenario->title);
        $this->assertMatchesRegularExpression('/\p{Cyrillic}/u', $scenario->description);

        $this->assertGreaterThanOrEqual(8, $scenario->nodes->count());
        $this->assertGreaterThanOrEqual(12, $scenario->transitions->count());

        $this->assertEqualsCanonicalizing(
            ['check', 'combat', 'description', 'dialog', 'location', 'loot'],
            $scenario->nodes->pluck('type')->unique()->sort()->values()->all()
        );

        $this->assertEqualsCanonicalizing(
            ['choice', 'failure', 'linear', 'success'],
            $scenario->transitions->pluck('type')->unique()->sort()->values()->all()
        );

        $firstNode = $scenario->nodes->sortBy('order_index')->first();
        $this->assertInstanceOf(ScenarioNode::class, $firstNode);
        $this->assertIsArray($firstNode->position);
        $this->assertArrayHasKey('x', $firstNode->position);
        $this->assertArrayHasKey('y', $firstNode->position);
        $this->assertArrayHasKey('width', $firstNode->position);
        $this->assertArrayHasKey('height', $firstNode->position);
        $this->assertIsArray($firstNode->config);
        $this->assertSame(0, $firstNode->order_index);
        $this->assertMatchesRegularExpression('/\p{Cyrillic}/u', $firstNode->title);

        $checkNode = $scenario->nodes->firstWhere('type', 'check');
        $this->assertInstanceOf(ScenarioNode::class, $checkNode);
        $this->assertSame(14, $checkNode->config['dc']);

        $firstTransition = $scenario->transitions->sortBy('order_index')->first();
        $this->assertInstanceOf(ScenarioTransition::class, $firstTransition);
        $this->assertSame($scenario->id, $firstTransition->scenario_id);
        $this->assertTrue($scenario->nodes->contains('id', $firstTransition->from_node_id));
        $this->assertTrue($scenario->nodes->contains('id', $firstTransition->to_node_id));
        $this->assertIsArray($firstTransition->condition);
        $this->assertIsArray($firstTransition->metadata);

        $successTransition = $scenario->transitions->firstWhere('type', 'success');
        $failureTransition = $scenario->transitions->firstWhere('type', 'failure');
        $this->assertEquals(['outcome' => 'success', 'dc' => 14], $successTransition->condition);
        $this->assertEquals(['outcome' => 'failure', 'dc' => 14], $failureTransition->condition);

        $combatNode = $scenario->nodes->firstWhere('title', 'Засада культистов');
        $this->assertInstanceOf(ScenarioNode::class, $combatNode);
        $reverseTransition = $scenario->transitions
            ->where('from_node_id', $combatNode->id)
            ->where('to_node_id', $checkNode->id)
            ->first();

        $this->assertInstanceOf(ScenarioTransition::class, $reverseTransition);
        $this->assertSame('Отступить к рунам', $reverseTransition->label);
        $this->assertFalse(Schema::hasColumn('characters', 'scenario_id'));
        $this->assertFalse(Schema::hasColumn('maps', 'scenario_id'));

        $linkedCharacterIds = EntityLink::query()
            ->where('source_type', EntityLink::TARGET_SCENARIO)
            ->where('source_id', $scenario->id)
            ->where('target_type', EntityLink::TARGET_CHARACTER)
            ->where('relation_type', EntityLink::RELATION_USES)
            ->pluck('target_id')
            ->all();

        $this->assertEqualsCanonicalizing(
            Character::query()->where('user_id', $user->id)->pluck('id')->all(),
            $linkedCharacterIds
        );

        $linkedMapIds = EntityLink::query()
            ->where('source_type', EntityLink::TARGET_SCENARIO)
            ->where('source_id', $scenario->id)
            ->where('target_type', EntityLink::TARGET_MAP)
            ->where('relation_type', EntityLink::RELATION_USES)
            ->pluck('target_id')
            ->all();

        $this->assertEqualsCanonicalizing(
            Map::query()->where('user_id', $user->id)->pluck('id')->all(),
            $linkedMapIds
        );

        $linkedItemIds = EntityLink::query()
            ->where('source_type', EntityLink::TARGET_SCENARIO)
            ->where('source_id', $scenario->id)
            ->where('target_type', EntityLink::TARGET_ITEM)
            ->where('relation_type', EntityLink::RELATION_USES)
            ->pluck('target_id')
            ->all();

        $this->assertEqualsCanonicalizing(
            Item::query()->where('user_id', $user->id)->pluck('id')->all(),
            $linkedItemIds
        );
    }

    public function test_go_box_content_seeder_is_idempotent_for_graph_data(): void
    {
        $this->seed(GoBoxContentSeeder::class);

        $firstRunCounts = [
            'users' => User::query()->count(),
            'scenarios' => Scenario::query()->count(),
            'nodes' => ScenarioNode::query()->count(),
            'transitions' => ScenarioTransition::query()->count(),
            'entity_links' => EntityLink::query()->count(),
        ];

        $this->seed(GoBoxContentSeeder::class);

        $this->assertSame($firstRunCounts['users'], User::query()->count());
        $this->assertSame($firstRunCounts['scenarios'], Scenario::query()->count());
        $this->assertSame($firstRunCounts['nodes'], ScenarioNode::query()->count());
        $this->assertSame($firstRunCounts['transitions'], ScenarioTransition::query()->count());
        $this->assertSame($firstRunCounts['entity_links'], EntityLink::query()->count());
    }
}
