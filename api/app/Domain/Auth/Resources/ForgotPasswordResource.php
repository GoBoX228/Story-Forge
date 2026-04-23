<?php

namespace App\Domain\Auth\Resources;

class ForgotPasswordResource extends BaseAuthResource
{
    public function toArray($request): array
    {
        return [
            'message' => $this->resource['message'],
            'expires_in' => $this->resource['expires_in'],
            'delivery' => $this->resource['delivery'],
            'dev_code' => $this->resource['dev_code'],
            'dev_code_usable' => $this->resource['dev_code_usable'],
        ];
    }
}
