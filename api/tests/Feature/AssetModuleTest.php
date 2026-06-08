<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\AssetCollection;
use App\Models\AssetFolder;
use App\Models\Character;
use App\Models\Item;
use App\Models\Map;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssetModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_list_show_update_and_delete_asset(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $collection = AssetCollection::create([
            'user_id' => $user->id,
            'name' => 'Map Pack',
            'slug' => 'map-pack',
            'description' => 'Campaign',
        ]);
        $folder = AssetFolder::create([
            'user_id' => $user->id,
            'name' => 'Tokens',
            'slug' => 'tokens',
        ]);

        Sanctum::actingAs($user);

        $upload = $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('token.png', 256, 'image/png'),
            'name' => 'Hero Token',
            'type' => Asset::TYPE_IMAGE,
            'kind' => Asset::KIND_TOKEN,
            'folder_id' => $folder->id,
            'collection_ids' => [$collection->id],
        ]);

        $upload->assertStatus(201)
            ->assertJsonPath('name', 'Hero Token')
            ->assertJsonPath('type', Asset::TYPE_IMAGE)
            ->assertJsonPath('kind', Asset::KIND_TOKEN)
            ->assertJsonPath('asset_folder_id', $folder->id)
            ->assertJsonPath('collection_ids.0', (string) $collection->id)
            ->assertJsonPath('mime_type', 'image/png');

        $assetId = $upload->json('id');
        $assetPath = $upload->json('path');
        $this->assertNotEmpty($assetPath);
        Storage::disk('public')->assertExists($assetPath);

        $this->getJson('/api/assets')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $assetId);

        $this->getJson('/api/assets?kind=token&folder_id=' . $folder->id . '&collectionId=' . $collection->id)
            ->assertStatus(200)
            ->assertJsonCount(1);

        $this->getJson('/api/assets?folder_id=root')
            ->assertStatus(200)
            ->assertJsonCount(0);

        $this->getJson('/api/assets/' . $assetId)
            ->assertStatus(200)
            ->assertJsonPath('id', $assetId);

        $this->patchJson('/api/assets/' . $assetId, [
            'name' => 'Updated Token',
            'type' => Asset::TYPE_IMAGE,
            'kind' => Asset::KIND_PORTRAIT,
            'folder_id' => null,
            'collection_ids' => [],
        ])->assertStatus(200)
            ->assertJsonPath('name', 'Updated Token')
            ->assertJsonPath('type', Asset::TYPE_IMAGE)
            ->assertJsonPath('kind', Asset::KIND_PORTRAIT)
            ->assertJsonPath('asset_folder_id', null)
            ->assertJsonPath('collection_ids', []);

        $this->deleteJson('/api/assets/' . $assetId)
            ->assertStatus(200)
            ->assertJsonPath('message', 'Deleted');

        $this->assertDatabaseMissing('assets', ['id' => $assetId]);
        Storage::disk('public')->assertMissing($assetPath);
    }

    public function test_asset_access_is_scoped_to_owner(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $foreign = User::factory()->create();
        Sanctum::actingAs($owner);

        $assetId = $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('notes.pdf', 128, 'application/pdf'),
            'name' => 'Notes',
        ])->json('id');

        Sanctum::actingAs($foreign);

        $this->getJson('/api/assets/' . $assetId)->assertStatus(404);
        $this->patchJson('/api/assets/' . $assetId, ['name' => 'Foreign Update'])->assertStatus(404);
        $this->deleteJson('/api/assets/' . $assetId)->assertStatus(404);
    }

    public function test_asset_upload_rejects_foreign_collection_and_invalid_file(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $foreign = User::factory()->create();
        $foreignCollection = AssetCollection::create([
            'user_id' => $foreign->id,
            'name' => 'Foreign Pack',
            'slug' => 'foreign-pack',
            'description' => 'Foreign',
        ]);

        Sanctum::actingAs($user);

        $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('map.png', 128, 'image/png'),
            'collection_ids' => [$foreignCollection->id],
        ])->assertStatus(404);

        $this->post('/api/assets', [
            'name' => 'No File',
        ])->assertStatus(302);

        $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('huge.bin', 10241),
        ])->assertStatus(302);
    }

    public function test_asset_upload_rejects_unsafe_public_file_types(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('payload.html', 1, 'text/html'),
            'name' => 'Payload',
        ], ['Accept' => 'application/json'])->assertStatus(422);

        $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('vector.svg', 1, 'image/svg+xml'),
            'name' => 'Vector',
        ], ['Accept' => 'application/json'])->assertStatus(422);
    }

    public function test_asset_upload_rejects_unsafe_extensions_even_with_allowed_mime(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        foreach ([
            'payload.php',
            'payload.phtml',
            'payload.html',
            'payload.svg',
            'image.php.jpg',
            'archive.sh.zip',
        ] as $filename) {
            $this->post('/api/assets', [
                'file' => UploadedFile::fake()->create($filename, 1, 'image/jpeg'),
                'name' => 'Unsafe Extension',
            ], ['Accept' => 'application/json'])->assertStatus(422);
        }

        $this->assertDatabaseCount('assets', 0);
    }

    public function test_asset_upload_uses_server_generated_storage_path(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('original-token.png', 1, 'image/png'),
            'name' => 'Original Token',
        ], ['Accept' => 'application/json'])->assertStatus(201);

        $path = (string) $response->json('path');

        $this->assertStringStartsWith('assets/' . $user->id . '/', $path);
        $this->assertStringNotContainsString('original-token', $path);
        $this->assertStringNotContainsString('..', $path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_asset_upload_is_rate_limited(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        for ($upload = 0; $upload < 20; $upload++) {
            $this->post('/api/assets', [
                'file' => UploadedFile::fake()->create("token-{$upload}.png", 16, 'image/png'),
                'name' => "Token {$upload}",
            ], ['Accept' => 'application/json'])->assertStatus(201);
        }

        $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('token-over-limit.png', 16, 'image/png'),
            'name' => 'Token Over Limit',
        ], ['Accept' => 'application/json'])->assertStatus(429);
    }

    public function test_user_can_manage_asset_collections_without_deleting_assets(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $collection = $this->postJson('/api/asset-collections', [
            'name' => 'Dungeon Pack',
            'description' => 'Tiles and tokens',
        ])->assertStatus(201)
            ->assertJsonPath('name', 'Dungeon Pack')
            ->assertJsonPath('slug', 'dungeon-pack')
            ->json();

        $assetId = $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('tile.png', 128, 'image/png'),
            'name' => 'Stone Tile',
            'kind' => Asset::KIND_TILE,
            'collection_ids' => [$collection['id']],
        ])->assertStatus(201)->json('id');

        $this->getJson('/api/asset-collections')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.asset_ids.0', (string) $assetId);

        $this->patchJson('/api/asset-collections/' . $collection['id'], [
            'name' => 'Dungeon Kit',
        ])->assertStatus(200)
            ->assertJsonPath('name', 'Dungeon Kit')
            ->assertJsonPath('slug', 'dungeon-kit');

        $this->deleteJson('/api/asset-collections/' . $collection['id'])
            ->assertStatus(200);

        $this->assertDatabaseHas('assets', ['id' => $assetId]);
        $this->assertDatabaseMissing('asset_collection_items', ['asset_id' => $assetId]);
    }

    public function test_user_can_manage_asset_folders_without_deleting_assets(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $folder = $this->postJson('/api/asset-folders', [
            'name' => 'Creature Tokens',
        ])->assertStatus(201)
            ->assertJsonPath('name', 'Creature Tokens')
            ->assertJsonPath('slug', 'creature-tokens')
            ->json();

        $assetId = $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('creature.png', 128, 'image/png'),
            'name' => 'Creature',
            'kind' => Asset::KIND_TOKEN,
            'folder_id' => $folder['id'],
        ])->assertStatus(201)
            ->assertJsonPath('asset_folder_id', $folder['id'])
            ->json('id');

        $this->getJson('/api/asset-folders')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.asset_ids.0', (string) $assetId);

        $this->patchJson('/api/asset-folders/' . $folder['id'], [
            'name' => 'Creatures',
        ])->assertStatus(200)
            ->assertJsonPath('name', 'Creatures')
            ->assertJsonPath('slug', 'creatures');

        $this->deleteJson('/api/asset-folders/' . $folder['id'])
            ->assertStatus(200);

        $this->assertDatabaseHas('assets', [
            'id' => $assetId,
            'asset_folder_id' => null,
        ]);
        $this->assertDatabaseMissing('asset_folders', ['id' => $folder['id']]);
    }

    public function test_foreign_user_cannot_access_asset_folder_or_assign_it(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $foreign = User::factory()->create();
        $folder = AssetFolder::create([
            'user_id' => $owner->id,
            'name' => 'Owner Folder',
            'slug' => 'owner-folder',
        ]);

        Sanctum::actingAs($foreign);

        $this->getJson('/api/asset-folders/' . $folder->id)->assertStatus(404);
        $this->patchJson('/api/asset-folders/' . $folder->id, ['name' => 'Hack'])->assertStatus(404);
        $this->deleteJson('/api/asset-folders/' . $folder->id)->assertStatus(404);

        $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('token.png', 128, 'image/png'),
            'folder_id' => $folder->id,
        ])->assertStatus(404);
    }

    public function test_foreign_user_cannot_access_asset_collection(): void
    {
        $owner = User::factory()->create();
        $foreign = User::factory()->create();
        $collection = AssetCollection::create([
            'user_id' => $owner->id,
            'name' => 'Owner Pack',
            'slug' => 'owner-pack',
        ]);

        Sanctum::actingAs($foreign);

        $this->getJson('/api/asset-collections/' . $collection->id)->assertStatus(404);
        $this->patchJson('/api/asset-collections/' . $collection->id, ['name' => 'Hack'])->assertStatus(404);
        $this->deleteJson('/api/asset-collections/' . $collection->id)->assertStatus(404);
    }

    public function test_user_can_attach_asset_collections_to_supported_targets(): void
    {
        $user = User::factory()->create();
        $collectionA = AssetCollection::create([
            'user_id' => $user->id,
            'name' => 'Dungeon Tiles',
            'slug' => 'dungeon-tiles',
        ]);
        $collectionB = AssetCollection::create([
            'user_id' => $user->id,
            'name' => 'Creatures',
            'slug' => 'creatures',
        ]);
        $map = Map::create([
            'user_id' => $user->id,
            'name' => 'Ruins',
            'width' => 12,
            'height' => 12,
            'cell_size' => 32,
            'data' => [],
        ]);
        $character = Character::create([
            'user_id' => $user->id,
            'name' => 'Hero',
            'role' => 'NPC',
            'race' => 'Human',
            'level' => 1,
        ]);
        $item = Item::create([
            'user_id' => $user->id,
            'name' => 'Torch',
        ]);

        Sanctum::actingAs($user);

        $this->putJson("/api/asset-collection-targets/map/{$map->id}/collections", [
            'collection_ids' => [$collectionA->id, $collectionB->id],
        ])->assertStatus(200)
            ->assertJsonCount(2)
            ->assertJsonPath('0.id', $collectionB->id)
            ->assertJsonPath('1.id', $collectionA->id);

        $this->getJson("/api/asset-collection-targets/map/{$map->id}/collections")
            ->assertStatus(200)
            ->assertJsonCount(2);

        $this->putJson("/api/asset-collection-targets/character/{$character->id}/collections", [
            'collection_ids' => [$collectionB->id],
        ])->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $collectionB->id);

        $this->putJson("/api/asset-collection-targets/item/{$item->id}/collections", [
            'collection_ids' => [$collectionA->id],
        ])->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $collectionA->id);

        $this->putJson("/api/asset-collection-targets/map/{$map->id}/collections", [
            'collection_ids' => [$collectionA->id],
        ])->assertStatus(200)
            ->assertJsonCount(1);

        $this->assertDatabaseMissing('asset_collection_targets', [
            'target_type' => 'map',
            'target_id' => $map->id,
            'asset_collection_id' => $collectionB->id,
        ]);
    }

    public function test_asset_collection_target_assignments_are_owner_scoped(): void
    {
        $owner = User::factory()->create();
        $foreign = User::factory()->create();
        $ownerMap = Map::create([
            'user_id' => $owner->id,
            'name' => 'Owner Map',
            'width' => 12,
            'height' => 12,
            'cell_size' => 32,
            'data' => [],
        ]);
        $foreignMap = Map::create([
            'user_id' => $foreign->id,
            'name' => 'Foreign Map',
            'width' => 12,
            'height' => 12,
            'cell_size' => 32,
            'data' => [],
        ]);
        $ownerCollection = AssetCollection::create([
            'user_id' => $owner->id,
            'name' => 'Owner Pack',
            'slug' => 'owner-pack',
        ]);
        $foreignCollection = AssetCollection::create([
            'user_id' => $foreign->id,
            'name' => 'Foreign Pack',
            'slug' => 'foreign-pack',
        ]);

        Sanctum::actingAs($owner);

        $this->putJson("/api/asset-collection-targets/map/{$ownerMap->id}/collections", [
            'collection_ids' => [$foreignCollection->id],
        ])->assertStatus(404);

        $this->putJson("/api/asset-collection-targets/map/{$foreignMap->id}/collections", [
            'collection_ids' => [$ownerCollection->id],
        ])->assertStatus(404);

        $this->getJson("/api/asset-collection-targets/scenario/999/collections")
            ->assertStatus(422);
    }

    public function test_deleting_asset_collection_removes_target_assignments_only(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $collection = AssetCollection::create([
            'user_id' => $user->id,
            'name' => 'Map Pack',
            'slug' => 'map-pack',
        ]);
        $map = Map::create([
            'user_id' => $user->id,
            'name' => 'Map',
            'width' => 12,
            'height' => 12,
            'cell_size' => 32,
            'data' => [],
        ]);
        $assetId = $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('tile.png', 128, 'image/png'),
            'name' => 'Tile',
            'kind' => Asset::KIND_TILE,
            'collection_ids' => [$collection->id],
        ])->assertStatus(201)->json('id');

        $this->putJson("/api/asset-collection-targets/map/{$map->id}/collections", [
            'collection_ids' => [$collection->id],
        ])->assertStatus(200);

        $this->deleteJson('/api/asset-collections/' . $collection->id)
            ->assertStatus(200);

        $this->assertDatabaseHas('assets', ['id' => $assetId]);
        $this->assertDatabaseMissing('asset_collection_targets', ['asset_collection_id' => $collection->id]);
    }
}
