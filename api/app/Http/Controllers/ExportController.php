<?php

namespace App\Http\Controllers;

use App\Domain\Export\Requests\ExportCampaignZipRequest;
use App\Domain\Export\Requests\ExportMapPdfRequest;
use App\Domain\Export\Requests\ExportScenarioCharacterCardsPdfRequest;
use App\Domain\Export\Requests\ExportScenarioItemCardsPdfRequest;
use App\Domain\Export\Requests\ExportScenarioPdfRequest;
use App\Domain\Export\Resources\ExportJobResource;
use App\Domain\Export\Services\CampaignExportService;
use App\Domain\Export\Services\MapExportService;
use App\Domain\Export\Services\ScenarioExportService;
use App\Models\Campaign;
use App\Models\ExportJob;
use App\Models\Map;
use App\Models\Scenario;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

class ExportController extends Controller
{
    public function __construct(
        private readonly ScenarioExportService $scenarioExportService,
        private readonly MapExportService $mapExportService,
        private readonly CampaignExportService $campaignExportService,
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

    public function exportCampaignZip(ExportCampaignZipRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', Campaign::class);

        $job = $this->campaignExportService->queue($request->user(), $request->toDto($id));

        return response()->json((new ExportJobResource($job))->resolve($request), 202);
    }

    public function exportJobStatus(ExportCampaignZipRequest $request, string $id): JsonResponse
    {
        $job = $this->campaignExportService->findOwnedJob($request->user(), $id);

        return response()->json((new ExportJobResource($job))->resolve($request));
    }

    public function downloadExportJob(ExportCampaignZipRequest $request, string $id): BinaryFileResponse
    {
        $job = $this->campaignExportService->findOwnedJob($request->user(), $id);
        abort_unless(
            $job->status === ExportJob::STATUS_COMPLETED
            && $job->file_path
            && Storage::disk('local')->exists($job->file_path),
            404
        );

        return response()->download(
            Storage::disk('local')->path($job->file_path),
            'campaign_' . $job->target_id . '.zip',
            ['Content-Type' => 'application/zip']
        );
    }
}
