<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\AssetIndexData;
use App\Models\Asset;

class AssetIndexRequest extends CoreReadRequest
{
    public function rules(): array
    {
        return [
            'type' => ['nullable', 'string', 'in:' . implode(',', Asset::TYPES)],
            'campaignId' => ['nullable', 'integer'],
            'campaign_id' => ['nullable', 'integer'],
        ];
    }

    public function toDto(): AssetIndexData
    {
        return new AssetIndexData(
            $this->input('type'),
            $this->input('campaign_id', $this->input('campaignId'))
        );
    }
}
