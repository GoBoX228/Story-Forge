<?php

namespace App\Domain\Admin\Resources;

class AdminMessageResource extends BaseAdminResource
{
    public function toArray($request): array
    {
        return $this->resource;
    }
}
