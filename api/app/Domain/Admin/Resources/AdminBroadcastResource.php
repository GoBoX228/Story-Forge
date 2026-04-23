<?php

namespace App\Domain\Admin\Resources;

use App\Models\Announcement;

class AdminBroadcastResource extends BaseAdminResource
{
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
