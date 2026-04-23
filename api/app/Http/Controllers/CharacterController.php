<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CharacterIndexRequest;
use App\Domain\Core\Requests\CharacterStoreRequest;
use App\Domain\Core\Requests\CharacterUpdateRequest;
use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Resources\ModelResource;
use App\Domain\Core\Services\CharacterService;
use App\Models\Character;
use Illuminate\Http\JsonResponse;

class CharacterController extends Controller
{
    public function __construct(
        private readonly CharacterService $characterService,
    ) {
    }

    public function index(CharacterIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Character::class);

        $characters = $this->characterService->list($request->user(), $request->toDto());

        return response()->json(ModelResource::collection($characters)->resolve($request));
    }

    public function store(CharacterStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Character::class);

        $character = $this->characterService->create($request->user(), $request->toDto());

        return response()->json((new ModelResource($character))->resolve($request), 201);
    }

    public function update(CharacterUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', Character::class);

        $character = $this->characterService->update($request->user(), $id, $request->toDto());

        return response()->json((new ModelResource($character))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', Character::class);

        $this->characterService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
