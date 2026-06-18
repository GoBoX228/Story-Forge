<?php

namespace App\Domain\Export\Services;

use App\Domain\Core\Actions\FindOwnedModelAction;
use App\Domain\Export\DTO\ExportCampaignZipData;
use App\Domain\Export\DTO\ExportMapPdfData;
use App\Domain\Export\DTO\ExportScenarioPdfData;
use App\Jobs\GenerateCampaignZipExport;
use App\Models\Campaign;
use App\Models\Character;
use App\Models\EntityLink;
use App\Models\ExportJob;
use App\Models\Item;
use App\Models\Map as StoryMap;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;
use ZipArchive;

class CampaignExportService
{
    public function __construct(
        private readonly FindOwnedModelAction $findOwnedModelAction,
        private readonly ScenarioExportService $scenarioExportService,
        private readonly MapExportService $mapExportService,
    ) {
    }

    public function queue(User $user, ExportCampaignZipData $data): ExportJob
    {
        /** @var Campaign $campaign */
        $campaign = $this->findOwnedModelAction->execute(Campaign::class, $user->id, $data->campaignId);

        $job = ExportJob::query()->create([
            'user_id' => $user->id,
            'target_type' => EntityLink::TARGET_CAMPAIGN,
            'target_id' => $campaign->id,
            'type' => ExportJob::TYPE_CAMPAIGN_ZIP,
            'status' => ExportJob::STATUS_QUEUED,
            'options' => $data->options(),
        ]);

        GenerateCampaignZipExport::dispatch($job->id);

        return $job;
    }

    public function findOwnedJob(User $user, string $id): ExportJob
    {
        return ExportJob::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();
    }

    public function generate(int $exportJobId): void
    {
        /** @var ExportJob $job */
        $job = ExportJob::query()->findOrFail($exportJobId);
        $job->update([
            'status' => ExportJob::STATUS_RUNNING,
            'started_at' => now(),
            'finished_at' => null,
            'error' => null,
        ]);

        try {
            /** @var User $user */
            $user = User::query()->findOrFail($job->user_id);
            /** @var Campaign $campaign */
            $campaign = Campaign::query()
                ->where('id', $job->target_id)
                ->where('user_id', $user->id)
                ->firstOrFail();

            $relativePath = $this->generateArchive($user, $campaign, $job->options ?? [], $job->id);

            $job->update([
                'status' => ExportJob::STATUS_COMPLETED,
                'file_path' => $relativePath,
                'finished_at' => now(),
            ]);
        } catch (Throwable $error) {
            $job->update([
                'status' => ExportJob::STATUS_FAILED,
                'error' => mb_substr($error->getMessage(), 0, 4000),
                'finished_at' => now(),
            ]);

            throw $error;
        }
    }

    /**
     * @param array<string, mixed> $options
     */
    private function generateArchive(User $user, Campaign $campaign, array $options, int $exportJobId): string
    {
        $relativePath = 'exports/' . $user->id . '/campaign_' . $campaign->id . '_' . $exportJobId . '.zip';
        Storage::disk('local')->makeDirectory(dirname($relativePath));
        $absolutePath = Storage::disk('local')->path($relativePath);

        $archive = new ZipArchive();
        if ($archive->open($absolutePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Не удалось создать ZIP-архив кампании.');
        }

        try {
            $scenarios = Scenario::query()
                ->where('user_id', $user->id)
                ->where('campaign_id', $campaign->id)
                ->orderBy('title')
                ->orderBy('id')
                ->get();

            foreach ($scenarios as $index => $scenario) {
                $pdf = $this->scenarioExportService->exportScenarioPdf(
                    $user,
                    new ExportScenarioPdfData((string) $scenario->id)
                );
                $archive->addFromString(
                    'scenarios/' . $this->numberedFilename($index, $scenario->title) . '.pdf',
                    $pdf->bytes
                );
            }

            $scenarioIds = $scenarios->pluck('id')->map(fn (mixed $id): int => (int) $id)->all();
            $mapIds = $this->campaignMaterialIds($campaign->id, $scenarioIds, EntityLink::TARGET_MAP);
            $characterIds = $this->campaignMaterialIds($campaign->id, $scenarioIds, EntityLink::TARGET_CHARACTER);
            $itemIds = $this->campaignMaterialIds($campaign->id, $scenarioIds, EntityLink::TARGET_ITEM);

            $maps = $this->ownedMaterials(StoryMap::class, $user->id, $mapIds);
            foreach ($maps as $index => $map) {
                $pdf = $this->mapExportService->exportMapPdf(
                    $user,
                    new ExportMapPdfData(
                        mapId: (string) $map->id,
                        pageSize: (string) ($options['map_page_size'] ?? 'a4'),
                        orientation: (string) ($options['map_orientation'] ?? 'landscape'),
                    )
                );
                $archive->addFromString(
                    'maps/' . $this->numberedFilename($index, $map->name) . '.pdf',
                    $pdf->bytes
                );
            }

            $characters = $this->ownedMaterials(Character::class, $user->id, $characterIds);
            if ($characters->isNotEmpty()) {
                $pdf = $this->scenarioExportService->exportCharacterCardsForMaterials(
                    user: $user,
                    documentTitle: $campaign->title,
                    characters: $characters,
                    duplexEdge: (string) ($options['duplex_edge'] ?? 'long'),
                    filename: 'characters.pdf'
                );
                $archive->addFromString('cards/characters.pdf', $pdf->bytes);
            }

            $items = $this->ownedMaterials(Item::class, $user->id, $itemIds);
            if ($items->isNotEmpty()) {
                $pdf = $this->scenarioExportService->exportItemCardsForMaterials(
                    documentTitle: $campaign->title,
                    items: $items,
                    duplexEdge: (string) ($options['duplex_edge'] ?? 'long'),
                    filename: 'items.pdf'
                );
                $archive->addFromString('cards/items.pdf', $pdf->bytes);
            }
        } finally {
            $archive->close();
        }

        return $relativePath;
    }

    /**
     * @param array<int, int> $scenarioIds
     * @return array<int, int>
     */
    private function campaignMaterialIds(int $campaignId, array $scenarioIds, string $targetType): array
    {
        return EntityLink::query()
            ->where('target_type', $targetType)
            ->where('relation_type', EntityLink::RELATION_USES)
            ->where(function ($query) use ($campaignId, $scenarioIds): void {
                $query->where(function ($campaignQuery) use ($campaignId): void {
                    $campaignQuery
                        ->where('source_type', EntityLink::TARGET_CAMPAIGN)
                        ->where('source_id', $campaignId);
                });

                if ($scenarioIds !== []) {
                    $query->orWhere(function ($scenarioQuery) use ($scenarioIds): void {
                        $scenarioQuery
                            ->where('source_type', EntityLink::TARGET_SCENARIO)
                            ->whereIn('source_id', $scenarioIds);
                    });
                }
            })
            ->orderBy('id')
            ->pluck('target_id')
            ->map(fn (mixed $id): int => (int) $id)
            ->filter(fn (int $id): bool => $id > 0)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param class-string<StoryMap|Character|Item> $modelClass
     * @param array<int, int> $ids
     * @return Collection<int, StoryMap|Character|Item>
     */
    private function ownedMaterials(string $modelClass, int $userId, array $ids): Collection
    {
        if ($ids === []) {
            return collect();
        }

        $materialsById = $modelClass::query()
            ->where('user_id', $userId)
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        return collect($ids)
            ->map(fn (int $id): mixed => $materialsById->get($id))
            ->filter()
            ->values();
    }

    private function numberedFilename(int $index, string $title): string
    {
        $safeTitle = preg_replace('/[\\\\\\/:*?"<>|]+/u', '-', trim($title)) ?: 'material';

        return str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT)
            . '_'
            . Str::limit($safeTitle, 100, '');
    }
}
