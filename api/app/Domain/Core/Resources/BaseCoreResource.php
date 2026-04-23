<?php

namespace App\Domain\Core\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

abstract class BaseCoreResource extends JsonResource
{
    public static $wrap = null;
}
