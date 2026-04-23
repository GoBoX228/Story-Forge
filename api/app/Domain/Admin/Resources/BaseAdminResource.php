<?php

namespace App\Domain\Admin\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

abstract class BaseAdminResource extends JsonResource
{
    public static $wrap = null;
}
