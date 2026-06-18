<?php

namespace Tests\Feature;

use App\Jobs\GenerateCampaignZipExport;
use App\Models\Campaign;
use App\Models\ExportJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CampaignExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_queue_and_read_campaign_zip_export_job(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $campaign = Campaign::create([
            'user_id' => $user->id,
            'title' => 'Northern Campaign',
        ]);
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/campaigns/{$campaign->id}/export/zip", [
            'map_page_size' => 'a3',
            'map_orientation' => 'portrait',
            'duplex_edge' => 'short',
        ])->assertStatus(202)
            ->assertJsonPath('target_type', 'campaign')
            ->assertJsonPath('target_id', $campaign->id)
            ->assertJsonPath('type', ExportJob::TYPE_CAMPAIGN_ZIP)
            ->assertJsonPath('status', ExportJob::STATUS_QUEUED)
            ->assertJsonPath('options.map_page_size', 'a3');

        $jobId = $response->json('id');
        Queue::assertPushed(
            GenerateCampaignZipExport::class,
            fn (GenerateCampaignZipExport $job): bool => $job->exportJobId === $jobId
        );

        $this->getJson("/api/export-jobs/{$jobId}")
            ->assertOk()
            ->assertJsonPath('status', ExportJob::STATUS_QUEUED)
            ->assertJsonPath('download_url', null);
    }

    public function test_campaign_export_jobs_and_downloads_are_owner_scoped(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $campaign = Campaign::create([
            'user_id' => $owner->id,
            'title' => 'Owner Campaign',
        ]);
        $path = "exports/{$owner->id}/campaign.zip";
        Storage::disk('local')->put($path, 'zip-bytes');
        $job = ExportJob::create([
            'user_id' => $owner->id,
            'target_type' => 'campaign',
            'target_id' => $campaign->id,
            'type' => ExportJob::TYPE_CAMPAIGN_ZIP,
            'status' => ExportJob::STATUS_COMPLETED,
            'options' => [],
            'file_path' => $path,
            'finished_at' => now(),
        ]);

        Sanctum::actingAs($owner);
        $this->get("/api/export-jobs/{$job->id}/download")
            ->assertOk()
            ->assertHeader('content-type', 'application/zip');

        Sanctum::actingAs($intruder);
        $this->getJson("/api/export-jobs/{$job->id}")->assertNotFound();
        $this->get("/api/export-jobs/{$job->id}/download")->assertNotFound();
    }

    public function test_campaign_export_options_are_validated(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $campaign = Campaign::create([
            'user_id' => $user->id,
            'title' => 'Campaign',
        ]);
        Sanctum::actingAs($user);

        $this->postJson("/api/campaigns/{$campaign->id}/export/zip", [
            'map_page_size' => 'letter',
            'map_orientation' => 'square',
            'duplex_edge' => 'middle',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['map_page_size', 'map_orientation', 'duplex_edge']);
    }
}
