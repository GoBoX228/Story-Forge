<?php

namespace App\Domain\Export\Actions;

use Carbon\CarbonInterface;

class RenderScenarioItemCardsExportHtmlAction
{
    public function execute(string $documentTitle, CarbonInterface $exportedAt, array $itemCardsExport): string
    {
        return view('exports.scenario-item-cards', [
            'documentTitle' => $documentTitle,
            'exportedAt' => $exportedAt,
            'itemCardsExport' => $itemCardsExport,
        ])->render();
    }
}
