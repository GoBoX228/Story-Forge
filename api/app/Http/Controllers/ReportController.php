<?php

namespace App\Http\Controllers;

use App\Domain\Report\Requests\ReportStoreRequest;
use App\Domain\Report\Resources\ReportResource;
use App\Domain\Report\Services\ReportService;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly ReportService $reportService,
    ) {
    }

    public function store(ReportStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Report::class);

        /** @var User $reporter */
        $reporter = $request->user();
        $result = $this->reportService->store($reporter, $request->toDto());

        return match ($result['status']) {
            'target_not_found' => response()->json(['message' => 'Target not found'], 404),
            'self_report' => response()->json(['message' => 'You cannot report yourself'], 422),
            'duplicate' => response()->json((new ReportResource($result['report']))->resolve($request), 200),
            default => response()->json((new ReportResource($result['report']))->resolve($request), 201),
        };
    }
}

