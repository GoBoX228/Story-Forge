<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\ScenarioIndexRequest;
use App\Domain\Core\Requests\ScenarioStoreRequest;
use App\Domain\Core\Requests\ScenarioUpdateRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\ScenarioService;
use App\Models\Scenario;
use Illuminate\Http\JsonResponse;

class ScenarioController extends Controller
{
    public function __construct(
        private readonly ScenarioService $scenarioService,
    ) {
    }

    public function index(ScenarioIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Scenario::class);

        $scenarios = $this->scenarioService->list($request->user(), $request->toDto());

        return response()->json(ModelResource::collection($scenarios)->resolve($request));
    }

    public function store(ScenarioStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Scenario::class);

        $scenario = $this->scenarioService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($scenario))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', Scenario::class);

        $scenario = $this->scenarioService->show($request->user(), $id);

        return response()->json((new ModelResource($scenario))->resolve($request));
    }

    public function update(ScenarioUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', Scenario::class);

        $scenario = $this->scenarioService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($scenario))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', Scenario::class);

        $this->scenarioService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
