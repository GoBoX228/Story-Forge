<?php

namespace App\Domain\Export\Actions;

use App\Models\Scenario;
use Carbon\CarbonInterface;

class RenderScenarioCharacterCardsExportHtmlAction
{
    public function execute(Scenario $scenario, CarbonInterface $exportedAt, array $characterCardsExport): string
    {
        return view('exports.scenario-character-cards', [
            'scenario' => $scenario,
            'exportedAt' => $exportedAt,
            'characterCardsExport' => $characterCardsExport,
        ])->render();
    }
}

