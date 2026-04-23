<?php

namespace App\Domain\Export\DTO;

final readonly class ExportedPdfData
{
    public function __construct(
        public string $bytes,
        public string $filename,
    ) {
    }
}

