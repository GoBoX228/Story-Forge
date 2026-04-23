<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\CampaignIndexData;

class CampaignIndexRequest extends CoreReadRequest
{
    public function toDto(): CampaignIndexData
    {
        return new CampaignIndexData();
    }
}
