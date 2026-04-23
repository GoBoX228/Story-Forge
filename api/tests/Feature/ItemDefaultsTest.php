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

    public function test_items_legacy_text_backfill_migration_is_idempotent(): void
    {
        $legacyItem = Item::query()->create([
            'user_id' => User::factory()->create()->id,
            'name' => 'Legacy Item',
            'type' => 'РџСЂРѕС‡РµРµ',
            'rarity' => 'РћР±С‹С‡РЅС‹Р№',
            'description' => null,
            'modifiers' => [],
            'weight' => 0,
            'value' => 0,
        ]);

        $migration = require database_path('migrations/2026_04_23_000019_fix_items_defaults_and_backfill_legacy_text.php');
        $migration->up();
        $migration->up();

        $legacyItem->refresh();

        $this->assertSame('Прочее', $legacyItem->type);
        $this->assertSame('Обычный', $legacyItem->rarity);
    }
}

