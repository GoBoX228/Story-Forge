<?php

namespace App\Domain\Auth\Resources;

use App\Domain\Auth\DTO\IssuedTokensData;

class AuthTokensResource extends BaseAuthResource
{
    public function toArray($request): array
    {
        /** @var IssuedTokensData $data */
        $data = $this->resource;

        return [
            'user' => (new UserResource($data->user))->resolve($request),
        ];
    }
}
