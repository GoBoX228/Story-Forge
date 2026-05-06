<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\EntityLinkStoreRequest;
use App\Domain\Core\Requests\EntityLinkUpdateRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\EntityLinkService;
use App\Models\EntityLink;
use Illuminate\Http\JsonResponse;

class EntityLinkController extends Controller
{
    public function __construct(
        private readonly EntityLinkService $entityLinkService,
    ) {
    }

    public function index(CoreReadRequest $request, string $sourceType, string $sourceId): JsonResponse
    {
        $this->authorize('viewAny', EntityLink::class);

        $links = $this->entityLinkService->list($request->user(), $sourceType, $sourceId);

        return response()->json(ModelResource::collection($links)->resolve($request));
    }

    public function store(EntityLinkStoreRequest $request, string $sourceType, string $sourceId): JsonResponse
    {
        $this->authorize('create', EntityLink::class);

        $link = $this->entityLinkService->create($request->user(), $sourceType, $sourceId, $request->toDto());

        return response()->json((new ModelResource($link))->resolve($request), 201);
    }

    public function update(EntityLinkUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', EntityLink::class);

        $link = $this->entityLinkService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($link))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', EntityLink::class);

        $this->entityLinkService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
