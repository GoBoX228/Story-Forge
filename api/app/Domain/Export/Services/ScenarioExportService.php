<?php

namespace App\Domain\Export\Services;

use App\Domain\Export\Actions\FindOwnedScenarioForExportAction;
use App\Domain\Export\Actions\GenerateCharacterCardsPdfAction;
use App\Domain\Export\Actions\GenerateItemCardsPdfAction;
use App\Domain\Export\Actions\GenerateScenarioPdfAction;
use App\Domain\Export\Actions\RenderScenarioCharacterCardsExportHtmlAction;
use App\Domain\Export\Actions\RenderScenarioExportHtmlAction;
use App\Domain\Export\Actions\RenderScenarioItemCardsExportHtmlAction;
use App\Domain\Export\DTO\ExportScenarioCharacterCardsPdfData;
use App\Domain\Export\DTO\ExportScenarioItemCardsPdfData;
use App\Domain\Export\DTO\ExportScenarioPdfData;
use App\Domain\Export\DTO\ExportedPdfData;
use App\Models\Asset;
use App\Models\Character;
use App\Models\EntityLink;
use App\Models\Faction;
use App\Models\Item;
use App\Models\Location;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\ScenarioTransition;
use App\Models\User;
use App\Models\WorldEvent;
use Illuminate\Support\Collection;

class ScenarioExportService
{
    private const PRINT_CARD_SLOTS_PER_SHEET = 9;

    private const PRINT_CARD_GRID_COLUMNS = 3;

    private const PRINT_CARD_GRID_ROWS = 3;

    public function __construct(
        private readonly FindOwnedScenarioForExportAction $findOwnedScenarioForExportAction,
        private readonly RenderScenarioExportHtmlAction $renderScenarioExportHtmlAction,
        private readonly GenerateScenarioPdfAction $generateScenarioPdfAction,
        private readonly RenderScenarioCharacterCardsExportHtmlAction $renderScenarioCharacterCardsExportHtmlAction,
        private readonly GenerateCharacterCardsPdfAction $generateCharacterCardsPdfAction,
        private readonly RenderScenarioItemCardsExportHtmlAction $renderScenarioItemCardsExportHtmlAction,
        private readonly GenerateItemCardsPdfAction $generateItemCardsPdfAction,
    ) {
    }

    public function exportScenarioPdf(User $user, ExportScenarioPdfData $data): ExportedPdfData
    {
        $scenario = $this->findOwnedScenarioForExportAction->execute($user->id, $data->scenarioId);
        $graphExport = $this->buildGraphExportData($user->id, $scenario);

        $html = $this->renderScenarioExportHtmlAction->execute(
            scenario: $scenario,
            exportedAt: now(),
            graphExport: $graphExport
        );
        $pdfBytes = $this->generateScenarioPdfAction->execute($html);
        $filename = 'scenario_' . $scenario->id . '_' . now()->format('Ymd_His') . '.pdf';

        return new ExportedPdfData(
            bytes: $pdfBytes,
            filename: $filename
        );
    }

    public function exportScenarioCharacterCardsPdf(User $user, ExportScenarioCharacterCardsPdfData $data): ExportedPdfData
    {
        $scenario = $this->findOwnedScenarioForExportAction->execute($user->id, $data->scenarioId);
        $characterCardsExport = $this->buildCharacterCardsExportData($user->id, $scenario, $data->duplexEdge);

        $html = $this->renderScenarioCharacterCardsExportHtmlAction->execute(
            scenario: $scenario,
            exportedAt: now(),
            characterCardsExport: $characterCardsExport
        );
        $pdfBytes = $this->generateCharacterCardsPdfAction->execute($html);
        $filename = 'scenario_' . $scenario->id . '_character_cards_' . now()->format('Ymd_His') . '.pdf';

        return new ExportedPdfData(
            bytes: $pdfBytes,
            filename: $filename
        );
    }

    public function exportScenarioItemCardsPdf(User $user, ExportScenarioItemCardsPdfData $data): ExportedPdfData
    {
        $scenario = $this->findOwnedScenarioForExportAction->execute($user->id, $data->scenarioId);
        $itemCardsExport = $this->buildItemCardsExportData($user->id, $scenario, $data->duplexEdge);

        $html = $this->renderScenarioItemCardsExportHtmlAction->execute(
            scenario: $scenario,
            exportedAt: now(),
            itemCardsExport: $itemCardsExport
        );
        $pdfBytes = $this->generateItemCardsPdfAction->execute($html);
        $filename = 'scenario_' . $scenario->id . '_item_cards_' . now()->format('Ymd_His') . '.pdf';

        return new ExportedPdfData(
            bytes: $pdfBytes,
            filename: $filename
        );
    }

    /**
     * @return array{
     *     duplexEdge: string,
     *     cards: array<int, array<string, mixed>>,
     *     sheets: array<int, array<string, mixed>>
     * }
     */
    private function buildItemCardsExportData(int $userId, Scenario $scenario, string $duplexEdge): array
    {
        $items = $this->fetchScenarioCompositionItems($userId, $scenario);

        $cards = $items
            ->map(fn (Item $item): array => $this->buildItemCardData($item))
            ->values()
            ->all();

        return [
            'duplexEdge' => $duplexEdge,
            'cards' => $cards,
            'sheets' => $this->buildItemCardSheets($cards, $duplexEdge),
        ];
    }

    /**
     * @return Collection<int, Item>
     */
    private function fetchScenarioCompositionItems(int $userId, Scenario $scenario): Collection
    {
        $links = EntityLink::query()
            ->where('source_type', EntityLink::TARGET_SCENARIO)
            ->where('source_id', $scenario->id)
            ->where('target_type', EntityLink::TARGET_ITEM)
            ->where('relation_type', EntityLink::RELATION_USES)
            ->orderBy('id')
            ->get();

        $itemIds = $links
            ->pluck('target_id')
            ->map(fn (mixed $id): int => (int) $id)
            ->filter(fn (int $id): bool => $id > 0)
            ->unique()
            ->values();

        if ($itemIds->isEmpty()) {
            return collect();
        }

        $itemsById = Item::query()
            ->where('user_id', $userId)
            ->whereIn('id', $itemIds)
            ->get()
            ->keyBy('id');

        return $itemIds
            ->map(fn (int $id): ?Item => $itemsById->get($id))
            ->filter()
            ->values();
    }

    /**
     * @return array<string, mixed>
     */
    private function buildItemCardData(Item $item): array
    {
        $modifiers = $this->itemModifierRows($item);

        return [
            'id' => $item->id,
            'name' => $item->name,
            'type' => $item->type,
            'rarity' => $item->rarity,
            'accentColor' => $this->itemAccentColor($item->rarity),
            'description' => trim((string) ($item->description ?? '')),
            'shortDescription' => $this->shortText((string) ($item->description ?? ''), 160),
            'weight' => (float) $item->weight,
            'value' => (int) $item->value,
            'modifiers' => $modifiers,
        ];
    }

    /**
     * @return array<int, array{label: string, value: string}>
     */
    private function itemModifierRows(Item $item): array
    {
        $modifiers = is_array($item->modifiers) ? $item->modifiers : [];

        return collect($modifiers)
            ->map(function (mixed $modifier): ?array {
                if (!is_array($modifier)) {
                    return null;
                }

                $label = trim((string) ($modifier['stat'] ?? $modifier['label'] ?? $modifier['name'] ?? ''));
                $value = $modifier['value'] ?? $modifier['amount'] ?? null;

                if ($label === '' || $value === null || trim((string) $value) === '') {
                    return null;
                }

                return [
                    'label' => $label,
                    'value' => $this->formatStatValue($value),
                ];
            })
            ->filter()
            ->take(9)
            ->values()
            ->all();
    }

    private function itemAccentColor(string $rarity): string
    {
        return match (mb_strtolower($rarity)) {
            'обычный', 'common' => '#8A8F98',
            'необычный', 'uncommon' => '#2EC4B6',
            'редкий', 'rare' => '#4361EE',
            'эпический', 'epic' => '#8338EC',
            'легендарный', 'legendary' => '#FFC300',
            default => '#4361EE',
        };
    }

    /**
     * @param array<int, array<string, mixed>> $cards
     * @return array<int, array<string, mixed>>
     */
    private function buildItemCardSheets(array $cards, string $duplexEdge): array
    {
        return collect(array_chunk($cards, self::PRINT_CARD_SLOTS_PER_SHEET))
            ->map(function (array $chunk, int $index) use ($duplexEdge): array {
                $frontSlots = array_pad(array_values($chunk), self::PRINT_CARD_SLOTS_PER_SHEET, null);
                $backSlots = array_fill(0, self::PRINT_CARD_SLOTS_PER_SHEET, null);

                foreach ($frontSlots as $slotIndex => $card) {
                    if ($card === null) {
                        continue;
                    }

                    $backSlots[$this->mirroredPrintCardSlotIndex($slotIndex, $duplexEdge)] = $card;
                }

                return [
                    'number' => $index + 1,
                    'frontSlots' => $frontSlots,
                    'backSlots' => $backSlots,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array{
     *     duplexEdge: string,
     *     cards: array<int, array<string, mixed>>,
     *     sheets: array<int, array<string, mixed>>
     * }
     */
    private function buildCharacterCardsExportData(int $userId, Scenario $scenario, string $duplexEdge): array
    {
        $characters = $this->fetchScenarioCompositionCharacters($userId, $scenario);
        $inventoryItemsById = $this->fetchInventoryItems($userId, $characters);
        $portraitAssetsByCharacterId = $this->fetchPortraitAssetsByCharacterId($userId, $characters);

        $cards = $characters
            ->map(fn (Character $character): array => $this->buildCharacterCardData(
                character: $character,
                inventoryItemsById: $inventoryItemsById,
                portraitAssetsByCharacterId: $portraitAssetsByCharacterId
            ))
            ->values()
            ->all();

        return [
            'duplexEdge' => $duplexEdge,
            'cards' => $cards,
            'sheets' => $this->buildCharacterCardSheets($cards, $duplexEdge),
        ];
    }

    /**
     * @return Collection<int, Character>
     */
    private function fetchScenarioCompositionCharacters(int $userId, Scenario $scenario): Collection
    {
        $links = EntityLink::query()
            ->where('source_type', EntityLink::TARGET_SCENARIO)
            ->where('source_id', $scenario->id)
            ->where('target_type', EntityLink::TARGET_CHARACTER)
            ->where('relation_type', EntityLink::RELATION_USES)
            ->orderBy('id')
            ->get();

        $characterIds = $links
            ->pluck('target_id')
            ->map(fn (mixed $id): int => (int) $id)
            ->filter(fn (int $id): bool => $id > 0)
            ->unique()
            ->values();

        if ($characterIds->isEmpty()) {
            return collect();
        }

        $charactersById = Character::query()
            ->where('user_id', $userId)
            ->whereIn('id', $characterIds)
            ->get()
            ->keyBy('id');

        return $characterIds
            ->map(fn (int $id): ?Character => $charactersById->get($id))
            ->filter()
            ->values();
    }

    /**
     * @param Collection<int, Character> $characters
     * @return array<int, Item>
     */
    private function fetchInventoryItems(int $userId, Collection $characters): array
    {
        $itemIds = $characters
            ->flatMap(fn (Character $character): array => is_array($character->inventory) ? $character->inventory : [])
            ->map(fn (mixed $id): int => (int) $id)
            ->filter(fn (int $id): bool => $id > 0)
            ->unique()
            ->values();

        if ($itemIds->isEmpty()) {
            return [];
        }

        return Item::query()
            ->where('user_id', $userId)
            ->whereIn('id', $itemIds)
            ->get()
            ->keyBy('id')
            ->all();
    }

    /**
     * @param Collection<int, Character> $characters
     * @return array<int, Asset>
     */
    private function fetchPortraitAssetsByCharacterId(int $userId, Collection $characters): array
    {
        $characterIds = $characters->pluck('id')->values();

        if ($characterIds->isEmpty()) {
            return [];
        }

        $portraitLinks = EntityLink::query()
            ->where('source_type', EntityLink::TARGET_CHARACTER)
            ->whereIn('source_id', $characterIds)
            ->where('target_type', EntityLink::TARGET_ASSET)
            ->where('relation_type', EntityLink::RELATION_USES)
            ->orderBy('id')
            ->get()
            ->filter(fn (EntityLink $link): bool => ($link->metadata['role'] ?? null) === 'portrait');

        if ($portraitLinks->isEmpty()) {
            return [];
        }

        $assetsById = Asset::query()
            ->where('user_id', $userId)
            ->whereIn('id', $portraitLinks->pluck('target_id'))
            ->get()
            ->keyBy('id');

        $portraitsByCharacterId = [];
        foreach ($portraitLinks as $link) {
            if (isset($portraitsByCharacterId[$link->source_id])) {
                continue;
            }

            $asset = $assetsById->get($link->target_id);
            if ($asset !== null) {
                $portraitsByCharacterId[$link->source_id] = $asset;
            }
        }

        return $portraitsByCharacterId;
    }

    /**
     * @param array<int, Item> $inventoryItemsById
     * @param array<int, Asset> $portraitAssetsByCharacterId
     * @return array<string, mixed>
     */
    private function buildCharacterCardData(
        Character $character,
        array $inventoryItemsById,
        array $portraitAssetsByCharacterId
    ): array {
        $inventoryRows = $this->characterInventoryRows($character, $inventoryItemsById);

        return [
            'id' => $character->id,
            'name' => $character->name,
            'role' => $character->role ?: 'NPC',
            'accentColor' => $this->characterAccentColor($character->role ?: 'NPC'),
            'description' => trim((string) ($character->description ?? '')),
            'shortDescription' => $this->shortText((string) ($character->description ?? ''), 180),
            'stats' => $this->characterStatsRows($character),
            'inventory' => $inventoryRows,
            'inventoryCount' => count(is_array($character->inventory) ? $character->inventory : []),
            'inventoryWeight' => array_sum(array_map(
                fn (array $row): float => (float) $row['weight'],
                $inventoryRows
            )),
            'portraitUrl' => $portraitAssetsByCharacterId[$character->id]->url ?? null,
        ];
    }

    /**
     * @return array<int, array{label: string, value: string, displayValue: string}>
     */
    private function characterStatsRows(Character $character): array
    {
        $stats = is_array($character->stats) ? $character->stats : [];

        return collect($stats)
            ->map(fn (mixed $value, mixed $label): array => [
                'label' => (string) $label,
                'value' => is_numeric($value) ? (string) (int) $value : trim((string) $value),
                'displayValue' => $this->formatStatValue($value),
            ])
            ->filter(fn (array $row): bool => $row['label'] !== '' && $row['value'] !== '')
            ->take(9)
            ->values()
            ->all();
    }

    private function formatStatValue(mixed $value): string
    {
        if (!is_numeric($value)) {
            return trim((string) $value);
        }

        $number = (int) $value;

        return $number >= 0 ? '+' . $number : (string) $number;
    }

    private function characterAccentColor(string $role): string
    {
        return match (mb_strtolower($role)) {
            'герой', 'hero' => '#FFC300',
            'монстр', 'monster' => '#E63946',
            'npc' => '#8338EC',
            default => '#4361EE',
        };
    }

    /**
     * @param array<int, Item> $inventoryItemsById
     * @return array<int, array{name: string, type: string, rarity: string, weight: float, value: int}>
     */
    private function characterInventoryRows(Character $character, array $inventoryItemsById): array
    {
        $inventoryIds = is_array($character->inventory) ? $character->inventory : [];

        return collect($inventoryIds)
            ->map(function (mixed $id) use ($inventoryItemsById): ?array {
                $item = $inventoryItemsById[(int) $id] ?? null;
                if ($item === null) {
                    return null;
                }

                return [
                    'name' => $item->name,
                    'type' => $item->type,
                    'rarity' => $item->rarity,
                    'weight' => (float) $item->weight,
                    'value' => (int) $item->value,
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @param array<int, array<string, mixed>> $cards
     * @return array<int, array<string, mixed>>
     */
    private function buildCharacterCardSheets(array $cards, string $duplexEdge): array
    {
        return collect(array_chunk($cards, self::PRINT_CARD_SLOTS_PER_SHEET))
            ->map(function (array $chunk, int $index) use ($duplexEdge): array {
                $frontSlots = array_pad(array_values($chunk), self::PRINT_CARD_SLOTS_PER_SHEET, null);
                $backSlots = array_fill(0, self::PRINT_CARD_SLOTS_PER_SHEET, null);

                foreach ($frontSlots as $slotIndex => $card) {
                    if ($card === null) {
                        continue;
                    }

                    $backSlots[$this->mirroredPrintCardSlotIndex($slotIndex, $duplexEdge)] = $card;
                }

                return [
                    'number' => $index + 1,
                    'frontSlots' => $frontSlots,
                    'backSlots' => $backSlots,
                ];
            })
            ->values()
            ->all();
    }

    private function mirroredPrintCardSlotIndex(int $slotIndex, string $duplexEdge): int
    {
        $row = intdiv($slotIndex, self::PRINT_CARD_GRID_COLUMNS);
        $column = $slotIndex % self::PRINT_CARD_GRID_COLUMNS;

        if ($duplexEdge === 'short') {
            return (self::PRINT_CARD_GRID_ROWS - 1 - $row) * self::PRINT_CARD_GRID_COLUMNS + $column;
        }

        return $row * self::PRINT_CARD_GRID_COLUMNS + (self::PRINT_CARD_GRID_COLUMNS - 1 - $column);
    }

    /**
     * @return array{
     *     enabled: bool,
     *     diagnostics: array<string, mixed>,
     *     linkedMaterialsByNodeId: array<int, array<int, array<string, mixed>>>,
     *     nodeConfigByNodeId: array<int, array<int, array{label: string, value: string}>>,
     *     linkedMaterials: array<int, array<string, mixed>>,
     *     graphMap: array<string, mixed>
     * }
     */
    private function buildGraphExportData(int $userId, Scenario $scenario): array
    {
        $nodes = $scenario->nodes;
        $transitions = $scenario->transitions;

        $links = EntityLink::query()
            ->where('source_type', EntityLink::SOURCE_SCENARIO_NODE)
            ->whereIn('source_id', $nodes->pluck('id'))
            ->where('relation_type', EntityLink::RELATION_RELATED)
            ->orderBy('target_type')
            ->orderBy('id')
            ->get();

        $materialsByType = $this->fetchLinkedMaterials($userId, $links);
        $linkedMaterialsByNodeId = [];
        $linkedMaterials = [];
        $nodeConfigByNodeId = [];

        foreach ($links as $link) {
            $material = $materialsByType[$link->target_type][$link->target_id] ?? null;
            if ($material === null) {
                continue;
            }

            $entry = [
                'type' => $link->target_type,
                'id' => $link->target_id,
                'label' => $link->label,
                'title' => $this->materialTitle($link->target_type, $material),
                'description' => $this->materialDescription($link->target_type, $material),
            ];

            $linkedMaterialsByNodeId[$link->source_id] = [
                ...($linkedMaterialsByNodeId[$link->source_id] ?? []),
                $entry,
            ];
            $linkedMaterials[$link->target_type . ':' . $link->target_id] = $entry;
        }

        foreach ($nodes as $node) {
            $nodeConfigByNodeId[$node->id] = $this->nodeConfigSummary($node, $materialsByType);
        }

        return [
            'enabled' => true,
            'diagnostics' => $this->buildDiagnostics($nodes, $transitions),
            'linkedMaterialsByNodeId' => $linkedMaterialsByNodeId,
            'nodeConfigByNodeId' => $nodeConfigByNodeId,
            'linkedMaterials' => array_values($linkedMaterials),
            'graphMap' => $this->buildGraphMap($nodes, $transitions),
        ];
    }

    /**
     * @param Collection<int, ScenarioNode> $nodes
     * @param Collection<int, ScenarioTransition> $transitions
     * @return array{nodes: array<int, array<string, mixed>>, transitions: array<int, array<string, mixed>>, bounds: array<string, float|int>|null}
     */
    private function buildGraphMap(Collection $nodes, Collection $transitions): array
    {
        $mapNodes = [];
        $bounds = null;

        foreach ($nodes as $node) {
            $nodeBounds = $this->nodeMapBounds($node);

            if ($nodeBounds === null) {
                continue;
            }

            $mapNode = [
                'id' => $node->id,
                'number' => $node->order_index + 1,
                'title' => $node->title ?: 'Узел ' . ($node->order_index + 1),
                'shortTitle' => $this->shortText($node->title ?: 'Узел ' . ($node->order_index + 1), 32),
                'type' => $node->type,
                ...$nodeBounds,
            ];

            $mapNodes[$node->id] = $mapNode;
            $bounds = $this->extendGraphBounds($bounds, $nodeBounds);
        }

        $mapTransitions = [];

        foreach ($transitions as $transition) {
            if (!isset($mapNodes[$transition->from_node_id], $mapNodes[$transition->to_node_id])) {
                continue;
            }

            $mapTransitions[] = [
                'id' => $transition->id,
                'from' => $transition->from_node_id,
                'to' => $transition->to_node_id,
                'type' => $transition->type,
                'label' => $transition->label,
            ];
        }

        return [
            'nodes' => array_values($mapNodes),
            'transitions' => $mapTransitions,
            'bounds' => $bounds,
        ];
    }

    /**
     * @return array{x: float, y: float, width: float, height: float}|null
     */
    private function nodeMapBounds(ScenarioNode $node): ?array
    {
        $position = $node->position ?? [];
        $x = $this->finiteNumber($position['x'] ?? null);
        $y = $this->finiteNumber($position['y'] ?? null);

        if ($x === null || $y === null) {
            return null;
        }

        return [
            'x' => max(0, $x),
            'y' => max(0, $y),
            'width' => max(120, min(420, $this->finiteNumber($position['width'] ?? null) ?? 190)),
            'height' => max(70, min(260, $this->finiteNumber($position['height'] ?? null) ?? 92)),
        ];
    }

    private function finiteNumber(mixed $value): ?float
    {
        if (!is_numeric($value)) {
            return null;
        }

        $number = (float) $value;

        return is_finite($number) ? $number : null;
    }

    /**
     * @param array<string, float|int>|null $bounds
     * @param array{x: float, y: float, width: float, height: float} $nodeBounds
     * @return array<string, float|int>
     */
    private function extendGraphBounds(?array $bounds, array $nodeBounds): array
    {
        $minX = $nodeBounds['x'];
        $minY = $nodeBounds['y'];
        $maxX = $nodeBounds['x'] + $nodeBounds['width'];
        $maxY = $nodeBounds['y'] + $nodeBounds['height'];

        if ($bounds === null) {
            return [
                'minX' => $minX,
                'minY' => $minY,
                'maxX' => $maxX,
                'maxY' => $maxY,
                'width' => $nodeBounds['width'],
                'height' => $nodeBounds['height'],
            ];
        }

        $nextMinX = min((float) $bounds['minX'], $minX);
        $nextMinY = min((float) $bounds['minY'], $minY);
        $nextMaxX = max((float) $bounds['maxX'], $maxX);
        $nextMaxY = max((float) $bounds['maxY'], $maxY);

        return [
            'minX' => $nextMinX,
            'minY' => $nextMinY,
            'maxX' => $nextMaxX,
            'maxY' => $nextMaxY,
            'width' => $nextMaxX - $nextMinX,
            'height' => $nextMaxY - $nextMinY,
        ];
    }

    private function shortText(string $value, int $limit): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', $value) ?? $value);

        if (mb_strlen($text) <= $limit) {
            return $text;
        }

        return rtrim(mb_substr($text, 0, max(1, $limit - 1))) . '…';
    }

    /**
     * @param Collection<int, EntityLink> $links
     * @return array<string, array<int, object>>
     */
    private function fetchLinkedMaterials(int $userId, Collection $links): array
    {
        return [
            EntityLink::TARGET_MAP => Map::query()
                ->where('user_id', $userId)
                ->whereIn('id', $links->where('target_type', EntityLink::TARGET_MAP)->pluck('target_id'))
                ->get()
                ->keyBy('id')
                ->all(),
            EntityLink::TARGET_CHARACTER => Character::query()
                ->where('user_id', $userId)
                ->whereIn('id', $links->where('target_type', EntityLink::TARGET_CHARACTER)->pluck('target_id'))
                ->get()
                ->keyBy('id')
                ->all(),
            EntityLink::TARGET_ITEM => Item::query()
                ->where('user_id', $userId)
                ->whereIn('id', $links->where('target_type', EntityLink::TARGET_ITEM)->pluck('target_id'))
                ->get()
                ->keyBy('id')
                ->all(),
            EntityLink::TARGET_ASSET => Asset::query()
                ->where('user_id', $userId)
                ->whereIn('id', $links->where('target_type', EntityLink::TARGET_ASSET)->pluck('target_id'))
                ->get()
                ->keyBy('id')
                ->all(),
            EntityLink::TARGET_LOCATION => Location::query()
                ->where('user_id', $userId)
                ->whereIn('id', $links->where('target_type', EntityLink::TARGET_LOCATION)->pluck('target_id'))
                ->get()
                ->keyBy('id')
                ->all(),
            EntityLink::TARGET_FACTION => Faction::query()
                ->where('user_id', $userId)
                ->whereIn('id', $links->where('target_type', EntityLink::TARGET_FACTION)->pluck('target_id'))
                ->get()
                ->keyBy('id')
                ->all(),
            EntityLink::TARGET_EVENT => WorldEvent::query()
                ->where('user_id', $userId)
                ->whereIn('id', $links->where('target_type', EntityLink::TARGET_EVENT)->pluck('target_id'))
                ->get()
                ->keyBy('id')
                ->all(),
        ];
    }

    private function materialTitle(string $type, object $material): string
    {
        return match ($type) {
            EntityLink::TARGET_MAP => $material->name,
            EntityLink::TARGET_CHARACTER => $material->name,
            EntityLink::TARGET_ITEM => $material->name,
            EntityLink::TARGET_ASSET => $material->name,
            EntityLink::TARGET_LOCATION => $material->name,
            EntityLink::TARGET_FACTION => $material->name,
            EntityLink::TARGET_EVENT => $material->title,
            default => 'Материал #' . $material->id,
        };
    }

    private function materialDescription(string $type, object $material): ?string
    {
        return match ($type) {
            EntityLink::TARGET_CHARACTER, EntityLink::TARGET_ITEM => $material->description,
            EntityLink::TARGET_MAP => sprintf('%dx%d', $material->width, $material->height),
            EntityLink::TARGET_ASSET => $material->mime_type,
            EntityLink::TARGET_LOCATION, EntityLink::TARGET_FACTION, EntityLink::TARGET_EVENT => $material->description,
            default => null,
        };
    }

    /**
     * @param array<string, array<int, object>> $materialsByType
     * @return array<int, array{label: string, value: string}>
     */
    private function nodeConfigSummary(ScenarioNode $node, array $materialsByType): array
    {
        $config = $node->config ?? [];

        return match ($node->type) {
            'description' => $this->compactConfigRows([
                ['label' => 'Сцена', 'value' => $config['scene'] ?? null],
            ]),
            'dialog' => $this->compactConfigRows([
                [
                    'label' => 'Говорящий',
                    'value' => $this->linkedMaterialName(
                        $materialsByType,
                        EntityLink::TARGET_CHARACTER,
                        $config['speaker_entity_id'] ?? null
                    ) ?: ($config['speaker'] ?? null),
                ],
            ]),
            'location' => $this->compactConfigRows([
                ['label' => 'Ориентир', 'value' => $config['map_hint'] ?? null],
            ]),
            'check' => $this->compactConfigRows([
                ['label' => 'Навык', 'value' => $config['skill'] ?? null],
                ['label' => 'DC', 'value' => $config['dc'] ?? null],
            ]),
            'loot' => $this->compactConfigRows([
                [
                    'label' => 'Награда',
                    'value' => $this->linkedMaterialNames(
                        $materialsByType,
                        EntityLink::TARGET_ITEM,
                        is_array($config['reward_item_ids'] ?? null) ? $config['reward_item_ids'] : []
                    ) ?: ($config['item_hint'] ?? null),
                ],
            ]),
            'combat' => $this->compactConfigRows([
                ['label' => 'Столкновение', 'value' => $config['encounter'] ?? null],
            ]),
            default => [],
        };
    }

    /**
     * @param array<int, array{label: string, value: mixed}> $rows
     * @return array<int, array{label: string, value: string}>
     */
    private function compactConfigRows(array $rows): array
    {
        return collect($rows)
            ->map(fn (array $row): array => [
                'label' => $row['label'],
                'value' => trim((string) ($row['value'] ?? '')),
            ])
            ->filter(fn (array $row): bool => $row['value'] !== '')
            ->values()
            ->all();
    }

    /**
     * @param array<string, array<int, object>> $materialsByType
     */
    private function linkedMaterialName(array $materialsByType, string $type, mixed $id): ?string
    {
        if ($id === null || $id === '') {
            return null;
        }

        $material = $materialsByType[$type][(int) $id] ?? null;

        return $material ? $this->materialTitle($type, $material) : null;
    }

    /**
     * @param array<string, array<int, object>> $materialsByType
     * @param array<int, mixed> $ids
     */
    private function linkedMaterialNames(array $materialsByType, string $type, array $ids): ?string
    {
        $names = collect($ids)
            ->map(fn (mixed $id): ?string => $this->linkedMaterialName($materialsByType, $type, $id))
            ->filter()
            ->values()
            ->all();

        return $names === [] ? null : implode(', ', $names);
    }

    /**
     * @param Collection<int, ScenarioNode> $nodes
     * @param Collection<int, ScenarioTransition> $transitions
     * @return array<string, mixed>
     */
    private function buildDiagnostics(Collection $nodes, Collection $transitions): array
    {
        $nodeById = $nodes->keyBy('id');
        $incoming = $nodes->mapWithKeys(fn (ScenarioNode $node): array => [$node->id => 0])->all();
        $outgoing = $nodes->mapWithKeys(fn (ScenarioNode $node): array => [$node->id => 0])->all();
        $errors = [];
        $warnings = [];

        if ($nodes->isEmpty()) {
            $errors[] = 'Граф сценария пуст.';
        }

        foreach ($transitions as $transition) {
            if (!$nodeById->has($transition->from_node_id) || !$nodeById->has($transition->to_node_id)) {
                $errors[] = 'Переход #' . $transition->id . ' ссылается на отсутствующий узел.';
                continue;
            }

            $outgoing[$transition->from_node_id]++;
            $incoming[$transition->to_node_id]++;
        }

        $startNodes = $nodes->filter(fn (ScenarioNode $node): bool => ($incoming[$node->id] ?? 0) === 0)->values();
        $finalNodes = $nodes->filter(fn (ScenarioNode $node): bool => ($outgoing[$node->id] ?? 0) === 0)->values();

        if ($startNodes->isEmpty()) {
            $errors[] = 'В графе нет стартового узла без входящих переходов.';
        }
        if ($finalNodes->isEmpty()) {
            $errors[] = 'В графе нет финального узла без исходящих переходов.';
        }
        if ($startNodes->count() > 1) {
            $warnings[] = 'В графе несколько стартовых узлов.';
        }
        if ($finalNodes->count() > 1) {
            $warnings[] = 'В графе несколько финальных узлов.';
        }

        foreach ($nodes as $node) {
            if (($incoming[$node->id] ?? 0) === 0 && ($outgoing[$node->id] ?? 0) === 0) {
                $warnings[] = $this->nodeTitle($node) . ': изолированный узел.';
            }
            if ($this->hasIncompleteTypedConfig($node)) {
                $warnings[] = $this->nodeTitle($node) . ': не заполнены важные поля узла.';
            }
        }

        $duplicateGroups = [];
        $outgoingByNode = [];

        foreach ($transitions as $transition) {
            if (!$nodeById->has($transition->from_node_id) || !$nodeById->has($transition->to_node_id)) {
                continue;
            }

            $fromNode = $nodeById->get($transition->from_node_id);
            if (in_array($transition->type, ['success', 'failure'], true) && $fromNode->type !== 'check') {
                $errors[] = 'Переход "' . ($transition->label ?: '#' . $transition->id) . '" успеха/провала выходит не из проверки.';
            }
            if ($transition->type !== 'linear' && trim((string) $transition->label) === '') {
                $warnings[] = 'Нелинейный переход #' . $transition->id . ' не имеет метки.';
            }

            $duplicateKey = implode('::', [
                $transition->from_node_id,
                $transition->to_node_id,
                $transition->type,
                mb_strtolower(trim((string) $transition->label)),
            ]);
            $duplicateGroups[$duplicateKey] = [...($duplicateGroups[$duplicateKey] ?? []), $transition];
            $outgoingByNode[$transition->from_node_id] = [...($outgoingByNode[$transition->from_node_id] ?? []), $transition];
        }

        foreach ($nodes->where('type', 'check') as $node) {
            $nodeTransitions = $outgoingByNode[$node->id] ?? [];
            $hasSuccess = collect($nodeTransitions)->contains(fn (ScenarioTransition $transition): bool => $transition->type === 'success');
            $hasFailure = collect($nodeTransitions)->contains(fn (ScenarioTransition $transition): bool => $transition->type === 'failure');

            if (!$hasSuccess || !$hasFailure) {
                $errors[] = $this->nodeTitle($node) . ': проверка должна иметь переходы успеха и провала.';
            }
        }

        foreach ($duplicateGroups as $group) {
            if (count($group) > 1) {
                $warnings[] = 'Найдены дублирующиеся переходы с одинаковой целью, типом и меткой.';
                break;
            }
        }

        return [
            'errors' => $errors,
            'warnings' => $warnings,
            'startNodes' => $startNodes->map(fn (ScenarioNode $node): string => $this->nodeTitle($node))->all(),
            'finalNodes' => $finalNodes->map(fn (ScenarioNode $node): string => $this->nodeTitle($node))->all(),
        ];
    }

    private function nodeTitle(ScenarioNode $node): string
    {
        return '#' . ($node->order_index + 1) . ' ' . ($node->title ?: 'Узел ' . ($node->order_index + 1));
    }

    private function hasIncompleteTypedConfig(ScenarioNode $node): bool
    {
        $config = $node->config ?? [];

        return match ($node->type) {
            'description' => trim((string) ($config['scene'] ?? '')) === '',
            'dialog' => trim((string) ($config['speaker_entity_id'] ?? '')) === ''
                && trim((string) ($config['speaker'] ?? '')) === '',
            'location' => trim((string) ($config['map_hint'] ?? '')) === '',
            'check' => trim((string) ($config['skill'] ?? '')) === ''
                || !is_numeric($config['dc'] ?? null)
                || (int) $config['dc'] < 1
                || (int) $config['dc'] > 40,
            'loot' => (empty($config['reward_item_ids']) || !is_array($config['reward_item_ids']))
                && trim((string) ($config['item_hint'] ?? '')) === '',
            'combat' => trim((string) ($config['encounter'] ?? '')) === '',
            default => false,
        };
    }
}
