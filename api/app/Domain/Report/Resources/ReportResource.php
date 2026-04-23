<?php

namespace App\Domain\Report\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ReportResource extends JsonResource
{
    public static $wrap = null;

    public function toArray($request): array
    {
        return $this->resource->toArray();
    }
}

