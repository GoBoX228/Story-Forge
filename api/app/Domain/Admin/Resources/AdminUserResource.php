<?php

namespace App\Domain\Admin\Resources;

class AdminUserResource extends BaseAdminResource
{
    public function toArray($request): array
    {
        $payload = [
            'id' => $this->resource['id'],
            'name' => $this->resource['name'],
            'email' => $this->resource['email'],
            'role' => $this->resource['role'],
            'status' => $this->resource['status'],
            'created_at' => $this->resource['created_at'],
        ];

        if (array_key_exists('reports_count', $this->resource)) {
            $payload['reports_count'] = $this->resource['reports_count'];
        }

        return $payload;
    }
}
