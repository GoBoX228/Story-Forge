<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CampaignIndexRequest;
use App\Domain\Core\Requests\CampaignStoreRequest;
use App\Domain\Core\Requests\CampaignUpdateRequest;
use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Resources\CampaignResource;
use App\Domain\Core\Resources\MessageResource;
use App\Domain\Core\Services\CampaignService;
use App\Models\Campaign;
use Illuminate\Http\JsonResponse;

class CampaignController extends Controller
{
    public function __construct(
        private readonly CampaignService $campaignService,
    ) {
    }

    public function index(CampaignIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Campaign::class);

        $campaigns = $this->campaignService->list($request->user(), $request->toDto());

        return response()->json(CampaignResource::collection($campaigns)->resolve($request));
    }

    public function store(CampaignStoreRequest $request): JsonResponse
    {
        $this->authorize('create', Campaign::class);

        $campaign = $this->campaignService->create($request->user(), $request->toDto());

        return response()->json((new CampaignResource($campaign))->resolve($request), 201);
    }

    public function show(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('view', Campaign::class);

        $campaign = $this->campaignService->show($request->user(), $id);

        return response()->json((new CampaignResource($campaign))->resolve($request));
    }

    public function update(CampaignUpdateRequest $request, string $id): JsonResponse
    {
        $this->authorize('update', Campaign::class);

        $campaign = $this->campaignService->update($request->user(), $id, $request->toDto());

        return response()->json((new CampaignResource($campaign))->resolve($request));
    }

    public function destroy(CoreReadRequest $request, string $id): JsonResponse
    {
        $this->authorize('delete', Campaign::class);

        $this->campaignService->delete($request->user(), $id);

        return response()->json((new MessageResource(['message' => 'Deleted']))->resolve());
    }
}
