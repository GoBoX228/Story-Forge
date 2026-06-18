<?php

namespace Tests\Feature;

use App\Domain\Export\Actions\GenerateCharacterCardsPdfAction;
use App\Domain\Export\Actions\GenerateItemCardsPdfAction;
use App\Domain\Export\Actions\GenerateMapPdfAction;
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

    public function test_reports_are_rate_limited(): void
    {
        $reporter = User::factory()->create();
        $targetUser = User::factory()->create();
        Sanctum::actingAs($reporter);

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $expectedStatus = $attempt === 0 ? 201 : 200;

            $this->postJson('/api/reports', [
                'target_type' => 'user',
                'target_id' => $targetUser->id,
                'reason' => 'spam',
                'description' => "Repeated report {$attempt}",
            ])->assertStatus($expectedStatus);
        }

        $this->postJson('/api/reports', [
            'target_type' => 'user',
            'target_id' => $targetUser->id,
            'reason' => 'spam',
        ])->assertStatus(429);
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

    public function test_export_pdf_is_rate_limited(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $scenario = Scenario::create([
            'user_id' => $owner->id,
            'title' => 'Export Rate Scenario',
        ]);

        $this->mock(GenerateScenarioPdfAction::class, function (MockInterface $mock): void {
            $mock->shouldReceive('execute')
                ->times(10)
                ->andReturn('%PDF-mock%');
        });

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->post('/api/scenarios/' . $scenario->id . '/export/pdf')
                ->assertStatus(200)
                ->assertHeader('Content-Type', 'application/pdf');
        }

        $this->post('/api/scenarios/' . $scenario->id . '/export/pdf')
            ->assertStatus(429);
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
            'name' => 'Temple Map',
            'width' => 8,
            'height' => 8,
            'cell_size' => 32,
            'data' => ['objects' => []],
        ]);

        $character = Character::create([
            'user_id' => $owner->id,
            'name' => 'Torstein',
            'role' => 'ally',
            'race' => 'human',
            'description' => 'Clan guide',
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
        $this->assertStringContainsString('Карта графа', $capturedHtml);
        $this->assertStringContainsString('<svg', $capturedHtml);
        $this->assertStringContainsString('#4361ee', $capturedHtml);
        $this->assertStringNotContainsString('Карты сценария', $capturedHtml);
    }

    public function test_export_character_cards_pdf_contract_validation_and_owner_boundary(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $scenario = Scenario::create([
            'user_id' => $owner->id,
            'title' => 'Character Cards Scenario',
        ]);
        $item = Item::create([
            'user_id' => $owner->id,
            'name' => 'Signal Crystal',
            'type' => 'tool',
            'rarity' => 'rare',
            'description' => 'A bright crystal.',
            'modifiers' => [],
            'weight' => 0.5,
            'value' => 20,
        ]);
        $character = Character::create([
            'user_id' => $owner->id,
            'name' => 'Irma Snow',
            'role' => 'NPC',
            'race' => 'Human',
            'description' => 'A watcher of the frozen lighthouse.',
            'stats' => ['STR' => 10, 'WIS' => 14],
            'inventory' => [$item->id],
        ]);
        $portrait = Asset::create([
            'user_id' => $owner->id,
            'type' => Asset::TYPE_IMAGE,
            'kind' => Asset::KIND_PORTRAIT,
            'name' => 'Irma Portrait',
            'url' => 'https://example.test/irma.png',
            'mime_type' => 'image/png',
            'metadata' => [],
        ]);

        EntityLink::create([
            'source_type' => EntityLink::TARGET_SCENARIO,
            'source_id' => $scenario->id,
            'target_type' => EntityLink::TARGET_CHARACTER,
            'target_id' => $character->id,
            'relation_type' => EntityLink::RELATION_USES,
            'metadata' => [],
        ]);
        EntityLink::create([
            'source_type' => EntityLink::TARGET_CHARACTER,
            'source_id' => $character->id,
            'target_type' => EntityLink::TARGET_ASSET,
            'target_id' => $portrait->id,
            'relation_type' => EntityLink::RELATION_USES,
            'metadata' => ['role' => 'portrait'],
        ]);

        $capturedHtml = null;
        $this->mock(GenerateCharacterCardsPdfAction::class, function (MockInterface $mock) use (&$capturedHtml): void {
            $mock->shouldReceive('execute')
                ->once()
                ->with(\Mockery::on(function (string $html) use (&$capturedHtml): bool {
                    $capturedHtml = $html;

                    return str_contains($html, 'Character Cards Scenario')
                        && str_contains($html, 'Irma Snow')
                        && str_contains($html, 'Signal Crystal')
                        && str_contains($html, 'https://example.test/irma.png')
                        && str_contains($html, '--accent: #8338EC;');
                }))
                ->andReturn('%PDF-character-cards%');
        });

        $this->postJson('/api/scenarios/' . $scenario->id . '/export/characters/pdf', [
            'duplex_edge' => 'sideways',
        ])->assertStatus(422);

        $response = $this->postJson('/api/scenarios/' . $scenario->id . '/export/characters/pdf', [
            'duplex_edge' => 'short',
        ]);

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/pdf');
        $this->assertSame('%PDF-character-cards%', $response->getContent());
        $this->assertNotNull($capturedHtml);
        $this->assertStringNotContainsString('Лицевая сторона', $capturedHtml);
        $this->assertStringNotContainsString('Оборот', $capturedHtml);
        $this->assertStringNotContainsString('Human', $capturedHtml);
        $this->assertStringNotContainsString('ур.', $capturedHtml);

        $contentDisposition = (string) $response->headers->get('Content-Disposition');
        $this->assertStringStartsWith(
            'attachment; filename="scenario_' . $scenario->id . '_character_cards_',
            $contentDisposition
        );
        $this->assertStringEndsWith('.pdf"', $contentDisposition);

        $foreignUser = User::factory()->create();
        Sanctum::actingAs($foreignUser);
        $this->postJson('/api/scenarios/' . $scenario->id . '/export/characters/pdf', [
            'duplex_edge' => 'short',
        ])->assertStatus(404);
    }

    public function test_export_character_cards_pdf_duplex_mirroring_and_pagination(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $scenario = Scenario::create([
            'user_id' => $owner->id,
            'title' => 'Mirroring Scenario',
        ]);

        for ($index = 1; $index <= 10; $index++) {
            $character = Character::create([
                'user_id' => $owner->id,
                'name' => 'Character ' . $index,
                'role' => 'NPC',
                'race' => 'Human',
                'description' => 'Character ' . $index . ' description.',
                'stats' => ['STR' => 10 + $index],
                'inventory' => [],
            ]);

            EntityLink::create([
                'source_type' => EntityLink::TARGET_SCENARIO,
                'source_id' => $scenario->id,
                'target_type' => EntityLink::TARGET_CHARACTER,
                'target_id' => $character->id,
                'relation_type' => EntityLink::RELATION_USES,
                'metadata' => [],
            ]);
        }

        $longEdgeHtml = null;
        $shortEdgeHtml = null;
        $this->mock(GenerateCharacterCardsPdfAction::class, function (MockInterface $mock) use (&$longEdgeHtml, &$shortEdgeHtml): void {
            $mock->shouldReceive('execute')
                ->once()
                ->with(\Mockery::on(function (string $html) use (&$longEdgeHtml): bool {
                    $longEdgeHtml = $html;

                    return str_contains($html, 'data-side="front"')
                        && str_contains($html, 'data-side="back"');
                }))
                ->andReturn('%PDF-long%');
            $mock->shouldReceive('execute')
                ->once()
                ->with(\Mockery::on(function (string $html) use (&$shortEdgeHtml): bool {
                    $shortEdgeHtml = $html;

                    return str_contains($html, 'data-side="front"')
                        && str_contains($html, 'data-side="back"');
                }))
                ->andReturn('%PDF-short%');
        });

        $this->postJson('/api/scenarios/' . $scenario->id . '/export/characters/pdf', [
            'duplex_edge' => 'long',
        ])->assertStatus(200);
        $this->postJson('/api/scenarios/' . $scenario->id . '/export/characters/pdf', [
            'duplex_edge' => 'short',
        ])->assertStatus(200);

        $this->assertNotNull($longEdgeHtml);
        $this->assertNotNull($shortEdgeHtml);
        $this->assertSame(2, substr_count($longEdgeHtml, 'data-side="front"'));
        $this->assertSame(2, substr_count($longEdgeHtml, 'data-side="back"'));
        $this->assertMatchesRegularExpression(
            '/data-card-side="back"[^>]*data-card-slot="0"[^>]*data-character-name="Character 3"/s',
            $longEdgeHtml
        );
        $this->assertMatchesRegularExpression(
            '/data-card-side="back"[^>]*data-card-slot="2"[^>]*data-character-name="Character 1"/s',
            $longEdgeHtml
        );
        $this->assertMatchesRegularExpression(
            '/data-sheet="2" data-side="back".*data-card-slot="2"[^>]*data-character-name="Character 10"/s',
            $longEdgeHtml
        );
        $this->assertMatchesRegularExpression(
            '/data-card-side="back"[^>]*data-card-slot="6"[^>]*data-character-name="Character 1"/s',
            $shortEdgeHtml
        );
        $this->assertMatchesRegularExpression(
            '/data-card-side="back"[^>]*data-card-slot="0"[^>]*data-character-name="Character 7"/s',
            $shortEdgeHtml
        );
    }

    public function test_export_character_cards_pdf_handles_empty_composition(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $scenario = Scenario::create([
            'user_id' => $owner->id,
            'title' => 'Empty Cards Scenario',
        ]);

        $capturedHtml = null;
        $this->mock(GenerateCharacterCardsPdfAction::class, function (MockInterface $mock) use (&$capturedHtml): void {
            $mock->shouldReceive('execute')
                ->once()
                ->with(\Mockery::on(function (string $html) use (&$capturedHtml): bool {
                    $capturedHtml = $html;

                    return str_contains($html, 'нет персонажей');
                }))
                ->andReturn('%PDF-empty-cards%');
        });

        $response = $this->postJson('/api/scenarios/' . $scenario->id . '/export/characters/pdf');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/pdf');
        $this->assertSame('%PDF-empty-cards%', $response->getContent());
        $this->assertNotNull($capturedHtml);
    }

    public function test_export_item_cards_pdf_contract_validation_owner_boundary_and_composition_only(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $scenario = Scenario::create([
            'user_id' => $owner->id,
            'title' => 'Item Cards Scenario',
        ]);
        $linkedItem = Item::create([
            'user_id' => $owner->id,
            'name' => 'Signal Crystal',
            'type' => 'Tool',
            'rarity' => 'rare',
            'description' => 'A bright crystal for the lens hall.',
            'modifiers' => [['stat' => 'WIS', 'value' => 2]],
            'weight' => 0.5,
            'value' => 20,
        ]);
        Item::create([
            'user_id' => $owner->id,
            'name' => 'Unlinked Relic',
            'type' => 'Relic',
            'rarity' => 'legendary',
            'description' => 'Must not be exported.',
            'modifiers' => [],
            'weight' => 1,
            'value' => 100,
        ]);

        EntityLink::create([
            'source_type' => EntityLink::TARGET_SCENARIO,
            'source_id' => $scenario->id,
            'target_type' => EntityLink::TARGET_ITEM,
            'target_id' => $linkedItem->id,
            'relation_type' => EntityLink::RELATION_USES,
            'metadata' => [],
        ]);

        $capturedHtml = null;
        $this->mock(GenerateItemCardsPdfAction::class, function (MockInterface $mock) use (&$capturedHtml): void {
            $mock->shouldReceive('execute')
                ->once()
                ->with(\Mockery::on(function (string $html) use (&$capturedHtml): bool {
                    $capturedHtml = $html;

                    return str_contains($html, 'Item Cards Scenario')
                        && str_contains($html, 'Signal Crystal')
                        && str_contains($html, 'WIS')
                        && str_contains($html, '+2')
                        && str_contains($html, '--accent: #4361EE;')
                        && !str_contains($html, 'Unlinked Relic');
                }))
                ->andReturn('%PDF-item-cards%');
        });

        $this->postJson('/api/scenarios/' . $scenario->id . '/export/items/pdf', [
            'duplex_edge' => 'sideways',
        ])->assertStatus(422);

        $response = $this->postJson('/api/scenarios/' . $scenario->id . '/export/items/pdf', [
            'duplex_edge' => 'short',
        ]);

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/pdf');
        $this->assertSame('%PDF-item-cards%', $response->getContent());
        $this->assertNotNull($capturedHtml);

        $contentDisposition = (string) $response->headers->get('Content-Disposition');
        $this->assertStringStartsWith(
            'attachment; filename="scenario_' . $scenario->id . '_item_cards_',
            $contentDisposition
        );
        $this->assertStringEndsWith('.pdf"', $contentDisposition);

        $foreignUser = User::factory()->create();
        Sanctum::actingAs($foreignUser);
        $this->postJson('/api/scenarios/' . $scenario->id . '/export/items/pdf', [
            'duplex_edge' => 'short',
        ])->assertStatus(404);
    }

    public function test_export_item_cards_pdf_duplex_mirroring_and_pagination(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $scenario = Scenario::create([
            'user_id' => $owner->id,
            'title' => 'Item Mirroring Scenario',
        ]);

        for ($index = 1; $index <= 10; $index++) {
            $item = Item::create([
                'user_id' => $owner->id,
                'name' => 'Item ' . $index,
                'type' => 'Tool',
                'rarity' => 'common',
                'description' => 'Item ' . $index . ' description.',
                'modifiers' => [['stat' => 'ATK', 'value' => $index]],
                'weight' => 0.1 * $index,
                'value' => $index,
            ]);

            EntityLink::create([
                'source_type' => EntityLink::TARGET_SCENARIO,
                'source_id' => $scenario->id,
                'target_type' => EntityLink::TARGET_ITEM,
                'target_id' => $item->id,
                'relation_type' => EntityLink::RELATION_USES,
                'metadata' => [],
            ]);
        }

        $longEdgeHtml = null;
        $shortEdgeHtml = null;
        $this->mock(GenerateItemCardsPdfAction::class, function (MockInterface $mock) use (&$longEdgeHtml, &$shortEdgeHtml): void {
            $mock->shouldReceive('execute')
                ->once()
                ->with(\Mockery::on(function (string $html) use (&$longEdgeHtml): bool {
                    $longEdgeHtml = $html;

                    return str_contains($html, 'data-side="front"')
                        && str_contains($html, 'data-side="back"');
                }))
                ->andReturn('%PDF-items-long%');
            $mock->shouldReceive('execute')
                ->once()
                ->with(\Mockery::on(function (string $html) use (&$shortEdgeHtml): bool {
                    $shortEdgeHtml = $html;

                    return str_contains($html, 'data-side="front"')
                        && str_contains($html, 'data-side="back"');
                }))
                ->andReturn('%PDF-items-short%');
        });

        $this->postJson('/api/scenarios/' . $scenario->id . '/export/items/pdf', [
            'duplex_edge' => 'long',
        ])->assertStatus(200);
        $this->postJson('/api/scenarios/' . $scenario->id . '/export/items/pdf', [
            'duplex_edge' => 'short',
        ])->assertStatus(200);

        $this->assertNotNull($longEdgeHtml);
        $this->assertNotNull($shortEdgeHtml);
        $this->assertSame(2, substr_count($longEdgeHtml, 'data-side="front"'));
        $this->assertSame(2, substr_count($longEdgeHtml, 'data-side="back"'));
        $this->assertMatchesRegularExpression(
            '/data-card-side="back"[^>]*data-card-slot="0"[^>]*data-item-name="Item 3"/s',
            $longEdgeHtml
        );
        $this->assertMatchesRegularExpression(
            '/data-card-side="back"[^>]*data-card-slot="2"[^>]*data-item-name="Item 1"/s',
            $longEdgeHtml
        );
        $this->assertMatchesRegularExpression(
            '/data-sheet="2" data-side="back".*data-card-slot="2"[^>]*data-item-name="Item 10"/s',
            $longEdgeHtml
        );
        $this->assertMatchesRegularExpression(
            '/data-card-side="back"[^>]*data-card-slot="6"[^>]*data-item-name="Item 1"/s',
            $shortEdgeHtml
        );
        $this->assertMatchesRegularExpression(
            '/data-card-side="back"[^>]*data-card-slot="0"[^>]*data-item-name="Item 7"/s',
            $shortEdgeHtml
        );
    }

    public function test_export_item_cards_pdf_handles_empty_composition(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $scenario = Scenario::create([
            'user_id' => $owner->id,
            'title' => 'Empty Item Cards Scenario',
        ]);

        $capturedHtml = null;
        $this->mock(GenerateItemCardsPdfAction::class, function (MockInterface $mock) use (&$capturedHtml): void {
            $mock->shouldReceive('execute')
                ->once()
                ->with(\Mockery::on(function (string $html) use (&$capturedHtml): bool {
                    $capturedHtml = $html;

                    return str_contains($html, 'нет предметов');
                }))
                ->andReturn('%PDF-empty-item-cards%');
        });

        $response = $this->postJson('/api/scenarios/' . $scenario->id . '/export/items/pdf');

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/pdf');
        $this->assertSame('%PDF-empty-item-cards%', $response->getContent());
        $this->assertNotNull($capturedHtml);
    }

    public function test_export_map_pdf_contract_validation_owner_boundary_and_visible_layers(): void
    {
        $owner = User::factory()->create();
        $foreignUser = User::factory()->create();
        Sanctum::actingAs($owner);

        $backgroundAsset = Asset::create([
            'user_id' => $owner->id,
            'type' => 'image',
            'kind' => 'background',
            'name' => 'Background Asset',
            'path' => 'assets/background.png',
            'url' => 'https://example.test/storage/background.png',
            'mime_type' => 'image/png',
            'size' => 100,
            'metadata' => [],
        ]);
        $tileAsset = Asset::create([
            'user_id' => $owner->id,
            'type' => 'image',
            'kind' => 'tile',
            'name' => 'Tile Asset',
            'path' => 'assets/tile.png',
            'url' => 'https://example.test/storage/tile.png',
            'mime_type' => 'image/png',
            'size' => 100,
            'metadata' => [],
        ]);
        $foreignAsset = Asset::create([
            'user_id' => $foreignUser->id,
            'type' => 'image',
            'kind' => 'token',
            'name' => 'Foreign Token',
            'path' => 'assets/foreign.png',
            'url' => 'https://example.test/storage/foreign.png',
            'mime_type' => 'image/png',
            'size' => 100,
            'metadata' => [],
        ]);

        $map = Map::create([
            'user_id' => $owner->id,
            'name' => 'Export Test Map',
            'width' => 4,
            'height' => 3,
            'cell_size' => 32,
            'data' => [
                'backgroundAssetId' => (string) $backgroundAsset->id,
                'layers' => [
                    [
                        'id' => 'background',
                        'type' => 'background',
                        'visible' => true,
                        'opacity' => 1,
                        'order' => 0,
                        'objects' => [],
                    ],
                    [
                        'id' => 'tiles',
                        'type' => 'tiles',
                        'visible' => true,
                        'opacity' => 1,
                        'order' => 1,
                        'objects' => [
                            [
                                'id' => 'tile-visible',
                                'x' => 1,
                                'y' => 1,
                                'type' => 'floor',
                                'label' => 'Visible Tile',
                                'color' => '#4361EE',
                                'assetId' => (string) $tileAsset->id,
                            ],
                            [
                                'id' => 'tile-system',
                                'x' => 2,
                                'y' => 1,
                                'type' => 'floor',
                                'label' => 'System Water',
                                'color' => '#229BD0',
                                'assetId' => 'system:tile:core:v1:water',
                            ],
                        ],
                    ],
                    [
                        'id' => 'hidden',
                        'type' => 'tiles',
                        'visible' => false,
                        'opacity' => 1,
                        'order' => 2,
                        'objects' => [
                            [
                                'id' => 'tile-hidden',
                                'x' => 2,
                                'y' => 1,
                                'type' => 'floor',
                                'label' => 'Hidden Tile',
                                'color' => '#E63946',
                            ],
                        ],
                    ],
                    [
                        'id' => 'tokens',
                        'type' => 'tokens',
                        'visible' => true,
                        'opacity' => 0.8,
                        'order' => 3,
                        'objects' => [
                            [
                                'id' => 'token-foreign',
                                'x' => 0,
                                'y' => 0,
                                'type' => 'enemy',
                                'label' => 'Fallback Token',
                                'color' => '#FFC300',
                                'assetId' => (string) $foreignAsset->id,
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $capturedCalls = [];
        $this->mock(GenerateMapPdfAction::class, function (MockInterface $mock) use (&$capturedCalls): void {
            $mock->shouldReceive('execute')
                ->twice()
                ->with(\Mockery::on(function (string $html) use (&$capturedCalls): bool {
                    $capturedCalls[] = $html;

                    return str_contains($html, 'Export Test Map')
                        && str_contains($html, '4 × 3')
                        && str_contains($html, 'Visible Tile')
                        && str_contains($html, 'Fallback Token')
                        && str_contains($html, 'System Water')
                        && str_contains($html, 'https://example.test/storage/background.png')
                        && str_contains($html, 'https://example.test/storage/tile.png')
                        && str_contains($html, 'file://')
                        && str_contains($html, '/system/tiles/core/v1/water.png')
                        && !str_contains($html, 'Hidden Tile')
                        && !str_contains($html, 'https://example.test/storage/foreign.png');
                }), \Mockery::type('string'), \Mockery::type('string'))
                ->andReturn('%PDF-map%');
        });

        $this->postJson('/api/maps/' . $map->id . '/export/pdf', [
            'page_size' => 'letter',
            'orientation' => 'landscape',
        ])->assertStatus(422);
        $this->postJson('/api/maps/' . $map->id . '/export/pdf', [
            'page_size' => 'a4',
            'orientation' => 'sideways',
        ])->assertStatus(422);

        $defaultResponse = $this->postJson('/api/maps/' . $map->id . '/export/pdf');
        $defaultResponse->assertStatus(200)
            ->assertHeader('Content-Type', 'application/pdf');
        $this->assertSame('%PDF-map%', $defaultResponse->getContent());

        $explicitResponse = $this->postJson('/api/maps/' . $map->id . '/export/pdf', [
            'page_size' => 'a0',
            'orientation' => 'portrait',
        ]);
        $explicitResponse->assertStatus(200);
        $this->assertSame('%PDF-map%', $explicitResponse->getContent());

        $this->assertCount(2, $capturedCalls);
        $this->assertStringContainsString('data-page-size="a4"', $capturedCalls[0]);
        $this->assertStringContainsString('data-orientation="landscape"', $capturedCalls[0]);
        $this->assertStringContainsString('data-page-size="a0"', $capturedCalls[1]);
        $this->assertStringContainsString('data-orientation="portrait"', $capturedCalls[1]);

        $contentDisposition = (string) $defaultResponse->headers->get('Content-Disposition');
        $this->assertStringStartsWith('attachment; filename="map_' . $map->id . '_', $contentDisposition);
        $this->assertStringEndsWith('.pdf"', $contentDisposition);

        Sanctum::actingAs($foreignUser);
        $this->postJson('/api/maps/' . $map->id . '/export/pdf')->assertStatus(404);
    }

    public function test_export_map_pdf_resolves_live_card_tokens_and_keeps_detached_snapshots(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);

        $currentToken = Asset::create([
            'user_id' => $owner->id,
            'type' => 'image',
            'kind' => 'token',
            'name' => 'Current Token',
            'path' => 'assets/current-token.png',
            'url' => 'https://example.test/storage/current-token.png',
            'mime_type' => 'image/png',
            'size' => 100,
            'metadata' => [],
        ]);
        $oldSnapshot = Asset::create([
            'user_id' => $owner->id,
            'type' => 'image',
            'kind' => 'token',
            'name' => 'Old Snapshot',
            'path' => 'assets/old-snapshot.png',
            'url' => 'https://example.test/storage/old-snapshot.png',
            'mime_type' => 'image/png',
            'size' => 100,
            'metadata' => [],
        ]);
        $detachedSnapshot = Asset::create([
            'user_id' => $owner->id,
            'type' => 'image',
            'kind' => 'item_image',
            'name' => 'Detached Snapshot',
            'path' => 'assets/detached-snapshot.png',
            'url' => 'https://example.test/storage/detached-snapshot.png',
            'mime_type' => 'image/png',
            'size' => 100,
            'metadata' => [],
        ]);
        $character = Character::create([
            'user_id' => $owner->id,
            'name' => 'Актуальный Герой',
            'role' => 'ally',
            'race' => 'human',
            'description' => '',
            'stats' => [],
            'inventory' => [],
        ]);
        EntityLink::create([
            'source_type' => EntityLink::TARGET_CHARACTER,
            'source_id' => $character->id,
            'target_type' => EntityLink::TARGET_ASSET,
            'target_id' => $currentToken->id,
            'relation_type' => EntityLink::RELATION_USES,
            'metadata' => ['role' => 'token'],
        ]);

        $map = Map::create([
            'user_id' => $owner->id,
            'name' => 'Live Token Map',
            'width' => 3,
            'height' => 2,
            'cell_size' => 32,
            'data' => [
                'layers' => [
                    [
                        'id' => 'tokens',
                        'type' => 'tokens',
                        'visible' => true,
                        'opacity' => 1,
                        'order' => 1,
                        'objects' => [
                            [
                                'id' => 'live-character',
                                'x' => 0,
                                'y' => 0,
                                'type' => 'character',
                                'label' => 'Старое имя',
                                'color' => '#FFC300',
                                'sourceType' => 'character',
                                'sourceId' => (string) $character->id,
                                'assetId' => (string) $oldSnapshot->id,
                            ],
                            [
                                'id' => 'detached-item',
                                'x' => 1,
                                'y' => 0,
                                'type' => 'item',
                                'label' => 'Старый ключ',
                                'color' => '#8338EC',
                                'sourceType' => 'item',
                                'sourceId' => '999999',
                                'assetId' => (string) $detachedSnapshot->id,
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $capturedHtml = null;
        $this->mock(GenerateMapPdfAction::class, function (MockInterface $mock) use (&$capturedHtml): void {
            $mock->shouldReceive('execute')
                ->once()
                ->with(\Mockery::on(function (string $html) use (&$capturedHtml): bool {
                    $capturedHtml = $html;

                    return str_contains($html, 'Актуальный Герой')
                        && str_contains($html, 'https://example.test/storage/current-token.png')
                        && !str_contains($html, 'https://example.test/storage/old-snapshot.png')
                        && str_contains($html, 'Старый ключ')
                        && str_contains($html, 'https://example.test/storage/detached-snapshot.png')
                        && str_contains($html, 'data-detached="true"');
                }), \Mockery::type('string'), \Mockery::type('string'))
                ->andReturn('%PDF-live-token-map%');
        });

        $response = $this->postJson('/api/maps/' . $map->id . '/export/pdf');

        $response->assertStatus(200);
        $this->assertSame('%PDF-live-token-map%', $response->getContent());
        $this->assertNotNull($capturedHtml);
    }
}
