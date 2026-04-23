<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Admin\Requests\AdminOverviewRequest;
use App\Domain\Admin\Resources\AdminOverviewResource;
use App\Domain\Admin\Services\AdminOverviewService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class AdminOverviewController extends Controller
{
    public function __construct(
        private readonly AdminOverviewService $adminOverviewService,
    ) {
    }

    public function overview(AdminOverviewRequest $request): JsonResponse
    {
        $data = $this->adminOverviewService->overview();

        return response()->json((new AdminOverviewResource($data))->resolve($request));
    }
}
