<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\AssetCollectionStoreRequest;
use App\Domain\Core\Requests\AssetCollectionUpdateRequest;
use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\AssetCollectionService;
use App\Models\AssetCollection;
use Illuminate\Http\JsonResponse;

class AssetCollectionController extends Controller
{
    public function __construct(
        private readonly AssetCollectionService $assetCollectionService,
    ) {
    }

    public function index(CoreReadRequest $request): JsonResponse
    {
        $this->authorize('viewAny', AssetCollection::class);

        $collections = $this->assetCollectionService->list($request->user());

        return response()->json(ModelResource::collection($collections)->resolve($request));
    }

    public function store(AssetCollectionStoreRequest $request): JsonResponse
    {
        $this->authorize('create', AssetCollection::class);

        $collection = $this->assetCollectionService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($collection))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', AssetCollection::class);

        $collection = $this->assetCollectionService->show($request->user(), $id);

        return response()->json((new ModelResource($collection))->resolve($request));
    }

    public function update(AssetCollectionUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', AssetCollection::class);

        $collection = $this->assetCollectionService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($collection))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', AssetCollection::class);

        $this->assetCollectionService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
