<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Campaign;
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
        $campaign = Campaign::create([
            'user_id' => $user->id,
            'title' => 'Asset Campaign',
            'description' => 'Campaign',
            'tags' => [],
            'resources' => [],
            'progress' => 0,
            'last_played' => now()->toDateString(),
        ]);

        Sanctum::actingAs($user);

        $upload = $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('token.png', 256, 'image/png'),
            'name' => 'Hero Token',
            'type' => Asset::TYPE_TOKEN,
            'campaign_id' => $campaign->id,
        ]);

        $upload->assertStatus(201)
            ->assertJsonPath('name', 'Hero Token')
            ->assertJsonPath('type', Asset::TYPE_TOKEN)
            ->assertJsonPath('campaign_id', $campaign->id)
            ->assertJsonPath('mime_type', 'image/png');

        $assetId = $upload->json('id');
        $assetPath = $upload->json('path');
        $this->assertNotEmpty($assetPath);
        Storage::disk('public')->assertExists($assetPath);

        $this->getJson('/api/assets')
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $assetId);

        $this->getJson('/api/assets?type=token')
            ->assertStatus(200)
            ->assertJsonCount(1);

        $this->getJson('/api/assets/' . $assetId)
            ->assertStatus(200)
            ->assertJsonPath('id', $assetId);

        $this->patchJson('/api/assets/' . $assetId, [
            'name' => 'Updated Token',
            'type' => Asset::TYPE_IMAGE,
            'campaign_id' => null,
        ])->assertStatus(200)
            ->assertJsonPath('name', 'Updated Token')
            ->assertJsonPath('type', Asset::TYPE_IMAGE)
            ->assertJsonPath('campaign_id', null);

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

    public function test_asset_upload_rejects_foreign_campaign_and_invalid_file(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $foreign = User::factory()->create();
        $foreignCampaign = Campaign::create([
            'user_id' => $foreign->id,
            'title' => 'Foreign Campaign',
            'description' => 'Foreign',
            'tags' => [],
            'resources' => [],
            'progress' => 0,
            'last_played' => now()->toDateString(),
        ]);

        Sanctum::actingAs($user);

        $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('map.png', 128, 'image/png'),
            'campaign_id' => $foreignCampaign->id,
        ])->assertStatus(404);

        $this->post('/api/assets', [
            'name' => 'No File',
        ])->assertStatus(302);

        $this->post('/api/assets', [
            'file' => UploadedFile::fake()->create('huge.bin', 10241),
        ])->assertStatus(302);
    }
}
