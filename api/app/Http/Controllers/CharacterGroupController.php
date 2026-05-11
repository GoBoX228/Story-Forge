<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CharacterGroupStoreRequest;
use App\Domain\Core\Requests\CharacterGroupUpdateRequest;
use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\CharacterGroupService;
use App\Models\CharacterGroup;
use Illuminate\Http\JsonResponse;

class CharacterGroupController extends Controller
{
    public function __construct(
        private readonly CharacterGroupService $characterGroupService,
    ) {
    }

    public function index(CoreReadRequest $request): JsonResponse
    {
        $this->authorize('viewAny', CharacterGroup::class);

        $groups = $this->characterGroupService->list($request->user());

        return response()->json(ModelResource::collection($groups)->resolve($request));
    }

    public function store(CharacterGroupStoreRequest $request): JsonResponse
    {
        $this->authorize('create', CharacterGroup::class);

        $group = $this->characterGroupService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($group))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', CharacterGroup::class);

        $group = $this->characterGroupService->show($request->user(), $id);

        return response()->json((new ModelResource($group))->resolve($request));
    }

    public function update(CharacterGroupUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', CharacterGroup::class);

        $group = $this->characterGroupService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($group))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', CharacterGroup::class);

        $this->characterGroupService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
