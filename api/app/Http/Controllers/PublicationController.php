<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\PublicationIndexRequest;
use App\Domain\Core\Requests\PublicationStoreRequest;
use App\Domain\Core\Requests\PublicationUpdateRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\PublicationService;
use App\Models\PublishedContent;
use Illuminate\Http\JsonResponse;

class PublicationController extends Controller
{
    public function __construct(
        private readonly PublicationService $publicationService,
    ) {
    }

    public function index(PublicationIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', PublishedContent::class);

        $publications = $this->publicationService->list($request->user(), $request->toDto());

        return response()->json(ModelResource::collection($publications)->resolve($request));
    }

    public function show(CoreReadRequest $request, string $slug): JsonResponse
    {
        $this->authorize('view', PublishedContent::class);

        $publication = $this->publicationService->show($request->user(), $slug);

        return response()->json((new ModelResource($publication))->resolve($request));
    }

    public function storeForTarget(PublicationStoreRequest $request, string $type, string $id): JsonResponse
    {
        $this->authorize('create', PublishedContent::class);

        $publication = $this->publicationService->publishTarget($request->user(), $type, $id, $request->toDto());

        return response()->json((new ModelResource($publication))->resolve($request), 201);
    }

    public function update(PublicationUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', PublishedContent::class);

        $publication = $this->publicationService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($publication))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', PublishedContent::class);

        $this->publicationService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
