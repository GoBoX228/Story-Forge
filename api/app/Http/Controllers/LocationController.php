<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\LocationStoreRequest;
use App\Domain\Core\Requests\LocationUpdateRequest;
use App\Domain\Core\Requests\WorldEntityIndexRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\LocationService;
use App\Models\Location;
use Illuminate\Http\JsonResponse;

class LocationController extends Controller
{
    public function __construct(
        private readonly LocationService $locationService,
    ) {
    }

    public function index(WorldEntityIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Location::class);

        $locations = $this->locationService->list($request->user(), $request->toDto());

        return response()->json(ModelResource::collection($locations)->resolve($request));
    }

    public function store(LocationStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Location::class);

        $location = $this->locationService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($location))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', Location::class);

        $location = $this->locationService->show($request->user(), $id);

        return response()->json((new ModelResource($location))->resolve($request));
    }

    public function update(LocationUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', Location::class);

        $location = $this->locationService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($location))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', Location::class);

        $this->locationService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
