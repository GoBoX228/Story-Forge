<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\AssetCollection;
use App\Models\AssetFolder;
use App\Models\Campaign;
use App\Models\Character;
use App\Models\Item;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_protected_api_surface(): void
    {
        foreach ([
            '/api/me',
            '/api/campaigns',
            '/api/scenarios',
            '/api/maps',
            '/api/characters',
            '/api/items',
            '/api/assets',
            '/api/asset-folders',
            '/api/asset-collections',
            '/api/tags',
            '/api/publications',
            '/api/admin/overview',
        ] as $uri) {
            $this->getJson($uri)->assertStatus(401);
        }

        foreach ([
            '/api/campaigns',
            '/api/scenarios',
            '/api/maps',
            '/api/characters',
            '/api/items',
            '/api/assets',
            '/api/reports',
        ] as $uri) {
            $this->postJson($uri, [])->assertStatus(401);
        }
    }

    public function test_foreign_core_entity_direct_access_stays_404(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $campaign = Campaign::query()->create([
            'user_id' => $owner->id,
            'title' => 'Owner Campaign',
        ]);

        $scenario = Scenario::query()->create([
            'user_id' => $owner->id,
            'campaign_id' => $campaign->id,
            'title' => 'Owner Scenario',
        ]);

        $map = Map::query()->create([
            'user_id' => $owner->id,
            'campaign_id' => $campaign->id,
            'name' => 'Owner Map',
            'width' => 10,
            'height' => 10,
            'cell_size' => 32,
            'data' => [],
        ]);

        $character = Character::query()->create([
            'user_id' => $owner->id,
            'campaign_id' => $campaign->id,
            'name' => 'Owner Character',
            'role' => 'NPC',
        ]);

        $item = Item::query()->create([
            'user_id' => $owner->id,
            'name' => 'Owner Item',
        ]);

        $asset = Asset::query()->create([
            'user_id' => $owner->id,
            'type' => Asset::TYPE_IMAGE,
            'kind' => Asset::KIND_TOKEN,
            'name' => 'Owner Asset',
            'path' => 'assets/' . $owner->id . '/token.png',
            'url' => 'https://example.test/storage/assets/' . $owner->id . '/token.png',
            'mime_type' => 'image/png',
            'size' => 128,
            'metadata' => [],
        ]);

        $folder = AssetFolder::query()->create([
            'user_id' => $owner->id,
            'name' => 'Owner Folder',
            'slug' => 'owner-folder',
        ]);

        $collection = AssetCollection::query()->create([
            'user_id' => $owner->id,
            'name' => 'Owner Set',
            'slug' => 'owner-set',
        ]);

        Sanctum::actingAs($intruder);

        foreach ([
            "/api/campaigns/{$campaign->id}",
            "/api/scenarios/{$scenario->id}",
            "/api/maps/{$map->id}",
            "/api/items/{$item->id}",
            "/api/assets/{$asset->id}",
            "/api/asset-folders/{$folder->id}",
            "/api/asset-collections/{$collection->id}",
        ] as $uri) {
            $this->getJson($uri)->assertStatus(404);
            $this->patchJson($uri, ['name' => 'Intruder Update', 'title' => 'Intruder Update'])->assertStatus(404);
            $this->deleteJson($uri)->assertStatus(404);
        }

        $this->patchJson("/api/characters/{$character->id}", ['name' => 'Intruder Update'])->assertStatus(404);
        $this->deleteJson("/api/characters/{$character->id}")->assertStatus(404);
    }

    public function test_non_admin_cannot_access_admin_route_surface(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);
        $target = User::factory()->create();
        $scenario = Scenario::query()->create([
            'user_id' => $target->id,
            'title' => 'Target Scenario',
        ]);

        Sanctum::actingAs($user);

        foreach ([
            '/api/admin/overview',
            '/api/admin/users',
            '/api/admin/reports',
            '/api/admin/content',
            '/api/admin/broadcasts',
            '/api/admin/logs',
        ] as $uri) {
            $this->getJson($uri)->assertStatus(403);
        }

        $this->patchJson("/api/admin/users/{$target->id}", [
            'role' => User::ROLE_ADMIN,
        ])->assertStatus(403);

        $this->postJson('/api/admin/broadcasts', [
            'type' => 'info',
            'message' => 'Unauthorized broadcast',
        ])->assertStatus(403);

        $this->deleteJson("/api/admin/content/scenario/{$scenario->id}")
            ->assertStatus(403);
    }

    public function test_cookie_authenticated_write_requests_require_csrf_header(): void
    {
        $user = User::factory()->create([
            'email' => 'csrf-user@example.com',
            'status' => User::STATUS_ACTIVE,
        ]);
        $issuedTokens = app(\App\Domain\Auth\Actions\IssueTokensAction::class)->execute($user);
        $refreshToken = $issuedTokens->refreshCookie->getValue();

        $this->withCredentials()
            ->withUnencryptedCookie('refresh_token', $refreshToken)
            ->patchJson('/api/me', [
                'name' => 'Blocked CSRF Update',
                'email' => 'csrf-user@example.com',
            ])
            ->assertStatus(419)
            ->assertCookieExpired('csrf_token_signature');

        $csrf = $this->csrfTokenPair();

        $this->withCredentials()
            ->withUnencryptedCookie('refresh_token', $refreshToken)
            ->withUnencryptedCookie('csrf_token_signature', $csrf['signature'])
            ->withHeader('X-CSRF-TOKEN', $csrf['token'])
            ->patchJson('/api/me', [
                'name' => 'Allowed CSRF Update',
                'email' => 'csrf-user@example.com',
            ])
            ->assertStatus(200)
            ->assertJsonPath('name', 'Allowed CSRF Update');
    }

    private function csrfTokenPair(): array
    {
        $response = $this->getJson('/api/auth/csrf')->assertStatus(200);
        $cookie = $response->getCookie('csrf_token_signature', false);

        if (!$cookie) {
            $this->fail('Response does not contain csrf_token_signature cookie.');
        }

        return [
            'token' => $response->json('csrf_token'),
            'signature' => $cookie->getValue(),
        ];
    }
}
