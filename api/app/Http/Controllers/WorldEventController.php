<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\WorldEntityIndexRequest;
use App\Domain\Core\Requests\WorldEventStoreRequest;
use App\Domain\Core\Requests\WorldEventUpdateRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\WorldEventService;
use App\Models\WorldEvent;
use Illuminate\Http\JsonResponse;

class WorldEventController extends Controller
{
    public function __construct(
        private readonly WorldEventService $worldEventService,
    ) {
    }

    public function index(WorldEntityIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', WorldEvent::class);

        $events = $this->worldEventService->list($request->user(), $request->toDto());

        return response()->json(ModelResource::collection($events)->resolve($request));
    }

    public function store(WorldEventStoreRequest $request): JsonResponse
    {
        $this->authorize('create', WorldEvent::class);

        $event = $this->worldEventService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($event))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', WorldEvent::class);

        $event = $this->worldEventService->show($request->user(), $id);

        return response()->json((new ModelResource($event))->resolve($request));
    }

    public function update(WorldEventUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', WorldEvent::class);

        $event = $this->worldEventService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($event))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', WorldEvent::class);

        $this->worldEventService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
