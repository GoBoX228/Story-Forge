<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\ItemGroupStoreRequest;
use App\Domain\Core\Requests\ItemGroupUpdateRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\ItemGroupService;
use App\Models\ItemGroup;
use Illuminate\Http\JsonResponse;

class ItemGroupController extends Controller
{
    public function __construct(
        private readonly ItemGroupService $itemGroupService,
    ) {
    }

    public function index(CoreReadRequest $request): JsonResponse
    {
        $this->authorize('viewAny', ItemGroup::class);

        $groups = $this->itemGroupService->list($request->user());

        return response()->json(ModelResource::collection($groups)->resolve($request));
    }

    public function store(ItemGroupStoreRequest $request): JsonResponse
    {
        $this->authorize('create', ItemGroup::class);

        $group = $this->itemGroupService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($group))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', ItemGroup::class);

        $group = $this->itemGroupService->show($request->user(), $id);

        return response()->json((new ModelResource($group))->resolve($request));
    }

    public function update(ItemGroupUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', ItemGroup::class);

        $group = $this->itemGroupService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($group))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', ItemGroup::class);

        $this->itemGroupService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
