<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\ChronicleStoreRequest;
use App\Domain\Core\Requests\ChronicleUpdateRequest;
use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Requests\WorldEntityIndexRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\ChronicleService;
use App\Models\Chronicle;
use Illuminate\Http\JsonResponse;

class ChronicleController extends Controller
{
    public function __construct(
        private readonly ChronicleService $chronicleService,
    ) {
    }

    public function index(WorldEntityIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Chronicle::class);

        $chronicles = $this->chronicleService->list($request->user(), $request->toDto());

        return response()->json(ModelResource::collection($chronicles)->resolve($request));
    }

    public function store(ChronicleStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Chronicle::class);

        $chronicle = $this->chronicleService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($chronicle))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', Chronicle::class);

        $chronicle = $this->chronicleService->show($request->user(), $id);

        return response()->json((new ModelResource($chronicle))->resolve($request));
    }

    public function update(ChronicleUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', Chronicle::class);

        $chronicle = $this->chronicleService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($chronicle))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', Chronicle::class);

        $this->chronicleService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
