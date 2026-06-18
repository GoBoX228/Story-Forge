<?php

namespace App\Domain\Export\DTO;

final readonly class ExportCampaignZipData
{
    public function __construct(
        public string $campaignId,
        public string $mapPageSize,
        public string $mapOrientation,
        public string $duplexEdge,
    ) {
    }

    /**
     * @return array<string, string>
     */
    public function options(): array
    {
        return [
            'map_page_size' => $this->mapPageSize,
            'map_orientation' => $this->mapOrientation,
            'duplex_edge' => $this->duplexEdge,
        ];
    }
}
