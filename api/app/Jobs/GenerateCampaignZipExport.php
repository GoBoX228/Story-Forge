<?php

namespace App\Jobs;

use App\Domain\Export\Services\CampaignExportService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class GenerateCampaignZipExport implements ShouldQueue
{
    use Queueable;

    public int $timeout = 1200;

    public int $tries = 1;

    public function __construct(
        public readonly int $exportJobId,
    ) {
        $this->onQueue('exports');
    }

    public function handle(CampaignExportService $campaignExportService): void
    {
        $campaignExportService->generate($this->exportJobId);
    }
}
