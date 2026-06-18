<?php

namespace Tests\Feature;

use App\Models\Scenario;
use App\Models\ScenarioGroup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ScenarioGroupTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_manage_scenario_groups_and_assign_scenarios(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $group = $this->postJson('/api/scenario-groups', [
            'name' => 'Ice Lighthouse',
            'description' => 'Main arc',
        ])->assertStatus(201)
            ->assertJsonPath('name', 'Ice Lighthouse')
            ->json();

        $scenario = $this->postJson('/api/scenarios', [
            'title' => 'Briefing',
            'group_id' => $group['id'],
        ])->assertStatus(201)
            ->assertJsonPath('scenario_group_id', $group['id'])
            ->json();

        $this->getJson('/api/scenarios?groupId=' . $group['id'])
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $scenario['id']);

        $this->patchJson('/api/scenario-groups/' . $group['id'], [
            'name' => 'Frozen Loop',
        ])->assertStatus(200)
            ->assertJsonPath('name', 'Frozen Loop');

        $this->deleteJson('/api/scenario-groups/' . $group['id'])
            ->assertStatus(200);

        $this->assertDatabaseHas('scenarios', [
            'id' => $scenario['id'],
            'scenario_group_id' => null,
        ]);
    }

    public function test_group_id_none_filters_ungrouped_scenarios(): void
    {
        $user = User::factory()->create();
        $group = ScenarioGroup::create([
            'user_id' => $user->id,
            'name' => 'Grouped',
            'slug' => 'grouped',
        ]);
        Scenario::create([
            'user_id' => $user->id,
            'title' => 'Grouped Scenario',
            'scenario_group_id' => $group->id,
        ]);
        $ungrouped = Scenario::create([
            'user_id' => $user->id,
            'title' => 'Ungrouped Scenario',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/scenarios?groupId=none')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $ungrouped->id);
    }

    public function test_scenario_group_ownership_boundaries_are_404(): void
    {
        $owner = User::factory()->create();
        $foreign = User::factory()->create();
        $ownerGroup = ScenarioGroup::create([
            'user_id' => $owner->id,
            'name' => 'Owner Group',
            'slug' => 'owner-group',
        ]);
        $foreignGroup = ScenarioGroup::create([
            'user_id' => $foreign->id,
            'name' => 'Foreign Group',
            'slug' => 'foreign-group',
        ]);
        $ownerScenario = Scenario::create([
            'user_id' => $owner->id,
            'title' => 'Owner Scenario',
        ]);

        Sanctum::actingAs($owner);

        $this->postJson('/api/scenarios', [
            'title' => 'Invalid Group',
            'group_id' => $foreignGroup->id,
        ])->assertStatus(404);

        $this->patchJson('/api/scenarios/' . $ownerScenario->id, [
            'scenario_group_id' => $foreignGroup->id,
        ])->assertStatus(404);

        Sanctum::actingAs($foreign);

        $this->getJson('/api/scenario-groups/' . $ownerGroup->id)
            ->assertStatus(404);
        $this->patchJson('/api/scenario-groups/' . $ownerGroup->id, [
            'name' => 'x',
        ])->assertStatus(404);
        $this->deleteJson('/api/scenario-groups/' . $ownerGroup->id)
            ->assertStatus(404);
    }

    public function test_scenario_groups_are_sorted_by_order_then_name(): void
    {
        $user = User::factory()->create();
        ScenarioGroup::create([
            'user_id' => $user->id,
            'name' => 'Beta',
            'slug' => 'beta',
            'order_index' => 2,
        ]);
        $alpha = ScenarioGroup::create([
            'user_id' => $user->id,
            'name' => 'Alpha',
            'slug' => 'alpha',
            'order_index' => 1,
        ]);
        $gamma = ScenarioGroup::create([
            'user_id' => $user->id,
            'name' => 'Gamma',
            'slug' => 'gamma',
            'order_index' => 1,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/scenario-groups')
            ->assertStatus(200)
            ->assertJsonPath('0.id', $alpha->id)
            ->assertJsonPath('1.id', $gamma->id);
    }
}

