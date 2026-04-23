<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Admin\Requests\AdminLogsIndexRequest;
use App\Domain\Admin\Resources\AdminAuditLogResource;
use App\Domain\Admin\Services\AdminAuditLogService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class AdminLogsController extends Controller
{
    public function __construct(
        private readonly AdminAuditLogService $adminAuditLogService,
    ) {
    }

    public function index(AdminLogsIndexRequest $request): JsonResponse
    {
        $logs = $this->adminAuditLogService->listLatest();

        return response()->json(AdminAuditLogResource::collection($logs)->resolve($request));
    }
}
