<?php

namespace App\Domain\Core\Resources;

use App\Models\Campaign;
use App\Models\EntityLink;

class CampaignResource extends BaseCoreResource
{
    public function toArray($request): array
    {
        /** @var Campaign $campaign */
        $campaign = $this->resource;

        return [
            'id' => $campaign->id,
            'title' => $campaign->title,
            'description' => $campaign->description,
            'scenario_ids' => $campaign->scenarios->pluck('id')->values(),
            'map_ids' => $this->materialIds($campaign, EntityLink::TARGET_MAP),
            'character_ids' => $this->materialIds($campaign, EntityLink::TARGET_CHARACTER),
            'item_ids' => $this->materialIds($campaign, EntityLink::TARGET_ITEM),
            'created_at' => $campaign->created_at,
            'updated_at' => $campaign->updated_at,
        ];
    }

    private function materialIds(Campaign $campaign, string $targetType): mixed
    {
        return $campaign->materialLinks
            ->where('target_type', $targetType)
            ->pluck('target_id')
            ->map(fn (mixed $id): int => (int) $id)
            ->values();
    }
}
