<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\MapIndexRequest;
use App\Domain\Core\Requests\MapStoreRequest;
use App\Domain\Core\Requests\MapUpdateRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\MapService;
use App\Models\Map;
use Illuminate\Http\JsonResponse;

class MapController extends Controller
{
    public function __construct(
        private readonly MapService $mapService,
    ) {
    }

    public function index(MapIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Map::class);

        $maps = $this->mapService->list($request->user(), $request->toDto());

        return response()->json(ModelResource::collection($maps)->resolve($request));
    }

    public function store(MapStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Map::class);

        $map = $this->mapService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($map))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', Map::class);

        $map = $this->mapService->show($request->user(), $id);

        return response()->json((new ModelResource($map))->resolve($request));
    }

    public function update(MapUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', Map::class);

        $map = $this->mapService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($map))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', Map::class);

        $this->mapService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
