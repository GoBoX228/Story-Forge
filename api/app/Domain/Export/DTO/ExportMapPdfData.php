<?php

namespace App\Domain\Export\DTO;

final readonly class ExportMapPdfData
{
    public function __construct(
        public string $mapId,
        public string $pageSize,
        public string $orientation,
    ) {
    }
}
