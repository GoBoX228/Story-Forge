<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\Actions\CreateModelAction;
use App\Domain\Core\Actions\DeleteModelAction;
use App\Domain\Core\Actions\UpdateModelAction;
use App\Domain\Core\DTO\ScenarioTransitionStoreData;
use App\Domain\Core\DTO\ScenarioTransitionUpdateData;
use App\Domain\Core\Support\ScenarioGraphContract;
use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\ScenarioTransition;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

class ScenarioTransitionService
{
    public function __construct(
        private readonly CreateModelAction $createModelAction,
        private readonly UpdateModelAction $updateModelAction,
        private readonly DeleteModelAction $deleteModelAction,
        private readonly ScenarioGraphContract $scenarioGraphContract,
    ) {
    }

    public function list(User $user, string $scenarioId): Collection
    {
        return $this->findOwnedScenario($user, $scenarioId)->transitions()->get();
    }

    public function create(User $user, string $scenarioId, ScenarioTransitionStoreData $data): ScenarioTransition
    {
        $scenario = $this->findOwnedScenario($user, $scenarioId);
        $payload = $data->data;

        $fromNode = $this->findScenarioNode($scenario, $payload['from_node_id']);
        $toNode = $this->findScenarioNode($scenario, $payload['to_node_id']);
        $type = $payload['type'] ?? 'linear';
        $condition = $this->scenarioGraphContract->normalizeTransitionCondition($type, $payload['condition'] ?? []);
        $metadata = $this->scenarioGraphContract->normalizeTransitionMetadata($payload['metadata'] ?? []);
        $orderIndex = $payload['order_index'] ?? (($fromNode->outgoingTransitions()->max('order_index') ?? -1) + 1);

        /** @var ScenarioTransition $transition */
        $transition = $this->createModelAction->execute(ScenarioTransition::class, [
            'scenario_id' => $scenario->id,
            'from_node_id' => $fromNode->id,
            'to_node_id' => $toNode->id,
            'type' => $type,
            'label' => $payload['label'] ?? null,
            'condition' => $condition,
            'metadata' => $metadata,
            'order_index' => $orderIndex,
        ]);

        return $transition;
    }

    public function update(User $user, string $id, ScenarioTransitionUpdateData $data): ScenarioTransition
    {
        $transition = $this->findOwnedTransition($user, $id);
        $payload = $data->data;
        $scenario = $transition->scenario;

        if (array_key_exists('from_node_id', $payload)) {
            $payload['from_node_id'] = $this->findScenarioNode($scenario, $payload['from_node_id'])->id;
        }

        if (array_key_exists('to_node_id', $payload)) {
            $payload['to_node_id'] = $this->findScenarioNode($scenario, $payload['to_node_id'])->id;
        }

        $typeChanged = array_key_exists('type', $payload);
        $effectiveType = $payload['type'] ?? $transition->type;

        if ($typeChanged || array_key_exists('condition', $payload)) {
            if ($typeChanged) {
                $payload['type'] = $effectiveType;
            }
            $condition = $payload['condition'] ?? ($typeChanged ? [] : $transition->condition);
            $payload['condition'] = $this->scenarioGraphContract->normalizeTransitionCondition($effectiveType, $condition);
        } else {
            $this->scenarioGraphContract->validateTransitionType($effectiveType);
        }

        if (array_key_exists('metadata', $payload)) {
            $payload['metadata'] = $this->scenarioGraphContract->normalizeTransitionMetadata($payload['metadata']);
        }

        $this->updateModelAction->execute($transition, $payload);

        return $transition;
    }

    public function delete(User $user, string $id): void
    {
        $transition = $this->findOwnedTransition($user, $id);
        $this->deleteModelAction->execute($transition);
    }

    private function findOwnedScenario(User $user, string $scenarioId): Scenario
    {
        /** @var Scenario $scenario */
        $scenario = Scenario::query()
            ->where('id', $scenarioId)
            ->where('user_id', $user->id)
            ->firstOrFail();

        return $scenario;
    }

    private function findOwnedTransition(User $user, string $id): ScenarioTransition
    {
        /** @var ScenarioTransition $transition */
        $transition = ScenarioTransition::query()
            ->where('id', $id)
            ->whereHas('scenario', fn ($q) => $q->where('user_id', $user->id))
            ->with('scenario')
            ->firstOrFail();

        return $transition;
    }

    private function findScenarioNode(Scenario $scenario, string|int $nodeId): ScenarioNode
    {
        /** @var ScenarioNode|null $node */
        $node = ScenarioNode::query()
            ->where('id', $nodeId)
            ->where('scenario_id', $scenario->id)
            ->first();

        if (!$node) {
            throw (new ModelNotFoundException())->setModel(ScenarioNode::class, [$nodeId]);
        }

        return $node;
    }
}
