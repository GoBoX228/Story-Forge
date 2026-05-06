<?php

namespace App\Domain\Core\DTO;

use Illuminate\Http\UploadedFile;

final readonly class AssetStoreData
{
    public function __construct(
        public UploadedFile $file,
        public ?string $name,
        public ?string $type,
        public mixed $campaignId,
    ) {
    }
}
