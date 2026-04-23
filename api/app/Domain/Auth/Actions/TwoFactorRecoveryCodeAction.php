<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Auth\Support\AuthConfig;
use App\Models\TwoFactorRecoveryCode;
use App\Models\User;
use Illuminate\Support\Str;

class TwoFactorRecoveryCodeAction
{
    public function consume(User $user, string $inputCode): bool
    {
        $candidateHash = hash('sha256', $inputCode);

        $record = TwoFactorRecoveryCode::query()
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->where('code_hash', $candidateHash)
            ->first();

        if (!$record) {
            return false;
        }

        $record->used_at = now();
        $record->save();

        return true;
    }

    public function regenerate(User $user): array
    {
        TwoFactorRecoveryCode::query()->where('user_id', $user->id)->delete();

        $plainCodes = [];

        for ($i = 0; $i < AuthConfig::TWO_FACTOR_RECOVERY_CODES_COUNT; $i++) {
            $plain = $this->generate();
            $plainCodes[] = $plain;

            TwoFactorRecoveryCode::query()->create([
                'user_id' => $user->id,
                'code_hash' => hash('sha256', $plain),
                'used_at' => null,
            ]);
        }

        return $plainCodes;
    }

    public function clearForUser(User $user): void
    {
        TwoFactorRecoveryCode::query()->where('user_id', $user->id)->delete();
    }

    private function generate(): string
    {
        return strtoupper(Str::random(5)) . '-' . strtoupper(Str::random(5));
    }
}
