<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\Actions\CreateModelAction;
use App\Domain\Core\Actions\DeleteModelAction;
use App\Domain\Core\Actions\EnsureOwnedModelExistsAction;
use App\Domain\Core\Actions\FindOwnedModelAction;
use App\Domain\Core\Actions\ListOwnedModelsAction;
use App\Domain\Core\Actions\UpdateModelAction;
use App\Domain\Core\DTO\MapIndexData;
use App\Domain\Core\DTO\MapStoreData;
use App\Domain\Core\DTO\MapUpdateData;
use App\Models\EntityLink;
use App\Models\Map;
use App\Models\User;
use Illuminate\Support\Collection;

class MapService
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

    public function list(User $user, MapIndexData $data): Collection
    {
        return $this->listOwnedModelsAction->execute(
            Map::class,
            $user->id,
            function ($query) use ($data): void {
                if ($data->hasScenarioId) {
                    $query->whereExists(function ($linkQuery) use ($data): void {
                        $linkQuery
                            ->selectRaw('1')
                            ->from('entity_links')
                            ->where('source_type', EntityLink::TARGET_SCENARIO)
                            ->where('source_id', $data->scenarioId)
                            ->where('target_type', EntityLink::TARGET_MAP)
                            ->where('relation_type', EntityLink::RELATION_USES)
                            ->whereColumn('target_id', 'maps.id');
                    });
                }
            }
        );
    }

    public function create(User $user, MapStoreData $data): Map
    {
        $payload = $data->data;

        /** @var Map $map */
        $map = $this->createModelAction->execute(Map::class, [
            'user_id' => $user->id,
            'name' => $payload['name'],
            'width' => $payload['width'],
            'height' => $payload['height'],
            'cell_size' => $payload['cell_size'],
            'data' => $payload['data'] ?? null,
        ]);

        return $map;
    }

    public function show(User $user, string $id): Map
    {
        /** @var Map $map */
        $map = $this->findOwnedModelAction->execute(Map::class, $user->id, $id);

        return $map;
    }

    public function update(User $user, string $id, MapUpdateData $data): Map
    {
        /** @var Map $map */
        $map = $this->findOwnedModelAction->execute(Map::class, $user->id, $id);

        $this->updateModelAction->execute($map, $data->data);

        return $map;
    }

    public function delete(User $user, string $id): void
    {
        /** @var Map $map */
        $map = $this->findOwnedModelAction->execute(Map::class, $user->id, $id);
        $this->deleteModelAction->execute($map);
    }
}
