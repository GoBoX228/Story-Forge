<?php

namespace App\Domain\Admin\Resources;

class AdminOverviewResource extends BaseAdminResource
{
    public function toArray($request): array
    {
        return [
            'stats' => $this->resource['stats'],
            'logs' => AdminAuditLogResource::collection($this->resource['logs'])->resolve($request),
            'broadcasts' => AdminBroadcastResource::collection($this->resource['broadcasts'])->resolve($request),
        ];
    }
}
