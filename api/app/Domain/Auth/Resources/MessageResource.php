<?php

namespace App\Domain\Auth\Resources;

class MessageResource extends BaseAuthResource
{
    public function toArray($request): array
    {
        return $this->resource;
    }
}
