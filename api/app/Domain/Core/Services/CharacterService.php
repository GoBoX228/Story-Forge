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
use App\Models\Character;
use App\Models\CharacterGroup;
use App\Models\EntityLink;
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
                    $query->whereExists(function ($linkQuery) use ($data): void {
                        $linkQuery
                            ->selectRaw('1')
                            ->from('entity_links')
                            ->where('source_type', EntityLink::TARGET_SCENARIO)
                            ->where('source_id', $data->scenarioId)
                            ->where('target_type', EntityLink::TARGET_CHARACTER)
                            ->where('relation_type', EntityLink::RELATION_USES)
                            ->whereColumn('target_id', 'characters.id');
                    });
                }

                if ($data->hasGroupId) {
                    if ($data->groupId === null || $data->groupId === '') {
                        $query->whereNull('character_group_id');
                    } else {
                        $query->where('character_group_id', $data->groupId);
                    }
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

        if (!empty($payload['group_id'])) {
            $this->ensureOwnedModelExistsAction->execute(CharacterGroup::class, $user->id, $payload['group_id']);
        }

        /** @var Character $character */
        $character = $this->createModelAction->execute(Character::class, [
            'user_id' => $user->id,
            'character_group_id' => $payload['group_id'] ?? null,
            'name' => $payload['name'],
            'role' => $payload['role'] ?? 'NPC',
            'race' => $payload['race'] ?? null,
            'description' => $payload['description'] ?? null,
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
            array_key_exists('group_id', $data->data) &&
            $data->data['group_id'] !== null
        ) {
            $this->ensureOwnedModelExistsAction->execute(CharacterGroup::class, $user->id, $data->data['group_id']);
        }

        $payload = $data->data;
        if (array_key_exists('group_id', $payload)) {
            $payload['character_group_id'] = $payload['group_id'];
            unset($payload['group_id']);
        }

        $this->updateModelAction->execute($character, $payload);

        return $character;
    }

    public function delete(User $user, string $id): void
    {
        /** @var Character $character */
        $character = $this->findOwnedModelAction->execute(Character::class, $user->id, $id);
        $this->deleteModelAction->execute($character);
    }
}
