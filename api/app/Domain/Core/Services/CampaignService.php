<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\Actions\CreateModelAction;
use App\Domain\Core\Actions\DeleteModelAction;
use App\Domain\Core\Actions\FindOwnedModelAction;
use App\Domain\Core\Actions\ListOwnedModelsAction;
use App\Domain\Core\Actions\UpdateModelAction;
use App\Domain\Core\DTO\CampaignIndexData;
use App\Domain\Core\DTO\CampaignStoreData;
use App\Domain\Core\DTO\CampaignUpdateData;
use App\Models\Campaign;
use App\Models\EntityLink;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CampaignService
{
    public function __construct(
        private readonly ListOwnedModelsAction $listOwnedModelsAction,
        private readonly FindOwnedModelAction $findOwnedModelAction,
        private readonly CreateModelAction $createModelAction,
        private readonly UpdateModelAction $updateModelAction,
        private readonly DeleteModelAction $deleteModelAction,
    ) {
    }

    public function list(User $user, CampaignIndexData $data): Collection
    {
        unset($data);

        /** @var Collection<int, Campaign> $campaigns */
        $campaigns = $this->listOwnedModelsAction->execute(
            Campaign::class,
            $user->id,
            fn ($query) => $query->with(['scenarios:id,campaign_id', 'materialLinks'])
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
        ]);

        $campaign->load(['scenarios:id,campaign_id', 'materialLinks']);

        return $campaign;
    }

    public function show(User $user, string $id): Campaign
    {
        /** @var Campaign $campaign */
        $campaign = $this->findOwnedModelAction->execute(Campaign::class, $user->id, $id);
        $campaign->load(['scenarios:id,campaign_id', 'materialLinks']);

        return $campaign;
    }

    public function update(User $user, string $id, CampaignUpdateData $data): Campaign
    {
        /** @var Campaign $campaign */
        $campaign = $this->findOwnedModelAction->execute(Campaign::class, $user->id, $id);

        $payload = [];
        foreach (['title', 'description'] as $field) {
            if (array_key_exists($field, $data->data)) {
                $payload[$field] = $data->data[$field];
            }
        }

        if ($payload !== []) {
            $this->updateModelAction->execute($campaign, $payload);
        }

        $campaign->load(['scenarios:id,campaign_id', 'materialLinks']);

        return $campaign;
    }

    public function delete(User $user, string $id): void
    {
        /** @var Campaign $campaign */
        $campaign = $this->findOwnedModelAction->execute(Campaign::class, $user->id, $id);

        EntityLink::query()
            ->where('source_type', EntityLink::TARGET_CAMPAIGN)
            ->where('source_id', $campaign->id)
            ->delete();
        DB::table('taggables')
            ->where('taggable_type', EntityLink::TARGET_CAMPAIGN)
            ->where('taggable_id', $campaign->id)
            ->delete();

        $this->deleteModelAction->execute($campaign);
    }
}
