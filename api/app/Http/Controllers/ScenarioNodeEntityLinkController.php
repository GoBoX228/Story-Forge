<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\ScenarioNodeEntityLinkStoreRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\ScenarioNodeEntityLinkService;
use App\Models\EntityLink;
use Illuminate\Http\JsonResponse;

class ScenarioNodeEntityLinkController extends Controller
{
    public function __construct(
        private readonly ScenarioNodeEntityLinkService $scenarioNodeEntityLinkService,
    ) {
    }

    public function index(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('viewAny', EntityLink::class);

        $links = $this->scenarioNodeEntityLinkService->list($request->user(), $id);

        return response()->json(ModelResource::collection($links)->resolve($request));
    }

    public function store(ScenarioNodeEntityLinkStoreRequest $request, string $id): JsonResponse
    {
        $this->authorize('create', EntityLink::class);

        $link = $this->scenarioNodeEntityLinkService->create($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($link))->resolve($request), 201);
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', EntityLink::class);

        $this->scenarioNodeEntityLinkService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
