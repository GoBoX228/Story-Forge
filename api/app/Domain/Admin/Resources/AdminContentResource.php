<?php

namespace App\Domain\Admin\Resources;

class AdminContentResource extends BaseAdminResource
{
    public function toArray($request): array
    {
        return [
            'type' => $this->resource['type'],
            'id' => $this->resource['id'],
            'title' => $this->resource['title'],
            'author' => $this->resource['author'],
            'author_id' => $this->resource['author_id'],
            'reports_total' => $this->resource['reports_total'],
            'reports_open' => $this->resource['reports_open'],
            'created_at' => $this->resource['created_at'],
            'updated_at' => $this->resource['updated_at'],
        ];
    }
}
