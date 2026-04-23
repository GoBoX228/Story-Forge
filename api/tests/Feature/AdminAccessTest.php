<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_admin_routes(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/admin/overview')
            ->assertStatus(403);
    }

    public function test_admin_can_view_and_update_users(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $target->id,
                'email' => $target->email,
            ]);

        $this->patchJson("/api/admin/users/{$target->id}", [
            'role' => User::ROLE_MODERATOR,
            'status' => User::STATUS_MUTED,
        ])->assertOk()
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
    }

    public function test_admin_can_resolve_report_and_ban_target_user(): void
    {
        $admin = User::factory()->admin()->create();
        $reporter = User::factory()->create();
        $target = User::factory()->create();

        $report = Report::query()->create([
            'reporter_id' => $reporter->id,
            'target_type' => Report::TARGET_USER,
            'target_id' => $target->id,
            'reason' => 'abuse',
            'description' => 'toxic behavior in chat',
            'status' => Report::STATUS_OPEN,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/reports/{$report->id}", [
            'status' => Report::STATUS_RESOLVED,
            'ban_target_user' => true,
        ])->assertOk()
            ->assertJsonFragment([
                'id' => $report->id,
                'status' => Report::STATUS_RESOLVED,
            ]);

        $this->assertDatabaseHas('reports', [
            'id' => $report->id,
            'status' => Report::STATUS_RESOLVED,
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $target->id,
            'status' => User::STATUS_BANNED,
        ]);
    }
}

