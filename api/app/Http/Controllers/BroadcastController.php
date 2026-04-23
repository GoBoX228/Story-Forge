<?php

namespace App\Http\Controllers;

use App\Domain\Broadcast\Requests\BroadcastIndexRequest;
use App\Domain\Broadcast\Resources\BroadcastResource;
use App\Domain\Broadcast\Services\BroadcastService;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;

class BroadcastController extends Controller
{
    public function __construct(
        private readonly BroadcastService $broadcastService,
    ) {
    }

    public function index(BroadcastIndexRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Announcement::class);

        $announcements = $this->broadcastService->list($request->toDto());

        return response()->json(BroadcastResource::collection($announcements)->resolve($request));
    }
}

