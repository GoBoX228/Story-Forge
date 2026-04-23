<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\Actions\CreateModelAction;
use App\Domain\Core\Actions\DeleteModelAction;
use App\Domain\Core\Actions\EnsureOwnedModelExistsAction;
use App\Domain\Core\Actions\FindOwnedModelAction;
use App\Domain\Core\Actions\ListOwnedModelsAction;
use App\Domain\Core\Actions\UpdateModelAction;
use App\Domain\Core\DTO\CharacterIndexData;
use App\Domain\Core\DTO\CharacterStoreData;
use App\Domain\Core\DTO\CharacterUpdateData;
use App\Models\Campaign;
use App\Models\Character;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Support\Collection;

class CharacterService
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

    public function list(User $user, CharacterIndexData $data): Collection
    {
        return $this->listOwnedModelsAction->execute(
            Character::class,
            $user->id,
            function ($query) use ($data): void {
                if ($data->hasScenarioId) {
                    $query->where('scenario_id', $data->scenarioId);
                }

                if ($data->hasSearch) {
                    $searchPattern = '%' . $data->search . '%';

                    if ($query->getConnection()->getDriverName() === 'pgsql') {
                        $query->where('name', 'ilike', $searchPattern);
                    } else {
                        $query->whereRaw('LOWER(name) LIKE ?', ['%' . mb_strtolower($data->search) . '%']);
                    }
                }
            }
        );
    }

    public function create(User $user, CharacterStoreData $data): Character
    {
        $payload = $data->data;

        if (!empty($payload['scenario_id'])) {
            $this->ensureOwnedModelExistsAction->execute(Scenario::class, $user->id, $payload['scenario_id']);
        }

        if (!empty($payload['campaign_id'])) {
            $this->ensureOwnedModelExistsAction->execute(Campaign::class, $user->id, $payload['campaign_id']);
        }

        /** @var Character $character */
        $character = $this->createModelAction->execute(Character::class, [
            'user_id' => $user->id,
            'campaign_id' => $payload['campaign_id'] ?? null,
            'scenario_id' => $payload['scenario_id'] ?? null,
            'name' => $payload['name'],
            'role' => $payload['role'] ?? 'NPC',
            'race' => $payload['race'] ?? null,
            'description' => $payload['description'] ?? null,
            'level' => $payload['level'] ?? 1,
            'stats' => $payload['stats'] ?? null,
            'inventory' => $payload['inventory'] ?? null,
        ]);

        return $character;
    }

    public function update(User $user, string $id, CharacterUpdateData $data): Character
    {
        /** @var Character $character */
        $character = $this->findOwnedModelAction->execute(Character::class, $user->id, $id);

        if (
            array_key_exists('scenario_id', $data->data) &&
            $data->data['scenario_id'] !== null
        ) {
            $this->ensureOwnedModelExistsAction->execute(Scenario::class, $user->id, $data->data['scenario_id']);
        }

        if (
            array_key_exists('campaign_id', $data->data) &&
            $data->data['campaign_id'] !== null
        ) {
            $this->ensureOwnedModelExistsAction->execute(Campaign::class, $user->id, $data->data['campaign_id']);
        }

        $this->updateModelAction->execute($character, $data->data);

        return $character;
    }

    public function delete(User $user, string $id): void
    {
        /** @var Character $character */
        $character = $this->findOwnedModelAction->execute(Character::class, $user->id, $id);
        $this->deleteModelAction->execute($character);
    }
}
