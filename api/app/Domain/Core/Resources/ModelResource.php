<?php

namespace App\Domain\Core\Resources;

class ModelResource extends BaseCoreResource
{
    public function toArray($request): array
    {
        return $this->resource->toArray();
    }
}
