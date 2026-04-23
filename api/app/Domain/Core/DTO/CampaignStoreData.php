<?php

namespace App\Domain\Core\DTO;

final readonly class CampaignStoreData
{
    public function __construct(
        public array $data,
    ) {
    }
}
