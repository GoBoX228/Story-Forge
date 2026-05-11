<?php

namespace App\Domain\Core\DTO;

final readonly class AssetFolderUpdateData
{
    public function __construct(
        public array $data,
    ) {
    }
}
