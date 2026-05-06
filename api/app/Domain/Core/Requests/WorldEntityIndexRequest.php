<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\WorldEntityIndexData;

class WorldEntityIndexRequest extends CoreReadRequest
{
    public function rules(): array
    {
        return [
            'campaignId' => ['nullable', 'integer'],
            'campaign_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:255'],
            'q' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function toDto(): WorldEntityIndexData
    {
        return new WorldEntityIndexData(
            $this->input('campaign_id', $this->input('campaignId')),
            $this->input('search', $this->input('q'))
        );
    }
}
