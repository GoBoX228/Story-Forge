<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\Actions\CreateModelAction;
use App\Domain\Core\Actions\DeleteModelAction;
use App\Domain\Core\Actions\EnsureOwnedModelExistsAction;
use App\Domain\Core\Actions\FindOwnedModelAction;
use App\Domain\Core\Actions\ListOwnedModelsAction;
use App\Domain\Core\Actions\UpdateModelAction;
use App\Domain\Core\DTO\WorldEntityIndexData;
use App\Domain\Core\DTO\WorldEntityStoreData;
use App\Domain\Core\DTO\WorldEntityUpdateData;
use App\Models\Campaign;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

abstract class WorldEntityService
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

    abstract protected function modelClass(): string;

    abstract protected function searchColumn(): string;

    public function list(User $user, WorldEntityIndexData $data): Collection
    {
        return $this->listOwnedModelsAction->execute(
            $this->modelClass(),
            $user->id,
            function ($query) use ($data): void {
                if ($data->campaignId !== null && $data->campaignId !== '') {
                    $query->where('campaign_id', $data->campaignId);
                }

                $search = trim((string) $data->search);
                if ($search !== '') {
                    $query->where($this->searchColumn(), 'like', '%' . $search . '%');
                }
            }
        );
    }

    public function create(User $user, WorldEntityStoreData $data): Model
    {
        $payload = $data->data;

        if (!empty($payload['campaign_id'])) {
            $this->ensureOwnedModelExistsAction->execute(Campaign::class, $user->id, $payload['campaign_id']);
        }

        /** @var Model $model */
        $model = $this->createModelAction->execute($this->modelClass(), [
            ...$payload,
            'user_id' => $user->id,
            'campaign_id' => $payload['campaign_id'] ?? null,
            'metadata' => $payload['metadata'] ?? [],
        ]);

        return $model;
    }

    public function show(User $user, string $id): Model
    {
        return $this->findOwnedModelAction->execute($this->modelClass(), $user->id, $id);
    }

    public function update(User $user, string $id, WorldEntityUpdateData $data): Model
    {
        $model = $this->findOwnedModelAction->execute($this->modelClass(), $user->id, $id);

        if (
            array_key_exists('campaign_id', $data->data) &&
            $data->data['campaign_id'] !== null
        ) {
            $this->ensureOwnedModelExistsAction->execute(Campaign::class, $user->id, $data->data['campaign_id']);
        }

        $this->updateModelAction->execute($model, $data->data);

        return $model->fresh();
    }

    public function delete(User $user, string $id): void
    {
        $model = $this->findOwnedModelAction->execute($this->modelClass(), $user->id, $id);
        $this->deleteModelAction->execute($model);
    }
}
