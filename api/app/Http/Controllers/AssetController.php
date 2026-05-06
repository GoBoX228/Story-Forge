<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\AssetIndexRequest;
use App\Domain\Core\Requests\AssetStoreRequest;
use App\Domain\Core\Requests\AssetUpdateRequest;
use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\AssetService;
use App\Models\Asset;
use Illuminate\Http\JsonResponse;

class AssetController extends Controller
{
    public function __construct(
        private readonly AssetService $assetService,
    ) {
    }

    public function index(AssetIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Asset::class);

        $assets = $this->assetService->list($request->user(), $request->toDto());

        return response()->json(ModelResource::collection($assets)->resolve($request));
    }

    public function store(AssetStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Asset::class);

        $asset = $this->assetService->create(
            $request->user(),
            $request->toDto(),
            $request->getSchemeAndHttpHost()
        );

        return response()->json((new ModelResource($asset))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', Asset::class);

        $asset = $this->assetService->show($request->user(), $id);

        return response()->json((new ModelResource($asset))->resolve($request));
    }

    public function update(AssetUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', Asset::class);

        $asset = $this->assetService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($asset))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', Asset::class);

        $this->assetService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
