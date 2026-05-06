<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\ScenarioTransitionStoreRequest;
use App\Domain\Core\Requests\ScenarioTransitionUpdateRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\ScenarioTransitionService;
use App\Models\ScenarioTransition;
use Illuminate\Http\JsonResponse;

class ScenarioTransitionController extends Controller
{
    public function __construct(
        private readonly ScenarioTransitionService $scenarioTransitionService,
    ) {
    }

    public function index(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('viewAny', ScenarioTransition::class);

        $transitions = $this->scenarioTransitionService->list($request->user(), $id);

        return response()->json(ModelResource::collection($transitions)->resolve($request));
    }

    public function store(ScenarioTransitionStoreRequest $request, string $id): JsonResponse
    {
        $this->authorize('create', ScenarioTransition::class);

        $transition = $this->scenarioTransitionService->create($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($transition))->resolve($request), 201);
    }

    public function update(ScenarioTransitionUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', ScenarioTransition::class);

        $transition = $this->scenarioTransitionService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($transition))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', ScenarioTransition::class);

        $this->scenarioTransitionService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
