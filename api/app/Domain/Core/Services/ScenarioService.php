<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\Actions\CreateModelAction;
use App\Domain\Core\Actions\DeleteModelAction;
use App\Domain\Core\Actions\EnsureOwnedModelExistsAction;
use App\Domain\Core\Actions\FindOwnedModelAction;
use App\Domain\Core\Actions\ListOwnedModelsAction;
use App\Domain\Core\Actions\UpdateModelAction;
use App\Domain\Core\DTO\ScenarioIndexData;
use App\Domain\Core\DTO\ScenarioStoreData;
use App\Domain\Core\DTO\ScenarioUpdateData;
use App\Models\Campaign;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Support\Collection;

class ScenarioService
{
    public function __construct(
        private readonly ListOwnedModelsAction $listOwnedModelsAction,
        private readonly FindOwnedModelAction $findOwnedModelAction,
        private readonly CreateModelAction $createModelAction,
        private readonly UpdateModelAction $updateModelAction,
        private readonly DeleteModelAction $deleteModelAction,
        private readonly EnsureOwnedModelExistsAction $ensureOwnedModelExistsAction,
    ) {
    }

    public function list(User $user, ScenarioIndexData $data): Collection
    {
        unset($data);

        return $this->listOwnedModelsAction->execute(Scenario::class, $user->id);
    }

    public function create(User $user, ScenarioStoreData $data): Scenario
    {
        $payload = $data->data;

        if (!empty($payload['campaign_id'])) {
            $this->ensureOwnedModelExistsAction->execute(Campaign::class, $user->id, $payload['campaign_id']);
        }

        /** @var Scenario $scenario */
        $scenario = $this->createModelAction->execute(Scenario::class, [
            'user_id' => $user->id,
            'campaign_id' => $payload['campaign_id'] ?? null,
            'title' => $payload['title'],
            'description' => $payload['description'] ?? null,
        ]);

        return $scenario;
    }

    public function show(User $user, string $id): Scenario
    {
        /** @var Scenario $scenario */
        $scenario = $this->findOwnedModelAction->execute(Scenario::class, $user->id, $id);
        $scenario->load(['chapters.blocks']);

        return $scenario;
    }

    public function update(User $user, string $id, ScenarioUpdateData $data): Scenario
    {
        /** @var Scenario $scenario */
        $scenario = $this->findOwnedModelAction->execute(Scenario::class, $user->id, $id);

        if (
            array_key_exists('campaign_id', $data->data) &&
            $data->data['campaign_id'] !== null
        ) {
            $this->ensureOwnedModelExistsAction->execute(Campaign::class, $user->id, $data->data['campaign_id']);
        }

        $this->updateModelAction->execute($scenario, $data->data);

        return $scenario;
    }

    public function delete(User $user, string $id): void
    {
        /** @var Scenario $scenario */
        $scenario = $this->findOwnedModelAction->execute(Scenario::class, $user->id, $id);
        $this->deleteModelAction->execute($scenario);
    }
}

