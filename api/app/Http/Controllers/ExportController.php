<?php

namespace App\Http\Controllers;

use App\Domain\Export\Requests\ExportScenarioPdfRequest;
use App\Domain\Export\Services\ScenarioExportService;
use App\Models\Scenario;
use Symfony\Component\HttpFoundation\Response;

class ExportController extends Controller
{
    public function __construct(
        private readonly ScenarioExportService $scenarioExportService,
    ) {
    }

    public function exportScenarioPdf(ExportScenarioPdfRequest $request, string $id): Response
    {
        $this->authorize('view', Scenario::class);

        $exportedPdf = $this->scenarioExportService->exportScenarioPdf($request->user(), $request->toDto($id));

        return response($exportedPdf->bytes)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="' . $exportedPdf->filename . '"');
    }
}

