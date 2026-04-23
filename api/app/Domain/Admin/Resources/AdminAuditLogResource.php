<?php

namespace App\Domain\Admin\Resources;

use App\Models\AdminAuditLog;

class AdminAuditLogResource extends BaseAdminResource
{
    public function toArray($request): array
    {
        /** @var AdminAuditLog $log */
        $log = $this->resource;

        return [
            'id' => $log->id,
            'action' => $log->action,
            'details' => $log->details,
            'context' => $log->context ?? [],
            'created_at' => $log->created_at,
            'user' => [
                'id' => $log->user?->id,
                'name' => $log->user?->name ?? 'system',
                'email' => $log->user?->email,
            ],
        ];
    }
}
