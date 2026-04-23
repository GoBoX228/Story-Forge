<?php

namespace App\Domain\Admin\DTO;

final readonly class CreateBroadcastData
{
    public function __construct(
        public string $type,
        public string $message,
    ) {
    }
}
