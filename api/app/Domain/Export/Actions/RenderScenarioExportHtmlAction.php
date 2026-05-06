<?php

namespace App\Domain\Export\Actions;

use App\Models\Scenario;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class RenderScenarioExportHtmlAction
{
    public function execute(Scenario $scenario, Collection $maps, CarbonInterface $exportedAt, array $graphExport): string
    {
        return view('exports.scenario', [
            'scenario' => $scenario,
            'maps' => $maps,
            'exportedAt' => $exportedAt,
            'graphExport' => $graphExport,
        ])->render();
    }
}
