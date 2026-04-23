<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Admin\Requests\AdminBroadcastsCreateRequest;
use App\Domain\Admin\Requests\AdminBroadcastsIndexRequest;
use App\Domain\Admin\Resources\AdminBroadcastResource;
use App\Domain\Admin\Services\AdminBroadcastService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminBroadcastsController extends Controller
{
    public function __construct(
        private readonly AdminBroadcastService $adminBroadcastService,
    ) {
    }

    public function index(AdminBroadcastsIndexRequest $request): JsonResponse
    {
        $broadcasts = $this->adminBroadcastService->list();

        return response()->json(AdminBroadcastResource::collection($broadcasts)->resolve($request));
    }

    public function store(AdminBroadcastsCreateRequest $request): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();
        $broadcast = $this->adminBroadcastService->create($admin, $request->toDto());

        return response()->json((new AdminBroadcastResource($broadcast))->resolve($request), 201);
    }
}
