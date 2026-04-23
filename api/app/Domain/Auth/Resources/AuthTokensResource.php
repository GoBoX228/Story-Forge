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
            'access_token' => $data->accessToken,
            'token_type' => $data->tokenType,
            'expires_in' => $data->expiresIn,
            'user' => (new UserResource($data->user))->resolve($request),
        ];
    }
}
