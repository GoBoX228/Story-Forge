<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\TagAssignmentRequest;
use App\Domain\Core\Requests\TagStoreRequest;
use App\Domain\Core\Requests\TagUpdateRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\TagService;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;

class TagController extends Controller
{
    public function __construct(
        private readonly TagService $tagService,
    ) {
    }

    public function index(CoreReadRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Tag::class);

        $tags = $this->tagService->list($request->user());

        return response()->json(ModelResource::collection($tags)->resolve($request));
    }

    public function store(TagStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Tag::class);

        $tag = $this->tagService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($tag))->resolve($request), 201);
    }

    public function update(TagUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', Tag::class);

        $tag = $this->tagService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($tag))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', Tag::class);

        $this->tagService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }

    public function targetTags(CoreReadRequest $request, string $type, string $id): JsonResponse
    {
        $this->authorize('viewAny', Tag::class);

        $tags = $this->tagService->listForTarget($request->user(), $type, $id);

        return response()->json(ModelResource::collection($tags)->resolve($request));
    }

    public function replaceTargetTags(TagAssignmentRequest $request, string $type, string $id): JsonResponse
    {
        $this->authorize('update', Tag::class);

        $tags = $this->tagService->replaceForTarget($request->user(), $type, $id, $request->toDto());

        return response()->json(ModelResource::collection($tags)->resolve($request));
    }
}
