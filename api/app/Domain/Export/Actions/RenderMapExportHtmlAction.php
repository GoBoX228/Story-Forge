<?php

namespace App\Domain\Export\Actions;

use App\Models\Map;
use Illuminate\Support\Carbon;

class RenderMapExportHtmlAction
{
    /**
     * @param array<string, mixed> $mapExport
     */
    public function execute(Map $map, Carbon $exportedAt, array $mapExport): string
    {
        return view('exports.map', [
            'map' => $map,
            'exportedAt' => $exportedAt,
            'mapExport' => $mapExport,
        ])->render();
    }
}
