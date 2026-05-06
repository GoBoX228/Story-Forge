<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\Actions\CreateModelAction;
use App\Domain\Core\Actions\DeleteModelAction;
use App\Domain\Core\Actions\NextOrderIndexAction;
use App\Domain\Core\Actions\UpdateModelAction;
use App\Domain\Core\DTO\ScenarioNodeStoreData;
use App\Domain\Core\DTO\ScenarioNodeUpdateData;
use App\Domain\Core\Support\ScenarioGraphContract;
use App\Models\EntityLink;
use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\User;
use Illuminate\Support\Collection;

class ScenarioNodeService
{
    public function __construct(
        private readonly CreateModelAction $createModelAction,
        private readonly UpdateModelAction $updateModelAction,
        private readonly DeleteModelAction $deleteModelAction,
        private readonly NextOrderIndexAction $nextOrderIndexAction,
        private readonly ScenarioGraphContract $scenarioGraphContract,
    ) {
    }

    public function list(User $user, string $scenarioId): Collection
    {
        return $this->findOwnedScenario($user, $scenarioId)->nodes()->get();
    }

    public function create(User $user, string $scenarioId, ScenarioNodeStoreData $data): ScenarioNode
    {
        $scenario = $this->findOwnedScenario($user, $scenarioId);
        $payload = $data->data;
        $type = $payload['type'];
        $config = $this->scenarioGraphContract->normalizeNodeConfig($type, $payload['config'] ?? []);
        $orderIndex = $payload['order_index'] ?? $this->nextOrderIndexAction->execute($scenario->nodes());

        /** @var ScenarioNode $node */
        $node = $this->createModelAction->execute(ScenarioNode::class, [
            'scenario_id' => $scenario->id,
            'type' => $type,
            'title' => $payload['title'] ?? null,
            'content' => $payload['content'] ?? null,
            'position' => $payload['position'] ?? null,
            'config' => $config,
            'order_index' => $orderIndex,
        ]);

        return $node;
    }

    public function update(User $user, string $id, ScenarioNodeUpdateData $data): ScenarioNode
    {
        $node = $this->findOwnedNode($user, $id);
        $payload = $data->data;
        $typeChanged = array_key_exists('type', $payload);
        $effectiveType = $payload['type'] ?? $node->type;

        if ($typeChanged || array_key_exists('config', $payload)) {
            $config = $payload['config'] ?? ($typeChanged ? [] : $node->config);
            $payload['config'] = $this->scenarioGraphContract->normalizeNodeConfig($effectiveType, $config);
        } else {
            $this->scenarioGraphContract->validateNodeType($effectiveType);
        }

        $this->updateModelAction->execute($node, $payload);

        return $node;
    }

    public function delete(User $user, string $id): void
    {
        $node = $this->findOwnedNode($user, $id);
        EntityLink::query()
            ->where('source_type', EntityLink::SOURCE_SCENARIO_NODE)
            ->where('source_id', $node->id)
            ->delete();
        $this->deleteModelAction->execute($node);
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

    private function findOwnedNode(User $user, string $id): ScenarioNode
    {
        /** @var ScenarioNode $node */
        $node = ScenarioNode::query()
            ->where('id', $id)
            ->whereHas('scenario', fn ($q) => $q->where('user_id', $user->id))
            ->firstOrFail();

        return $node;
    }
}
