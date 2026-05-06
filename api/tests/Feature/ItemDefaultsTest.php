<?php

namespace Tests\Feature;

use App\Models\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ItemDefaultsTest extends TestCase
{
    use RefreshDatabase;

    public function test_item_creation_uses_fixed_runtime_defaults_when_type_and_rarity_not_provided(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/items', [
            'name' => 'Simple Item',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('type', 'Прочее')
            ->assertJsonPath('rarity', 'Обычный');
    }

    public function test_item_database_defaults_are_available_without_legacy_backfill(): void
    {
        $item = Item::query()->create([
            'user_id' => User::factory()->create()->id,
            'name' => 'Default Item',
        ]);

        $item->refresh();

        $this->assertSame('Прочее', $item->type);
        $this->assertSame('Обычный', $item->rarity);
        $this->assertSame([], $item->modifiers);
        $this->assertSame(0.0, $item->weight);
        $this->assertSame(0, $item->value);
    }
}
