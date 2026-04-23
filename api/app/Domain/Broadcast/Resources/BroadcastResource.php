<?php

namespace App\Domain\Broadcast\Resources;

use App\Models\Announcement;
use Illuminate\Http\Resources\Json\JsonResource;

class BroadcastResource extends JsonResource
{
    public static $wrap = null;

    public function toArray($request): array
    {
        /** @var Announcement $announcement */
        $announcement = $this->resource;

        return [
            'id' => $announcement->id,
            'type' => $announcement->type,
            'message' => $announcement->message,
            'created_at' => $announcement->created_at,
            'author' => $announcement->user?->name ?? 'system',
        ];
    }
}

