<?php

namespace App\Domain\Export\Services;

use App\Domain\Export\Actions\FetchOwnedScenarioMapsAction;
use App\Domain\Export\Actions\FindOwnedScenarioForExportAction;
use App\Domain\Export\Actions\GenerateScenarioPdfAction;
use App\Domain\Export\Actions\RenderScenarioExportHtmlAction;
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
    public function __construct(
        private readonly FindOwnedScenarioForExportAction $findOwnedScenarioForExportAction,
        private readonly FetchOwnedScenarioMapsAction $fetchOwnedScenarioMapsAction,
        private readonly RenderScenarioExportHtmlAction $renderScenarioExportHtmlAction,
        private readonly GenerateScenarioPdfAction $generateScenarioPdfAction,
    ) {
    }

    public function exportScenarioPdf(User $user, ExportScenarioPdfData $data): ExportedPdfData
    {
        $scenario = $this->findOwnedScenarioForExportAction->execute($user->id, $data->scenarioId);
        $scenarioMaps = $this->fetchOwnedScenarioMapsAction->execute($user->id, $scenario->id);
        $graphExport = $this->buildGraphExportData($user->id, $scenario);

        $html = $this->renderScenarioExportHtmlAction->execute(
            scenario: $scenario,
            maps: $scenarioMaps,
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

    /**
     * @return array{
     *     enabled: bool,
     *     diagnostics: array<string, mixed>,
     *     linkedMaterialsByNodeId: array<int, array<int, array<string, mixed>>>,
     *     linkedMaterials: array<int, array<string, mixed>>
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

        return [
            'enabled' => true,
            'diagnostics' => $this->buildDiagnostics($nodes, $transitions),
            'linkedMaterialsByNodeId' => $linkedMaterialsByNodeId,
            'linkedMaterials' => array_values($linkedMaterials),
        ];
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
            $errors[] = 'Р“СЂР°С„ СЃС†РµРЅР°СЂРёСЏ РїСѓСЃС‚.';
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
                $warnings[] = $this->nodeTitle($node) . ': не заполнены важные typed-поля.';
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
                $warnings[] = 'Найдены дублирующие переходы с одинаковой целью, типом и меткой.';
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
            'dialog' => trim((string) ($config['speaker'] ?? '')) === '',
            'location' => trim((string) ($config['map_hint'] ?? '')) === '',
            'check' => trim((string) ($config['skill'] ?? '')) === ''
                || !is_numeric($config['dc'] ?? null)
                || (int) $config['dc'] < 1
                || (int) $config['dc'] > 40,
            'loot' => trim((string) ($config['item_hint'] ?? '')) === '',
            'combat' => trim((string) ($config['encounter'] ?? '')) === '',
            default => false,
        };
    }
}
