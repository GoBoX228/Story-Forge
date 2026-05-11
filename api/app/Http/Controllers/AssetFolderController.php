<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\AssetFolderStoreRequest;
use App\Domain\Core\Requests\AssetFolderUpdateRequest;
use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\AssetFolderService;
use App\Models\AssetFolder;
use Illuminate\Http\JsonResponse;

class AssetFolderController extends Controller
{
    public function __construct(
        private readonly AssetFolderService $assetFolderService,
    ) {
    }

    public function index(CoreReadRequest $request): JsonResponse
    {
        $this->authorize('viewAny', AssetFolder::class);

        $folders = $this->assetFolderService->list($request->user());

        return response()->json(ModelResource::collection($folders)->resolve($request));
    }

    public function store(AssetFolderStoreRequest $request): JsonResponse
    {
        $this->authorize('create', AssetFolder::class);

        $folder = $this->assetFolderService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($folder))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', AssetFolder::class);

        $folder = $this->assetFolderService->show($request->user(), $id);

        return response()->json((new ModelResource($folder))->resolve($request));
    }

    public function update(AssetFolderUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', AssetFolder::class);

        $folder = $this->assetFolderService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($folder))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', AssetFolder::class);

        $this->assetFolderService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
