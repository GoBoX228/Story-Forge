<?php

namespace App\Domain\Auth\Resources;

use App\Domain\Auth\DTO\TwoFactorChallengeData;

class TwoFactorChallengeResource extends BaseAuthResource
{
    public function toArray($request): array
    {
        /** @var TwoFactorChallengeData $data */
        $data = $this->resource;

        return [
            'challenge_token' => $data->challengeToken,
            'expires_in' => $data->expiresIn,
            'retry_after' => $data->retryAfter,
            'delivery' => $data->delivery,
            'dev_code' => $data->devCode,
        ];
    }
}
