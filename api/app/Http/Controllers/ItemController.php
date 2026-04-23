<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\ItemIndexRequest;
use App\Domain\Core\Requests\ItemStoreRequest;
use App\Domain\Core\Requests\ItemUpdateRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\ItemService;
use App\Models\Item;
use Illuminate\Http\JsonResponse;

class ItemController extends Controller
{
    public function __construct(
        private readonly ItemService $itemService,
    ) {
    }

    public function index(ItemIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Item::class);

        $items = $this->itemService->list($request->user(), $request->toDto());

        return response()->json(ModelResource::collection($items)->resolve($request));
    }

    public function store(ItemStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Item::class);

        $item = $this->itemService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($item))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', Item::class);

        $item = $this->itemService->show($request->user(), $id);

        return response()->json((new ModelResource($item))->resolve($request));
    }

    public function update(ItemUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', Item::class);

        $item = $this->itemService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($item))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', Item::class);

        $this->itemService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}

