<?php

namespace Tests\Feature;

use App\Domain\Export\Actions\GenerateScenarioPdfAction;
use App\Models\AdminAuditLog;
use App\Models\Announcement;
use App\Models\Block;
use App\Models\Chapter;
use App\Models\Map;
use App\Models\Report;
use App\Models\Scenario;
use App\Models\User;
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

        $chapter = Chapter::create([
            'scenario_id' => $scenario->id,
            'title' => 'Chapter One',
            'order_index' => 0,
        ]);

        Block::create([
            'chapter_id' => $chapter->id,
            'type' => 'scene',
            'content' => 'Block Content',
            'order_index' => 0,
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

        $this->mock(GenerateScenarioPdfAction::class, function (MockInterface $mock): void {
            $mock->shouldReceive('execute')
                ->once()
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

        $foreignUser = User::factory()->create();
        Sanctum::actingAs($foreignUser);
        $this->post('/api/scenarios/' . $scenario->id . '/export/pdf')->assertStatus(404);
    }
}

