<?php

namespace App\Domain\Auth\Resources;

class UserResource extends BaseAuthResource
{
    public function toArray($request): array
    {
        return $this->resource->toArray();
    }
}
