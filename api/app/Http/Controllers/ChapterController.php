<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\ChapterStoreRequest;
use App\Domain\Core\Requests\ChapterUpdateRequest;
use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\ChapterService;
use App\Models\Chapter;
use Illuminate\Http\JsonResponse;

class ChapterController extends Controller
{
    public function __construct(
        private readonly ChapterService $chapterService,
    ) {
    }

    public function store(ChapterStoreRequest $request, string $id): JsonResponse
    {
        $this->authorize('create', Chapter::class);

        $chapter = $this->chapterService->create($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($chapter))->resolve($request), 201);
    }

    public function update(ChapterUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', Chapter::class);

        $chapter = $this->chapterService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($chapter))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', Chapter::class);

        $this->chapterService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
