<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\DTO\WorldEntityIndexData;
use App\Models\Chronicle;
use App\Models\User;
use App\Models\WorldEvent;
use Illuminate\Database\Eloquent\Builder;

class WorldEventService extends WorldEntityService
{
    protected function modelClass(): string
    {
        return WorldEvent::class;
    }

    protected function searchColumn(): string
    {
        return 'title';
    }

    protected function applyAdditionalFilters(Builder $query, WorldEntityIndexData $data): void
    {
        if ($data->chronicleId !== null && $data->chronicleId !== '') {
            $query->where('chronicle_id', $data->chronicleId);
        }
    }

    protected function validateAdditionalPayload(User $user, array $payload): void
    {
        if (!empty($payload['chronicle_id'])) {
            $this->ensureOwned(Chronicle::class, $user->id, $payload['chronicle_id']);
        }
    }
}
