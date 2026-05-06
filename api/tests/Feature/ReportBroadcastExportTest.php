<?php

namespace Tests\Feature;

use App\Domain\Export\Actions\GenerateScenarioPdfAction;
use App\Models\AdminAuditLog;
use App\Models\Announcement;
use App\Models\Asset;
use App\Models\Character;
use App\Models\EntityLink;
use App\Models\Faction;
use App\Models\Item;
use App\Models\Location;
use App\Models\Map;
use App\Models\Report;
use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\ScenarioTransition;
use App\Models\User;
use App\Models\WorldEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\TestCase;

class ReportBroadcastExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_create_duplicate_self_and_missing_target_contracts(): void
    {
        $reporter = User::factory()->create();
        $targetUser = User::factory()->create();
        Sanctum::actingAs($reporter);

        $created = $this->postJson('/api/reports', [
            'target_type' => 'user',
            'target_id' => $targetUser->id,
            'reason' => 'SPAM',
            'description' => 'Spam report',
        ]);

        $created->assertStatus(201)
            ->assertJsonPath('reporter_id', $reporter->id)
            ->assertJsonPath('target_type', 'user')
            ->assertJsonPath('target_id', $targetUser->id)
            ->assertJsonPath('reason', 'spam')
            ->assertJsonPath('status', Report::STATUS_OPEN);

        $reportId = $created->json('id');
        $this->assertNotNull($reportId);

        $duplicate = $this->postJson('/api/reports', [
            'target_type' => 'user',
            'target_id' => $targetUser->id,
            'reason' => 'Spam',
            'description' => 'Spam report duplicate',
        ]);

        $duplicate->assertStatus(200)
            ->assertJsonPath('id', $reportId)
            ->assertJsonPath('reason', 'spam');

        $this->postJson('/api/reports', [
            'target_type' => 'user',
            'target_id' => $reporter->id,
            'reason' => 'abuse',
        ])->assertStatus(422)
            ->assertExactJson(['message' => 'You cannot report yourself']);

        $this->postJson('/api/reports', [
            'target_type' => 'scenario',
            'target_id' => 999999,
            'reason' => 'abuse',
        ])->assertStatus(404)
            ->assertExactJson(['message' => 'Target not found']);

        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $reporter->id,
            'action' => 'REPORT_CREATED',
            'details' => sprintf('Report #%d created', $reportId),
        ]);

        $this->assertSame(1, AdminAuditLog::query()->where('action', 'REPORT_CREATED')->count());
    }

    public function test_broadcast_list_keeps_limit_sorting_and_author_fallback(): void
    {
        $viewer = User::factory()->create();
        $author = User::factory()->create(['name' => 'Broadcaster']);
        Sanctum::actingAs($viewer);

        $base = now()->startOfDay();
        for ($i = 1; $i <= 52; $i++) {
            DB::table('announcements')->insert([
                'user_id' => $i % 2 === 0 ? null : $author->id,
                'type' => 'info',
                'message' => 'msg-' . $i,
                'created_at' => $base->copy()->addSeconds($i),
                'updated_at' => $base->copy()->addSeconds($i),
            ]);
        }

        $response = $this->getJson('/api/broadcasts');

        $response->assertStatus(200)
            ->assertJsonCount(50)
            ->assertJsonPath('0.message', 'msg-52')
            ->assertJsonPath('0.author', 'system')
            ->assertJsonPath('1.message', 'msg-51')
            ->assertJsonPath('1.author', 'Broadcaster')
            ->assertJsonPath('49.message', 'msg-3');
    }

    public function test_export_pdf_contract_and_owner_boundary(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $scenario = Scenario::create([
            'user_id' => $owner->id,
            'title' => 'Export Scenario',
            'description' => 'Description',
        ]);

        Map::create([
            'user_id' => $owner->id,
            'scenario_id' => $scenario->id,
            'name' => 'Map One',
            'width' => 10,
            'height' => 10,
            'cell_size' => 32,
            'data' => ['objects' => []],
        ]);

        $capturedHtml = null;
        $this->mock(GenerateScenarioPdfAction::class, function (MockInterface $mock) use (&$capturedHtml): void {
            $mock->shouldReceive('execute')
                ->once()
                ->with(\Mockery::on(function (string $html) use (&$capturedHtml): bool {
                    $capturedHtml = $html;

                    return str_contains($html, 'Export Scenario')
                        && str_contains($html, 'Graph Scenario')
                        && str_contains($html, 'Description');
                }))
                ->andReturn('%PDF-mock%');
        });

        $response = $this->post('/api/scenarios/' . $scenario->id . '/export/pdf');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/pdf');

        $contentDisposition = (string) $response->headers->get('Content-Disposition');
        $this->assertStringStartsWith(
            'attachment; filename="scenario_' . $scenario->id . '_',
            $contentDisposition
        );
        $this->assertStringEndsWith('.pdf"', $contentDisposition);
        $this->assertSame('%PDF-mock%', $response->getContent());
        $this->assertNotNull($capturedHtml);

        $foreignUser = User::factory()->create();
        Sanctum::actingAs($foreignUser);
        $this->post('/api/scenarios/' . $scenario->id . '/export/pdf')->assertStatus(404);
    }

    public function test_export_pdf_renders_graph_scenario_content(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $scenario = Scenario::create([
            'user_id' => $owner->id,
            'title' => 'Graph Export Scenario',
            'description' => 'Graph description',
        ]);

        $startNode = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'dialog',
            'title' => 'Clan Moot',
            'content' => 'Speak with the clans.',
            'position' => ['x' => 100, 'y' => 120],
            'config' => ['speaker' => 'Clan chief'],
            'order_index' => 0,
        ]);

        $checkNode = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'check',
            'title' => 'Win the Clans',
            'content' => 'Resolve the dispute.',
            'position' => ['x' => 420, 'y' => 120],
            'config' => ['skill' => 'Persuasion', 'dc' => 14],
            'order_index' => 1,
        ]);

        $successNode = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'location',
            'title' => 'White Storm Temple',
            'content' => 'The path opens.',
            'position' => ['x' => 740, 'y' => 80],
            'config' => ['map_hint' => 'Frozen shrine'],
            'order_index' => 2,
        ]);

        $failureNode = ScenarioNode::create([
            'scenario_id' => $scenario->id,
            'type' => 'combat',
            'title' => 'Cold Shaman',
            'content' => 'The shaman attacks.',
            'position' => ['x' => 740, 'y' => 260],
            'config' => ['encounter' => 'Cultists and shaman'],
            'order_index' => 3,
        ]);

        ScenarioTransition::create([
            'scenario_id' => $scenario->id,
            'from_node_id' => $startNode->id,
            'to_node_id' => $checkNode->id,
            'type' => 'linear',
            'label' => 'Speak for the party',
            'condition' => [],
            'metadata' => [],
            'order_index' => 0,
        ]);

        ScenarioTransition::create([
            'scenario_id' => $scenario->id,
            'from_node_id' => $checkNode->id,
            'to_node_id' => $successNode->id,
            'type' => 'success',
            'label' => 'Clans agree',
            'condition' => ['outcome' => 'success', 'dc' => 14],
            'metadata' => [],
            'order_index' => 0,
        ]);

        ScenarioTransition::create([
            'scenario_id' => $scenario->id,
            'from_node_id' => $checkNode->id,
            'to_node_id' => $failureNode->id,
            'type' => 'failure',
            'label' => 'Rivals withdraw',
            'condition' => ['outcome' => 'failure', 'dc' => 14],
            'metadata' => [],
            'order_index' => 1,
        ]);

        $map = Map::create([
            'user_id' => $owner->id,
            'scenario_id' => $scenario->id,
            'name' => 'Temple Map',
            'width' => 8,
            'height' => 8,
            'cell_size' => 32,
            'data' => ['objects' => []],
        ]);

        $character = Character::create([
            'user_id' => $owner->id,
            'scenario_id' => $scenario->id,
            'name' => 'Torstein',
            'role' => 'ally',
            'race' => 'human',
            'description' => 'Clan guide',
            'level' => 2,
            'stats' => [],
            'inventory' => [],
        ]);

        $item = Item::create([
            'user_id' => $owner->id,
            'name' => 'Storm Totem',
            'type' => 'artifact',
            'rarity' => 'rare',
            'description' => 'A carved totem.',
            'modifiers' => [],
            'weight' => 1,
            'value' => 100,
        ]);
        $asset = Asset::create([
            'user_id' => $owner->id,
            'type' => Asset::TYPE_DOCUMENT,
            'name' => 'Ritual Notes',
            'mime_type' => 'application/pdf',
            'metadata' => [],
        ]);
        $location = Location::create([
            'user_id' => $owner->id,
            'name' => 'Frozen Gate',
            'description' => 'The gate below the temple.',
            'metadata' => [],
        ]);
        $faction = Faction::create([
            'user_id' => $owner->id,
            'name' => 'Storm Cult',
            'description' => 'Cult faction.',
            'metadata' => [],
        ]);
        $event = WorldEvent::create([
            'user_id' => $owner->id,
            'title' => 'Blizzard Rite',
            'description' => 'The ritual starts.',
            'metadata' => [],
        ]);

        foreach ([
            [$map, EntityLink::TARGET_MAP],
            [$character, EntityLink::TARGET_CHARACTER],
            [$item, EntityLink::TARGET_ITEM],
            [$asset, EntityLink::TARGET_ASSET],
            [$location, EntityLink::TARGET_LOCATION],
            [$faction, EntityLink::TARGET_FACTION],
            [$event, EntityLink::TARGET_EVENT],
        ] as [$target, $targetType]) {
            EntityLink::create([
                'source_type' => EntityLink::SOURCE_SCENARIO_NODE,
                'source_id' => $successNode->id,
                'target_type' => $targetType,
                'target_id' => $target->id,
                'relation_type' => EntityLink::RELATION_RELATED,
                'label' => 'Reference',
                'metadata' => [],
            ]);
        }

        $capturedHtml = null;
        $this->mock(GenerateScenarioPdfAction::class, function (MockInterface $mock) use (&$capturedHtml): void {
            $mock->shouldReceive('execute')
                ->once()
                ->with(\Mockery::on(function (string $html) use (&$capturedHtml): bool {
                    $capturedHtml = $html;

                    return str_contains($html, 'Graph Scenario')
                        && str_contains($html, 'Clan Moot')
                        && str_contains($html, 'Persuasion')
                        && str_contains($html, 'Clans agree')
                        && str_contains($html, 'Temple Map')
                        && str_contains($html, 'Torstein')
                        && str_contains($html, 'Storm Totem')
                        && str_contains($html, 'Ritual Notes')
                        && str_contains($html, 'Frozen Gate')
                        && str_contains($html, 'Storm Cult')
                        && str_contains($html, 'Blizzard Rite');
                }))
                ->andReturn('%PDF-graph-mock%');
        });

        $response = $this->post('/api/scenarios/' . $scenario->id . '/export/pdf');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/pdf');
        $this->assertSame('%PDF-graph-mock%', $response->getContent());
        $this->assertNotNull($capturedHtml);
    }
}
