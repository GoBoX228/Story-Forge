<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\Actions\CreateModelAction;
use App\Domain\Core\Actions\DeleteModelAction;
use App\Domain\Core\Actions\FindOwnedModelAction;
use App\Domain\Core\Actions\ListOwnedModelsAction;
use App\Domain\Core\Actions\SyncCampaignOnModelAction;
use App\Domain\Core\Actions\UpdateModelAction;
use App\Domain\Core\Actions\ValidateOwnedIdsAction;
use App\Domain\Core\DTO\CampaignIndexData;
use App\Domain\Core\DTO\CampaignStoreData;
use App\Domain\Core\DTO\CampaignUpdateData;
use App\Models\Campaign;
use App\Models\Character;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Support\Collection;

class CampaignService
{
    public function __construct(
        private readonly ListOwnedModelsAction $listOwnedModelsAction,
        private readonly FindOwnedModelAction $findOwnedModelAction,
        private readonly CreateModelAction $createModelAction,
        private readonly UpdateModelAction $updateModelAction,
        private readonly DeleteModelAction $deleteModelAction,
        private readonly ValidateOwnedIdsAction $validateOwnedIdsAction,
        private readonly SyncCampaignOnModelAction $syncCampaignOnModelAction,
    ) {
    }

    public function list(User $user, CampaignIndexData $data): Collection
    {
        unset($data);

        /** @var Collection<int, Campaign> $campaigns */
        $campaigns = $this->listOwnedModelsAction->execute(
            Campaign::class,
            $user->id,
            fn ($query) => $query->with(['scenarios:id,campaign_id', 'maps:id,campaign_id', 'characters:id,campaign_id'])
        );

        return $campaigns;
    }

    public function create(User $user, CampaignStoreData $data): Campaign
    {
        $payload = $data->data;

        /** @var Campaign $campaign */
        $campaign = $this->createModelAction->execute(Campaign::class, [
            'user_id' => $user->id,
            'title' => $payload['title'],
            'description' => $payload['description'] ?? null,
            'tags' => $payload['tags'] ?? [],
            'resources' => $payload['resources'] ?? [],
            'progress' => $payload['progress'] ?? 0,
            'last_played' => $payload['last_played'] ?? now()->toDateString(),
        ]);

        $this->syncRelations($campaign, $payload, $user->id);

        $campaign->load(['scenarios:id,campaign_id', 'maps:id,campaign_id', 'characters:id,campaign_id']);

        return $campaign;
    }

    public function show(User $user, string $id): Campaign
    {
        /** @var Campaign $campaign */
        $campaign = $this->findOwnedModelAction->execute(Campaign::class, $user->id, $id);
        $campaign->load(['scenarios:id,campaign_id', 'maps:id,campaign_id', 'characters:id,campaign_id']);

        return $campaign;
    }

    public function update(User $user, string $id, CampaignUpdateData $data): Campaign
    {
        /** @var Campaign $campaign */
        $campaign = $this->findOwnedModelAction->execute(Campaign::class, $user->id, $id);

        $payload = [];
        foreach (['title', 'description', 'tags', 'resources', 'progress', 'last_played'] as $field) {
            if (array_key_exists($field, $data->data)) {
                $payload[$field] = $data->data[$field];
            }
        }

        if ($payload !== []) {
            $this->updateModelAction->execute($campaign, $payload);
        }

        $this->syncRelations($campaign, $data->data, $user->id);

        $campaign->load(['scenarios:id,campaign_id', 'maps:id,campaign_id', 'characters:id,campaign_id']);

        return $campaign;
    }

    public function delete(User $user, string $id): void
    {
        /** @var Campaign $campaign */
        $campaign = $this->findOwnedModelAction->execute(Campaign::class, $user->id, $id);

        $this->syncCampaignOnModelAction->execute(Scenario::class, $campaign->id, [], $user->id);
        $this->syncCampaignOnModelAction->execute(Map::class, $campaign->id, [], $user->id);
        $this->syncCampaignOnModelAction->execute(Character::class, $campaign->id, [], $user->id);

        $this->deleteModelAction->execute($campaign);
    }

    private function syncRelations(Campaign $campaign, array $payload, int $userId): void
    {
        if (array_key_exists('scenario_ids', $payload)) {
            $ids = $this->validateOwnedIdsAction->execute(
                Scenario::class,
                $payload['scenario_ids'] ?? [],
                $userId,
                'scenario_ids'
            );
            $this->syncCampaignOnModelAction->execute(Scenario::class, $campaign->id, $ids, $userId);
        }

        if (array_key_exists('map_ids', $payload)) {
            $ids = $this->validateOwnedIdsAction->execute(
                Map::class,
                $payload['map_ids'] ?? [],
                $userId,
                'map_ids'
            );
            $this->syncCampaignOnModelAction->execute(Map::class, $campaign->id, $ids, $userId);
        }

        if (array_key_exists('character_ids', $payload)) {
            $ids = $this->validateOwnedIdsAction->execute(
                Character::class,
                $payload['character_ids'] ?? [],
                $userId,
                'character_ids'
            );
            $this->syncCampaignOnModelAction->execute(Character::class, $campaign->id, $ids, $userId);
        }
    }
}

