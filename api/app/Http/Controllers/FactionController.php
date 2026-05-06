<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\FactionStoreRequest;
use App\Domain\Core\Requests\FactionUpdateRequest;
use App\Domain\Core\Requests\WorldEntityIndexRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\FactionService;
use App\Models\Faction;
use Illuminate\Http\JsonResponse;

class FactionController extends Controller
{
    public function __construct(
        private readonly FactionService $factionService,
    ) {
    }

    public function index(WorldEntityIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Faction::class);

        $factions = $this->factionService->list($request->user(), $request->toDto());

        return response()->json(ModelResource::collection($factions)->resolve($request));
    }

    public function store(FactionStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Faction::class);

        $faction = $this->factionService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($faction))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', Faction::class);

        $faction = $this->factionService->show($request->user(), $id);

        return response()->json((new ModelResource($faction))->resolve($request));
    }

    public function update(FactionUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', Faction::class);

        $faction = $this->factionService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($faction))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', Faction::class);

        $this->factionService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
