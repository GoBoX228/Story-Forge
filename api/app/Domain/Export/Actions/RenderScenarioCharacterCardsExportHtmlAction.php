<?php

namespace App\Domain\Export\Actions;

use Carbon\CarbonInterface;

class RenderScenarioCharacterCardsExportHtmlAction
{
    public function execute(string $documentTitle, CarbonInterface $exportedAt, array $characterCardsExport): string
    {
        return view('exports.scenario-character-cards', [
            'documentTitle' => $documentTitle,
            'exportedAt' => $exportedAt,
            'characterCardsExport' => $characterCardsExport,
        ])->render();
    }
}
