<?php

namespace Tests\Feature;

use App\Models\Campaign;
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

        $campaigns = Campaign::query()->where('user_id', $user->id)->get();
        $maps = Map::query()->where('user_id', $user->id)->get();
        $characters = Character::query()->where('user_id', $user->id)->get();
        $items = Item::query()->where('user_id', $user->id)->get();
        $scenarios = Scenario::query()
            ->with(['nodes', 'transitions'])
            ->where('user_id', $user->id)
            ->get();

        $this->assertCount(1, $campaigns);
        $this->assertSame('Свет над ледяным разломом', $campaigns->first()->title);
        $this->assertCount(1, $maps);
        $this->assertCount(1, $scenarios);
        $this->assertCount(3, $characters);
        $this->assertCount(3, $items);
        $this->assertTrue($characters->every(fn (Character $character): bool => $character->inventory === []));

        $scenario = $scenarios->first();
        $this->assertSame('Последний огонь ледяного маяка', $scenario->title);
        $this->assertMatchesRegularExpression('/\p{Cyrillic}/u', $scenario->description);
        $this->assertSame($campaigns->first()->id, $scenario->campaign_id);

        $this->assertCount(10, $scenario->nodes);
        $this->assertCount(11, $scenario->transitions);

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
        $this->assertSame('Ледяной маяк — нижний ярус', $scenario->nodes->firstWhere('type', 'location')->config['map_hint']);

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

        $nodesById = $scenario->nodes->keyBy('id');
        foreach ($scenario->transitions as $transition) {
            $this->assertLessThan(
                $nodesById[$transition->to_node_id]->order_index,
                $nodesById[$transition->from_node_id]->order_index,
                'Демонстрационный граф должен быть направлен вперед без циклов.'
            );
        }

        $reachableNodeIds = [];
        $queue = [$firstNode->id];
        while ($queue !== []) {
            $nodeId = array_shift($queue);
            if (in_array($nodeId, $reachableNodeIds, true)) {
                continue;
            }

            $reachableNodeIds[] = $nodeId;
            foreach ($scenario->transitions->where('from_node_id', $nodeId) as $transition) {
                $queue[] = $transition->to_node_id;
            }
        }
        $this->assertEqualsCanonicalizing($scenario->nodes->pluck('id')->all(), $reachableNodeIds);

        $endingNodes = $scenario->nodes->filter(
            fn (ScenarioNode $node): bool => ! $scenario->transitions->contains('from_node_id', $node->id)
        );
        $this->assertEqualsCanonicalizing(
            ['Луч над разломом', 'Огонь подо льдом'],
            $endingNodes->pluck('title')->all()
        );
        $this->assertFalse(Schema::hasColumn('characters', 'scenario_id'));
        $this->assertFalse(Schema::hasColumn('maps', 'scenario_id'));

        $map = $maps->first();
        $this->assertSame('Ледяной маяк — нижний ярус', $map->name);
        $this->assertDatabaseHas('entity_links', [
            'source_type' => EntityLink::TARGET_CAMPAIGN,
            'source_id' => $campaigns->first()->id,
            'target_type' => EntityLink::TARGET_MAP,
            'target_id' => $map->id,
            'relation_type' => EntityLink::RELATION_USES,
        ]);
        $this->assertIsArray($map->data['layers']);
        $this->assertCount(3, $map->data['layers']);

        $tileLayer = collect($map->data['layers'])->firstWhere('type', 'tiles');
        $tokenLayer = collect($map->data['layers'])->firstWhere('type', 'tokens');
        $this->assertIsArray($tileLayer);
        $this->assertIsArray($tokenLayer);
        $this->assertCount($map->width * $map->height, $tileLayer['objects']);
        $this->assertCount(4, $tokenLayer['objects']);

        $tileAssetIds = collect($tileLayer['objects'])->pluck('assetId')->unique()->values()->all();
        $this->assertEqualsCanonicalizing([
            'system:tile:core:v1:frozen-stone-floor',
            'system:tile:core:v1:frozen-stone-wall',
            'system:tile:core:v1:ice',
        ], $tileAssetIds);
        $this->assertTrue(
            collect($tileLayer['objects'])->every(
                fn (array $object): bool => $object['sourceType'] === EntityLink::TARGET_ASSET
                    && str_starts_with($object['assetId'], 'system:tile:core:v1:')
            )
        );
        $this->assertEqualsCanonicalizing(
            [EntityLink::TARGET_CHARACTER, EntityLink::TARGET_ITEM],
            collect($tokenLayer['objects'])->pluck('sourceType')->unique()->values()->all()
        );

        $linkedCharacterIds = EntityLink::query()
            ->where('source_type', EntityLink::TARGET_SCENARIO)
            ->where('source_id', $scenario->id)
            ->where('target_type', EntityLink::TARGET_CHARACTER)
            ->where('relation_type', EntityLink::RELATION_USES)
            ->pluck('target_id')
            ->all();

        $this->assertEqualsCanonicalizing(
            $characters->pluck('id')->all(),
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
            $maps->pluck('id')->all(),
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
            $items->pluck('id')->all(),
            $linkedItemIds
        );
    }

    public function test_go_box_content_seeder_is_idempotent_for_graph_data(): void
    {
        $this->seed(GoBoxContentSeeder::class);

        $firstRunCounts = [
            'users' => User::query()->count(),
            'campaigns' => Campaign::query()->count(),
            'scenarios' => Scenario::query()->count(),
            'maps' => Map::query()->count(),
            'characters' => Character::query()->count(),
            'items' => Item::query()->count(),
            'nodes' => ScenarioNode::query()->count(),
            'transitions' => ScenarioTransition::query()->count(),
            'entity_links' => EntityLink::query()->count(),
        ];

        $this->seed(GoBoxContentSeeder::class);

        $this->assertSame($firstRunCounts['users'], User::query()->count());
        $this->assertSame($firstRunCounts['campaigns'], Campaign::query()->count());
        $this->assertSame($firstRunCounts['scenarios'], Scenario::query()->count());
        $this->assertSame($firstRunCounts['maps'], Map::query()->count());
        $this->assertSame($firstRunCounts['characters'], Character::query()->count());
        $this->assertSame($firstRunCounts['items'], Item::query()->count());
        $this->assertSame($firstRunCounts['nodes'], ScenarioNode::query()->count());
        $this->assertSame($firstRunCounts['transitions'], ScenarioTransition::query()->count());
        $this->assertSame($firstRunCounts['entity_links'], EntityLink::query()->count());
    }
}
