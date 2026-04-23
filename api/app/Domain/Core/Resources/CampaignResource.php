<?php

namespace App\Domain\Core\Resources;

use App\Models\Campaign;

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
            'tags' => $campaign->tags ?? [],
            'resources' => $campaign->resources ?? [],
            'progress' => $campaign->progress ?? 0,
            'last_played' => optional($campaign->last_played)->toDateString(),
            'scenario_ids' => $campaign->scenarios->pluck('id')->values(),
            'map_ids' => $campaign->maps->pluck('id')->values(),
            'character_ids' => $campaign->characters->pluck('id')->values(),
            'created_at' => $campaign->created_at,
            'updated_at' => $campaign->updated_at,
        ];
    }
}
