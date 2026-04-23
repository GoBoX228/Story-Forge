<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Admin\Requests\AdminUsersIndexRequest;
use App\Domain\Admin\Requests\AdminUsersUpdateRequest;
use App\Domain\Admin\Resources\AdminUserResource;
use App\Domain\Admin\Services\AdminUserModerationService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminUsersController extends Controller
{
    public function __construct(
        private readonly AdminUserModerationService $adminUserModerationService,
    ) {
    }

    public function index(AdminUsersIndexRequest $request): JsonResponse
    {
        $users = $this->adminUserModerationService->list($request->toDto());

        return response()->json(AdminUserResource::collection($users)->resolve($request));
    }

    public function update(AdminUsersUpdateRequest $request, string $id): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        $result = $this->adminUserModerationService->update($admin, $id, $request->toDto());

        if ($result['status'] === 'invalid') {
            return response()->json(['message' => $result['message']], $result['code']);
        }

        return response()->json((new AdminUserResource($result['user']))->resolve($request));
    }
}
