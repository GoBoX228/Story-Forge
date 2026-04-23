<?php

namespace App\Domain\Core\DTO;

final readonly class CampaignUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
