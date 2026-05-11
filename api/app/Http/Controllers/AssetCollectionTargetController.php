<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\AssetCollectionAssignmentRequest;
use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\AssetCollectionTargetService;
use App\Models\AssetCollection;
use Illuminate\Http\JsonResponse;

class AssetCollectionTargetController extends Controller
{
    public function __construct(
        private readonly AssetCollectionTargetService $assetCollectionTargetService,
    ) {
    }

    public function targetCollections(CoreReadRequest $request, string $type, string $id): JsonResponse
    {
        $this->authorize('viewAny', AssetCollection::class);

        $collections = $this->assetCollectionTargetService->listForTarget($request->user(), $type, $id);

        return response()->json(ModelResource::collection($collections)->resolve($request));
    }

    public function replaceTargetCollections(AssetCollectionAssignmentRequest $request, string $type, string $id): JsonResponse
    {
        $this->authorize('update', AssetCollection::class);

        $collections = $this->assetCollectionTargetService->replaceForTarget($request->user(), $type, $id, $request->toDto());

        return response()->json(ModelResource::collection($collections)->resolve($request));
    }
}
