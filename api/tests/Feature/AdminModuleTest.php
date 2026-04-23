<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\Character;
use App\Models\Item;
use App\Models\Map;
use App\Models\Report;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_overview_returns_expected_payload_shape_and_stats(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create(['status' => User::STATUS_ACTIVE]);
        User::factory()->create(['status' => User::STATUS_MUTED]);
        User::factory()->create(['status' => User::STATUS_BANNED]);

        $owner = User::factory()->create();
        $campaign = Campaign::query()->create([
            'user_id' => $owner->id,
            'title' => 'Campaign A',
        ]);
        $scenario = Scenario::query()->create([
            'user_id' => $owner->id,
            'campaign_id' => $campaign->id,
            'title' => 'Scenario A',
        ]);
        Map::query()->create([
            'user_id' => $owner->id,
            'scenario_id' => $scenario->id,
            'campaign_id' => $campaign->id,
            'name' => 'Map A',
        ]);
        Character::query()->create([
            'user_id' => $owner->id,
            'scenario_id' => $scenario->id,
            'campaign_id' => $campaign->id,
            'name' => 'Character A',
        ]);
        Item::query()->create([
            'user_id' => $owner->id,
            'name' => 'Item A',
        ]);

        Report::query()->create([
            'reporter_id' => $owner->id,
            'target_type' => Report::TARGET_SCENARIO,
            'target_id' => $scenario->id,
            'reason' => 'abuse',
            'status' => Report::STATUS_OPEN,
        ]);

        AdminAuditLog::query()->create([
            'user_id' => $admin->id,
            'action' => 'ADMIN_TEST',
            'details' => 'seed log',
            'context' => ['k' => 'v'],
        ]);

        Announcement::query()->create([
            'user_id' => $admin->id,
            'type' => 'info',
            'message' => 'Hello',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/overview');

        $response->assertOk()
            ->assertJsonStructure([
                'stats' => [
                    'users_total',
                    'users_active',
                    'users_muted',
                    'users_banned',
                    'reports_open',
                    'scenarios_total',
                    'maps_total',
                    'characters_total',
                    'items_total',
                    'campaigns_total',
                ],
                'logs' => [[
                    'id',
                    'action',
                    'details',
                    'context',
                    'created_at',
                    'user' => ['id', 'name', 'email'],
                ]],
                'broadcasts' => [[
                    'id',
                    'type',
                    'message',
                    'created_at',
                    'author',
                ]],
            ]);

        $response->assertJsonPath('stats.users_total', 5);
        $response->assertJsonPath('stats.users_muted', 1);
        $response->assertJsonPath('stats.users_banned', 1);
        $response->assertJsonPath('stats.reports_open', 1);
        $response->assertJsonPath('stats.scenarios_total', 1);
        $response->assertJsonPath('stats.maps_total', 1);
        $response->assertJsonPath('stats.characters_total', 1);
        $response->assertJsonPath('stats.items_total', 1);
        $response->assertJsonPath('stats.campaigns_total', 1);
    }

    public function test_admin_users_search_update_and_self_protection_rules(): void
    {
        $admin = User::factory()->admin()->create([
            'name' => 'Root Admin',
            'email' => 'root@example.com',
        ]);
        $target = User::factory()->create([
            'name' => 'Alpha User',
            'email' => 'alpha@example.com',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users?search=alp')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $target->id,
                'email' => 'alpha@example.com',
            ]);

        $this->patchJson("/api/admin/users/{$admin->id}", [
            'role' => User::ROLE_USER,
        ])->assertStatus(422)
            ->assertJson(['message' => 'You cannot remove your own admin role']);

        $this->patchJson("/api/admin/users/{$admin->id}", [
            'status' => User::STATUS_BANNED,
        ])->assertStatus(422)
            ->assertJson(['message' => 'You cannot ban yourself']);

        $this->patchJson("/api/admin/users/{$target->id}", [
            'role' => User::ROLE_MODERATOR,
            'status' => User::STATUS_MUTED,
        ])->assertOk()
            ->assertJsonStructure(['id', 'name', 'email', 'role', 'status', 'created_at'])
            ->assertJsonFragment([
                'id' => $target->id,
                'role' => User::ROLE_MODERATOR,
                'status' => User::STATUS_MUTED,
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $target->id,
            'role' => User::ROLE_MODERATOR,
            'status' => User::STATUS_MUTED,
        ]);

        $this->assertDatabaseHas('admin_audit_logs', [
            'action' => 'ADMIN_USER_UPDATED',
            'user_id' => $admin->id,
        ]);
    }

    public function test_admin_reports_filtering_update_and_target_ban_behavior(): void
    {
        $admin = User::factory()->admin()->create();
        $reporter = User::factory()->create();
        $target = User::factory()->create(['status' => User::STATUS_ACTIVE]);

        $report = Report::query()->create([
            'reporter_id' => $reporter->id,
            'target_type' => Report::TARGET_USER,
            'target_id' => $target->id,
            'reason' => 'spam',
            'description' => 'spam messages',
            'status' => Report::STATUS_OPEN,
        ]);

        $selfTargetReport = Report::query()->create([
            'reporter_id' => $reporter->id,
            'target_type' => Report::TARGET_USER,
            'target_id' => $admin->id,
            'reason' => 'abuse',
            'description' => 'cannot self-ban',
            'status' => Report::STATUS_OPEN,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/reports?status=open&search=spa')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $report->id,
                'reason' => 'spam',
            ]);

        $this->patchJson("/api/admin/reports/{$report->id}", [
            'status' => Report::STATUS_RESOLVED,
            'ban_target_user' => true,
        ])->assertOk()
            ->assertJsonPath('id', $report->id)
            ->assertJsonPath('status', Report::STATUS_RESOLVED)
            ->assertJsonPath('reviewed_by.id', $admin->id);

        $this->assertDatabaseHas('users', [
            'id' => $target->id,
            'status' => User::STATUS_BANNED,
        ]);

        $this->patchJson("/api/admin/reports/{$selfTargetReport->id}", [
            'status' => Report::STATUS_RESOLVED,
            'ban_target_user' => true,
        ])->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'status' => User::STATUS_ACTIVE,
        ]);

        $this->assertDatabaseHas('admin_audit_logs', [
            'action' => 'ADMIN_REPORT_UPDATED',
            'user_id' => $admin->id,
        ]);
    }

    public function test_admin_content_filter_and_delete_with_cleanup(): void
    {
        $admin = User::factory()->admin()->create();
        $owner = User::factory()->create(['name' => 'Needle Owner']);

        $scenario = Scenario::query()->create([
            'user_id' => $owner->id,
            'title' => 'Needle Scenario',
        ]);

        Report::query()->create([
            'reporter_id' => $admin->id,
            'target_type' => Report::TARGET_SCENARIO,
            'target_id' => $scenario->id,
            'reason' => 'abuse',
            'status' => Report::STATUS_OPEN,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/content?type=scenario&search=needle')
            ->assertOk()
            ->assertJsonFragment([
                'type' => Report::TARGET_SCENARIO,
                'id' => $scenario->id,
                'title' => 'Needle Scenario',
            ]);

        $this->deleteJson('/api/admin/content/scenario/0')
            ->assertStatus(422)
            ->assertJson(['message' => 'Invalid content id']);

        $this->deleteJson('/api/admin/content/scenario/999999')
            ->assertStatus(404)
            ->assertJson(['message' => 'Content not found']);

        $this->deleteJson("/api/admin/content/scenario/{$scenario->id}")
            ->assertOk()
            ->assertJson(['message' => 'Deleted']);

        $this->assertDatabaseMissing('scenarios', ['id' => $scenario->id]);
        $this->assertDatabaseMissing('reports', [
            'target_type' => Report::TARGET_SCENARIO,
            'target_id' => $scenario->id,
        ]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'action' => 'ADMIN_CONTENT_DELETED',
            'user_id' => $admin->id,
        ]);
    }

    public function test_admin_broadcasts_and_logs_endpoints_return_expected_payloads(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'AdminCaster']);
        Sanctum::actingAs($admin);

        $create = $this->postJson('/api/admin/broadcasts', [
            'type' => 'warning',
            'message' => 'Maintenance window',
        ]);

        $create->assertStatus(201)
            ->assertJsonStructure(['id', 'type', 'message', 'created_at', 'author'])
            ->assertJsonFragment([
                'type' => 'warning',
                'message' => 'Maintenance window',
                'author' => 'AdminCaster',
            ]);

        $this->getJson('/api/admin/broadcasts')
            ->assertOk()
            ->assertJsonStructure([[
                'id',
                'type',
                'message',
                'created_at',
                'author',
            ]]);

        $this->getJson('/api/admin/logs')
            ->assertOk()
            ->assertJsonStructure([[
                'id',
                'action',
                'details',
                'context',
                'created_at',
                'user' => ['id', 'name', 'email'],
            ]])
            ->assertJsonFragment([
                'action' => 'ADMIN_BROADCAST_CREATED',
            ]);
    }
}
