<?php

namespace App\Domain\Export\Actions;

use App\Models\Scenario;
use Carbon\CarbonInterface;

class RenderScenarioExportHtmlAction
{
    public function execute(Scenario $scenario, CarbonInterface $exportedAt, array $graphExport): string
    {
        return view('exports.scenario', [
            'scenario' => $scenario,
            'exportedAt' => $exportedAt,
            'graphExport' => $graphExport,
        ])->render();
    }
}
