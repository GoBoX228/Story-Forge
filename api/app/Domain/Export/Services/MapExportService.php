<?php

namespace App\Domain\Export\Services;

use App\Domain\Core\Actions\FindOwnedModelAction;
use App\Domain\Core\Services\SystemTileCatalog;
use App\Domain\Export\Actions\GenerateMapPdfAction;
use App\Domain\Export\Actions\RenderMapExportHtmlAction;
use App\Domain\Export\DTO\ExportMapPdfData;
use App\Domain\Export\DTO\ExportedPdfData;
use App\Models\Asset;
use App\Models\Map as StoryMap;
use App\Models\User;
use Illuminate\Support\Collection;

class MapExportService
{
    private const PAGE_SIZES_MM = [
        'a4' => [210, 297],
        'a3' => [297, 420],
        'a2' => [420, 594],
        'a1' => [594, 841],
        'a0' => [841, 1189],
    ];

    public function __construct(
        private readonly FindOwnedModelAction $findOwnedModelAction,
        private readonly SystemTileCatalog $systemTileCatalog,
        private readonly RenderMapExportHtmlAction $renderMapExportHtmlAction,
        private readonly GenerateMapPdfAction $generateMapPdfAction,
    ) {
    }

    public function exportMapPdf(User $user, ExportMapPdfData $data): ExportedPdfData
    {
        /** @var StoryMap $map */
        $map = $this->findOwnedModelAction->execute(StoryMap::class, $user->id, $data->mapId);
        $mapExport = $this->buildMapExportData($user->id, $map, $data->pageSize, $data->orientation);

        $html = $this->renderMapExportHtmlAction->execute(
            map: $map,
            exportedAt: now(),
            mapExport: $mapExport
        );
        $pdfBytes = $this->generateMapPdfAction->execute($html, $data->pageSize, $data->orientation);
        $filename = 'map_' . $map->id . '_' . now()->format('Ymd_His') . '.pdf';

        return new ExportedPdfData(
            bytes: $pdfBytes,
            filename: $filename
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function buildMapExportData(int $userId, StoryMap $map, string $pageSize, string $orientation): array
    {
        $data = is_array($map->data) ? $map->data : [];
        $layers = $this->normalizedLayers($data);
        $assetIds = $this->collectVisibleAssetIds($layers, $data);
        $assetsById = $this->fetchOwnedAssetsById($userId, $assetIds);
        [$pageWidthMm, $pageHeightMm] = $this->pageDimensions($pageSize, $orientation);

        return [
            'pageSize' => $pageSize,
            'orientation' => $orientation,
            'pageWidthMm' => $pageWidthMm,
            'pageHeightMm' => $pageHeightMm,
            'grid' => [
                'width' => (int) $map->width,
                'height' => (int) $map->height,
                'cellSize' => (int) $map->cell_size,
                'pixelWidth' => (int) $map->width * (int) $map->cell_size,
                'pixelHeight' => (int) $map->height * (int) $map->cell_size,
            ],
            'background' => $this->backgroundExportData($layers, $data, $assetsById),
            'layers' => $this->visibleObjectLayers($layers, $map, $assetsById),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function normalizedLayers(array $data): array
    {
        if (!empty($data['layers']) && is_array($data['layers'])) {
            return collect($data['layers'])
                ->map(fn (mixed $layer, int $index): array => $this->normalizedLayer($layer, $index))
                ->sortBy('order')
                ->values()
                ->all();
        }

        $legacyObjects = is_array($data['objects'] ?? null) ? $data['objects'] : [];

        return [
            [
                'id' => 'background',
                'type' => 'background',
                'visible' => true,
                'opacity' => 1.0,
                'order' => 0,
                'objects' => [],
            ],
            [
                'id' => 'tiles',
                'type' => 'tiles',
                'visible' => true,
                'opacity' => 1.0,
                'order' => 1,
                'objects' => $legacyObjects,
            ],
            [
                'id' => 'tokens',
                'type' => 'tokens',
                'visible' => true,
                'opacity' => 1.0,
                'order' => 2,
                'objects' => [],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizedLayer(mixed $layer, int $index): array
    {
        $layer = is_array($layer) ? $layer : [];
        $type = in_array(($layer['type'] ?? ''), ['background', 'tiles', 'tokens'], true)
            ? (string) $layer['type']
            : 'tiles';

        return [
            'id' => (string) ($layer['id'] ?? $type . '-' . $index),
            'type' => $type,
            'visible' => (bool) ($layer['visible'] ?? true),
            'opacity' => max(0, min(1, (float) ($layer['opacity'] ?? 1))),
            'order' => (int) ($layer['order'] ?? $index),
            'objects' => is_array($layer['objects'] ?? null) ? $layer['objects'] : [],
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $layers
     * @return array<int, string>
     */
    private function collectVisibleAssetIds(array $layers, array $data): array
    {
        $assetIds = [];

        if ($this->backgroundVisible($layers) && !empty($data['backgroundAssetId'])) {
            $assetIds[] = (string) $data['backgroundAssetId'];
        }

        foreach ($layers as $layer) {
            if (!$layer['visible'] || $layer['type'] === 'background') {
                continue;
            }

            foreach ($layer['objects'] as $object) {
                if (is_array($object) && !empty($object['assetId'])) {
                    $assetIds[] = (string) $object['assetId'];
                }
            }
        }

        return collect($assetIds)
            ->filter(fn (string $id): bool => $id !== '')
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param array<int, string> $assetIds
     * @return array<int, Asset>
     */
    private function fetchOwnedAssetsById(int $userId, array $assetIds): array
    {
        $ownedAssetIds = collect($assetIds)
            ->filter(fn (string $id): bool => ctype_digit($id) && (int) $id > 0)
            ->map(fn (string $id): int => (int) $id)
            ->unique()
            ->values()
            ->all();

        if ($ownedAssetIds === []) {
            return [];
        }

        return Asset::query()
            ->where('user_id', $userId)
            ->whereIn('id', $ownedAssetIds)
            ->get()
            ->keyBy('id')
            ->all();
    }

    /**
     * @param array<int, array<string, mixed>> $layers
     * @param array<int, Asset> $assetsById
     * @return array{visible: bool, url: ?string}
     */
    private function backgroundExportData(array $layers, array $data, array $assetsById): array
    {
        $visible = $this->backgroundVisible($layers);
        $assetId = (string) ($data['backgroundAssetId'] ?? '');

        return [
            'visible' => $visible,
            'url' => $visible ? $this->resolveAssetUrl($assetId, $assetsById) : null,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $layers
     */
    private function backgroundVisible(array $layers): bool
    {
        foreach ($layers as $layer) {
            if ($layer['type'] === 'background') {
                return (bool) $layer['visible'];
            }
        }

        return true;
    }

    /**
     * @param array<int, array<string, mixed>> $layers
     * @param array<int, Asset> $assetsById
     * @return array<int, array<string, mixed>>
     */
    private function visibleObjectLayers(array $layers, StoryMap $map, array $assetsById): array
    {
        return collect($layers)
            ->filter(fn (array $layer): bool => $layer['visible'] && $layer['type'] !== 'background')
            ->map(fn (array $layer): array => [
                'id' => $layer['id'],
                'type' => $layer['type'],
                'opacity' => $layer['opacity'],
                'objects' => $this->objectExportData($layer['objects'], $map, $assetsById),
            ])
            ->values()
            ->all();
    }

    /**
     * @param array<int, mixed> $objects
     * @param array<int, Asset> $assetsById
     * @return array<int, array<string, mixed>>
     */
    private function objectExportData(array $objects, StoryMap $map, array $assetsById): array
    {
        return collect($objects)
            ->filter(fn (mixed $object): bool => is_array($object))
            ->map(fn (array $object): array => $this->normalizedObject($object, $map, $assetsById))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @param array<int, Asset> $assetsById
     * @return array<string, mixed>|null
     */
    private function normalizedObject(array $object, StoryMap $map, array $assetsById): ?array
    {
        $x = (int) ($object['x'] ?? -1);
        $y = (int) ($object['y'] ?? -1);
        $width = max(1, (int) ($object['width'] ?? 1));
        $height = max(1, (int) ($object['height'] ?? 1));

        if ($x < 0 || $y < 0 || $x >= $map->width || $y >= $map->height) {
            return null;
        }

        $width = min($width, (int) $map->width - $x);
        $height = min($height, (int) $map->height - $y);
        $assetId = (string) ($object['assetId'] ?? '');

        return [
            'id' => (string) ($object['id'] ?? ''),
            'type' => (string) ($object['type'] ?? 'tile'),
            'label' => (string) ($object['label'] ?? ''),
            'color' => $this->safeColor((string) ($object['color'] ?? '#9AA0A6')),
            'assetUrl' => $this->resolveAssetUrl($assetId, $assetsById),
            'x' => $x * (int) $map->cell_size + 1,
            'y' => $y * (int) $map->cell_size + 1,
            'width' => $width * (int) $map->cell_size - 2,
            'height' => $height * (int) $map->cell_size - 2,
            'rotation' => (float) ($object['rotation'] ?? 0),
            'opacity' => max(0, min(1, (float) ($object['opacity'] ?? 1))),
        ];
    }

    private function safeColor(string $color): string
    {
        return preg_match('/^#[0-9a-fA-F]{3,8}$/', $color) === 1 ? $color : '#9AA0A6';
    }

    /**
     * @param array<int, Asset> $assetsById
     */
    private function resolveAssetUrl(string $assetId, array $assetsById): ?string
    {
        if ($assetId === '') {
            return null;
        }

        if (str_starts_with($assetId, 'system:tile:')) {
            return $this->systemTileCatalog->resolveUrl($assetId, (string) config('app.url'));
        }

        if (!ctype_digit($assetId)) {
            return null;
        }

        return $assetsById[(int) $assetId]->url ?? null;
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function pageDimensions(string $pageSize, string $orientation): array
    {
        [$shortSide, $longSide] = self::PAGE_SIZES_MM[$pageSize] ?? self::PAGE_SIZES_MM['a4'];

        return $orientation === 'landscape'
            ? [$longSide, $shortSide]
            : [$shortSide, $longSide];
    }
}
