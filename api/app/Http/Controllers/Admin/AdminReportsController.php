<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Admin\Requests\AdminReportsIndexRequest;
use App\Domain\Admin\Requests\AdminReportsUpdateRequest;
use App\Domain\Admin\Resources\AdminReportResource;
use App\Domain\Admin\Services\AdminReportModerationService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminReportsController extends Controller
{
    public function __construct(
        private readonly AdminReportModerationService $adminReportModerationService,
    ) {
    }

    public function index(AdminReportsIndexRequest $request): JsonResponse
    {
        $reports = $this->adminReportModerationService->list($request->toDto());

        return response()->json(AdminReportResource::collection($reports)->resolve($request));
    }

    public function update(AdminReportsUpdateRequest $request, string $id): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        $result = $this->adminReportModerationService->update($admin, $id, $request->toDto());

        return response()->json((new AdminReportResource($result['report']))->resolve($request));
    }
}
