<?php

namespace Tests\Feature;

use App\Domain\Core\Services\SystemTileCatalog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SystemTileCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_list_readonly_system_tiles(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/system-tiles');

        $response->assertOk()
            ->assertJsonCount(9)
            ->assertJsonPath('0.id', 'system:tile:core:v1:stone-floor')
            ->assertJsonPath('0.readonly', true)
            ->assertJsonPath('0.set_name', 'Основной набор');

        foreach ($response->json() as $tile) {
            $this->assertFileExists(
                public_path('system/tiles/core/v1/' . basename(parse_url($tile['url'], PHP_URL_PATH)))
            );
        }
    }

    public function test_catalog_resolves_only_declared_system_tile_ids(): void
    {
        $catalog = app(SystemTileCatalog::class);

        $this->assertSame(
            'https://story-forge.test/system/tiles/core/v1/water.png',
            $catalog->resolveUrl('system:tile:core:v1:water', 'https://story-forge.test')
        );
        $this->assertStringStartsWith(
            'file://',
            (string) $catalog->resolveLocalUri('system:tile:core:v1:water')
        );
        $this->assertStringEndsWith(
            '/system/tiles/core/v1/water.png',
            (string) $catalog->resolveLocalUri('system:tile:core:v1:water')
        );
        $this->assertNull(
            $catalog->resolveUrl('system:tile:core:v1:../../secret', 'https://story-forge.test')
        );
        $this->assertNull(
            $catalog->resolveLocalUri('system:tile:core:v1:../../secret')
        );
    }
}
