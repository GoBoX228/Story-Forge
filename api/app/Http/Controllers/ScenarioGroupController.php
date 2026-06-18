<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\ScenarioGroupStoreRequest;
use App\Domain\Core\Requests\ScenarioGroupUpdateRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\ScenarioGroupService;
use App\Models\ScenarioGroup;
use Illuminate\Http\JsonResponse;

class ScenarioGroupController extends Controller
{
    public function __construct(
        private readonly ScenarioGroupService $scenarioGroupService,
    ) {
    }

    public function index(CoreReadRequest $request): JsonResponse
    {
        $this->authorize('viewAny', ScenarioGroup::class);

        $groups = $this->scenarioGroupService->list($request->user());

        return response()->json(ModelResource::collection($groups)->resolve($request));
    }

    public function store(ScenarioGroupStoreRequest $request): JsonResponse
    {
        $this->authorize('create', ScenarioGroup::class);

        $group = $this->scenarioGroupService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($group))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', ScenarioGroup::class);

        $group = $this->scenarioGroupService->show($request->user(), $id);

        return response()->json((new ModelResource($group))->resolve($request));
    }

    public function update(ScenarioGroupUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', ScenarioGroup::class);

        $group = $this->scenarioGroupService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($group))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', ScenarioGroup::class);

        $this->scenarioGroupService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}

