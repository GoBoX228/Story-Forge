<?php

namespace App\Domain\Export\Services;

use App\Domain\Export\Actions\FetchOwnedScenarioMapsAction;
use App\Domain\Export\Actions\FindOwnedScenarioForExportAction;
use App\Domain\Export\Actions\GenerateScenarioPdfAction;
use App\Domain\Export\Actions\RenderScenarioExportHtmlAction;
use App\Domain\Export\DTO\ExportScenarioPdfData;
use App\Domain\Export\DTO\ExportedPdfData;
use App\Models\User;

class ScenarioExportService
{
    public function __construct(
        private readonly FindOwnedScenarioForExportAction $findOwnedScenarioForExportAction,
        private readonly FetchOwnedScenarioMapsAction $fetchOwnedScenarioMapsAction,
        private readonly RenderScenarioExportHtmlAction $renderScenarioExportHtmlAction,
        private readonly GenerateScenarioPdfAction $generateScenarioPdfAction,
    ) {
    }

    public function exportScenarioPdf(User $user, ExportScenarioPdfData $data): ExportedPdfData
    {
        $scenario = $this->findOwnedScenarioForExportAction->execute($user->id, $data->scenarioId);
        $maps = $this->fetchOwnedScenarioMapsAction->execute($user->id, $scenario->id);

        $html = $this->renderScenarioExportHtmlAction->execute(
            scenario: $scenario,
            maps: $maps,
            exportedAt: now()
        );
        $pdfBytes = $this->generateScenarioPdfAction->execute($html);
        $filename = 'scenario_' . $scenario->id . '_' . now()->format('Ymd_His') . '.pdf';

        return new ExportedPdfData(
            bytes: $pdfBytes,
            filename: $filename
        );
    }
}

