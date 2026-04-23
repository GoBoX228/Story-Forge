<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ScenarioTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_scenario(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/scenarios', [
            'title' => 'Мой сценарий',
            'description' => 'Описание',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['title' => 'Мой сценарий']);
    }
}
