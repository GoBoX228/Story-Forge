<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\ScenarioNodeStoreRequest;
use App\Domain\Core\Requests\ScenarioNodeUpdateRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\ScenarioNodeService;
use App\Models\ScenarioNode;
use Illuminate\Http\JsonResponse;

class ScenarioNodeController extends Controller
{
    public function __construct(
        private readonly ScenarioNodeService $scenarioNodeService,
    ) {
    }

    public function index(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('viewAny', ScenarioNode::class);

        $nodes = $this->scenarioNodeService->list($request->user(), $id);

        return response()->json(ModelResource::collection($nodes)->resolve($request));
    }

    public function store(ScenarioNodeStoreRequest $request, string $id): JsonResponse
    {
        $this->authorize('create', ScenarioNode::class);

        $node = $this->scenarioNodeService->create($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($node))->resolve($request), 201);
    }

    public function update(ScenarioNodeUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', ScenarioNode::class);

        $node = $this->scenarioNodeService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($node))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', ScenarioNode::class);

        $this->scenarioNodeService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
