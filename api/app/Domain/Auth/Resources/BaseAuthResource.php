<?php

namespace App\Domain\Auth\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

abstract class BaseAuthResource extends JsonResource
{
    public static $wrap = null;
}
