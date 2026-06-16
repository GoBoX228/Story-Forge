<?php

namespace App\Domain\Export\Actions;

use App\Models\Scenario;
use Carbon\CarbonInterface;

class RenderScenarioItemCardsExportHtmlAction
{
    public function execute(Scenario $scenario, CarbonInterface $exportedAt, array $itemCardsExport): string
    {
        return view('exports.scenario-item-cards', [
            'scenario' => $scenario,
            'exportedAt' => $exportedAt,
            'itemCardsExport' => $itemCardsExport,
        ])->render();
    }
}
