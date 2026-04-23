<?php

namespace App\Domain\Core\Resources;

class MessageResource extends BaseCoreResource
{
    public function toArray($request): array
    {
        return $this->resource;
    }
}
