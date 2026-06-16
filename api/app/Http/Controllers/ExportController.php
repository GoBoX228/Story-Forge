<?php

namespace App\Http\Controllers;

use App\Domain\Export\Requests\ExportMapPdfRequest;
use App\Domain\Export\Requests\ExportScenarioCharacterCardsPdfRequest;
use App\Domain\Export\Requests\ExportScenarioItemCardsPdfRequest;
use App\Domain\Export\Requests\ExportScenarioPdfRequest;
use App\Domain\Export\Services\MapExportService;
use App\Domain\Export\Services\ScenarioExportService;
use App\Models\Map;
use App\Models\Scenario;
use Symfony\Component\HttpFoundation\Response;

class ExportController extends Controller
{
    public function __construct(
        private readonly ScenarioExportService $scenarioExportService,
        private readonly MapExportService $mapExportService,
    ) {
    }

    public function exportMapPdf(ExportMapPdfRequest $request, string $id): Response
    {
        $this->authorize('view', Map::class);

        $exportedPdf = $this->mapExportService->exportMapPdf($request->user(), $request->toDto($id));

        return response($exportedPdf->bytes)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="' . $exportedPdf->filename . '"');
    }

    public function exportScenarioPdf(ExportScenarioPdfRequest $request, string $id): Response
    {
        $this->authorize('view', Scenario::class);

        $exportedPdf = $this->scenarioExportService->exportScenarioPdf($request->user(), $request->toDto($id));

        return response($exportedPdf->bytes)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="' . $exportedPdf->filename . '"');
    }

    public function exportScenarioCharacterCardsPdf(ExportScenarioCharacterCardsPdfRequest $request, string $id): Response
    {
        $this->authorize('view', Scenario::class);

        $exportedPdf = $this->scenarioExportService->exportScenarioCharacterCardsPdf($request->user(), $request->toDto($id));

        return response($exportedPdf->bytes)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="' . $exportedPdf->filename . '"');
    }

    public function exportScenarioItemCardsPdf(ExportScenarioItemCardsPdfRequest $request, string $id): Response
    {
        $this->authorize('view', Scenario::class);

        $exportedPdf = $this->scenarioExportService->exportScenarioItemCardsPdf($request->user(), $request->toDto($id));

        return response($exportedPdf->bytes)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="' . $exportedPdf->filename . '"');
    }
}
