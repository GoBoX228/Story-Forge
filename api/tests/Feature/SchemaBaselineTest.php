<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SchemaBaselineTest extends TestCase
{
    use RefreshDatabase;

    public function test_clean_baseline_contains_current_and_planned_tables(): void
    {
        $tables = [
            'users',
            'password_reset_tokens',
            'sessions',
            'personal_access_tokens',
            'refresh_tokens',
            'two_factor_challenges',
            'two_factor_recovery_codes',
            'cache',
            'cache_locks',
            'jobs',
            'job_batches',
            'failed_jobs',
            'campaigns',
            'scenarios',
            'maps',
            'characters',
            'items',
            'scenario_nodes',
            'scenario_transitions',
            'locations',
            'factions',
            'events',
            'entity_links',
            'tags',
            'taggables',
            'assets',
            'campaign_members',
            'comments',
            'published_contents',
            'export_jobs',
            'idempotency_keys',
            'notifications',
            'reports',
            'announcements',
            'admin_audit_logs',
        ];

        foreach ($tables as $table) {
            $this->assertTrue(Schema::hasTable($table), "Missing table [{$table}].");
        }
    }

    public function test_clean_baseline_contains_graph_world_and_operational_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('scenario_nodes', [
            'scenario_id',
            'type',
            'title',
            'content',
            'position',
            'config',
            'order_index',
        ]));

        $this->assertTrue(Schema::hasColumns('scenario_transitions', [
            'scenario_id',
            'from_node_id',
            'to_node_id',
            'type',
            'label',
            'condition',
            'metadata',
            'order_index',
        ]));

        $this->assertTrue(Schema::hasColumns('entity_links', [
            'source_type',
            'source_id',
            'target_type',
            'target_id',
            'relation_type',
            'metadata',
        ]));

        $this->assertTrue(Schema::hasColumns('idempotency_keys', [
            'user_id',
            'key',
            'method',
            'route',
            'request_hash',
            'status',
            'response_status',
            'response_body',
            'locked_until',
            'expires_at',
        ]));
    }

    public function test_social_layer_tables_are_deferred(): void
    {
        foreach (['communities', 'friend_requests', 'friendships', 'dialogs', 'messages'] as $table) {
            $this->assertFalse(Schema::hasTable($table), "Deferred social table [{$table}] should not exist yet.");
        }
    }
}
