<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\BlockReorderRequest;
use App\Domain\Core\Requests\BlockStoreRequest;
use App\Domain\Core\Requests\BlockUpdateRequest;
use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\BlockService;
use App\Models\Block;
use Illuminate\Http\JsonResponse;

class BlockController extends Controller
{
    public function __construct(
        private readonly BlockService $blockService,
    ) {
    }

    public function store(BlockStoreRequest $request, string $id): JsonResponse
    {
        $this->authorize('create', Block::class);

        $block = $this->blockService->create($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($block))->resolve($request), 201);
    }

    public function update(BlockUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', Block::class);

        $block = $this->blockService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($block))->resolve($request));
    }

    public function reorder(BlockReorderRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', Block::class);

        $block = $this->blockService->reorder($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($block))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', Block::class);

        $this->blockService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
