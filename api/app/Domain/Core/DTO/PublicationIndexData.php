<?php

namespace App\Domain\Core\DTO;

final readonly class PublicationIndexData
{
    public function __construct(
        public ?string $scope,
        public ?string $type,
        public ?string $status,
        public ?string $visibility,
        public ?string $search,
    ) {
    }
}
