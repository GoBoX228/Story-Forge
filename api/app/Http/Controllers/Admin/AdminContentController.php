<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Admin\Requests\AdminContentDeleteRequest;
use App\Domain\Admin\Requests\AdminContentIndexRequest;
use App\Domain\Admin\Resources\AdminContentResource;
use App\Domain\Admin\Services\AdminContentModerationService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminContentController extends Controller
{
    public function __construct(
        private readonly AdminContentModerationService $adminContentModerationService,
    ) {
    }

    public function index(AdminContentIndexRequest $request): JsonResponse
    {
        $content = $this->adminContentModerationService->list($request->toDto());

        return response()->json(AdminContentResource::collection($content)->resolve($request));
    }

    public function destroy(AdminContentDeleteRequest $request, string $type, string $id): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        $result = $this->adminContentModerationService->delete($admin, $request->toDto());

        if ($result['status'] !== 'success') {
            return response()->json(['message' => $result['message']], $result['code']);
        }

        return response()->json(['message' => $result['message']]);
    }
}
