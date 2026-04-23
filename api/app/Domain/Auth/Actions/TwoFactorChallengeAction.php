<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Auth\DTO\TwoFactorChallengeData;
use App\Domain\Auth\Support\AuthConfig;
use App\Models\TwoFactorChallenge;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class TwoFactorChallengeAction
{
    public function create(User $user, string $purpose): TwoFactorChallengeData
    {
        $this->clearStale();

        TwoFactorChallenge::query()
            ->where('user_id', $user->id)
            ->where('purpose', $purpose)
            ->delete();

        $challengeToken = Str::random(80);
        $code = $this->generateNumericCode();

        TwoFactorChallenge::query()->create([
            'user_id' => $user->id,
            'purpose' => $purpose,
            'challenge_hash' => hash('sha256', $challengeToken),
            'code_hash' => hash('sha256', $code),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(AuthConfig::TWO_FACTOR_TTL_MINUTES),
            'consumed_at' => null,
            'last_sent_at' => now(),
            'sent_count' => 1,
        ]);

        $this->sendCode($user, $code, $purpose);

        return new TwoFactorChallengeData(
            $challengeToken,
            AuthConfig::TWO_FACTOR_TTL_MINUTES * 60,
            AuthConfig::TWO_FACTOR_RESEND_COOLDOWN_SECONDS,
            'email',
            app()->environment(['local', 'testing']) ? $code : null
        );
    }

    public function resolve(string $challengeToken, ?string $purpose = null): ?TwoFactorChallenge
    {
        $query = TwoFactorChallenge::query()
            ->with('user')
            ->where('challenge_hash', hash('sha256', $challengeToken));

        if ($purpose !== null) {
            $query->where('purpose', $purpose);
        }

        $challenge = $query->first();
        if (!$challenge) {
            return null;
        }

        if ($challenge->consumed_at !== null || $challenge->expires_at->isPast()) {
            $challenge->delete();
            return null;
        }

        return $challenge;
    }

    public function verifyCode(TwoFactorChallenge $challenge, string $code): bool
    {
        if (!hash_equals($challenge->code_hash, hash('sha256', $code))) {
            $this->incrementAttempt($challenge);
            return false;
        }

        $challenge->consumed_at = now();
        $challenge->save();

        return true;
    }

    public function incrementAttempt(TwoFactorChallenge $challenge): void
    {
        $challenge->attempts = $challenge->attempts + 1;

        if ($challenge->attempts >= AuthConfig::TWO_FACTOR_MAX_ATTEMPTS) {
            $challenge->delete();
            return;
        }

        $challenge->save();
    }

    public function retryAfterSeconds(TwoFactorChallenge $challenge): int
    {
        if (!$challenge->last_sent_at) {
            return 0;
        }

        $secondsSinceLastSend = $challenge->last_sent_at->diffInSeconds(now());
        if ($secondsSinceLastSend >= AuthConfig::TWO_FACTOR_RESEND_COOLDOWN_SECONDS) {
            return 0;
        }

        return AuthConfig::TWO_FACTOR_RESEND_COOLDOWN_SECONDS - $secondsSinceLastSend;
    }

    public function resend(TwoFactorChallenge $challenge, string $challengeToken): TwoFactorChallengeData
    {
        $code = $this->generateNumericCode();

        $challenge->code_hash = hash('sha256', $code);
        $challenge->attempts = 0;
        $challenge->expires_at = now()->addMinutes(AuthConfig::TWO_FACTOR_TTL_MINUTES);
        $challenge->last_sent_at = now();
        $challenge->sent_count = min(255, (int) $challenge->sent_count + 1);
        $challenge->save();

        $this->sendCode($challenge->user, $code, $challenge->purpose);

        return new TwoFactorChallengeData(
            $challengeToken,
            AuthConfig::TWO_FACTOR_TTL_MINUTES * 60,
            AuthConfig::TWO_FACTOR_RESEND_COOLDOWN_SECONDS,
            'email',
            app()->environment(['local', 'testing']) ? $code : null
        );
    }

    public function normalizeInputCode(string $code): string
    {
        return strtoupper(str_replace(' ', '', trim($code)));
    }

    public function isRecoveryCodeInput(string $inputCode): bool
    {
        return strlen($inputCode) !== 6 || preg_match('/[A-Z-]/', $inputCode) === 1;
    }

    private function clearStale(): void
    {
        TwoFactorChallenge::query()
            ->where('expires_at', '<', now())
            ->orWhereNotNull('consumed_at')
            ->delete();
    }

    private function generateNumericCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    private function sendCode(User $user, string $code, string $purpose): void
    {
        $subject = match ($purpose) {
            TwoFactorChallenge::PURPOSE_ENABLE => 'Story Forge: enable 2FA',
            TwoFactorChallenge::PURPOSE_DISABLE => 'Story Forge: disable 2FA',
            default => 'Story Forge: login code',
        };

        $text = match ($purpose) {
            TwoFactorChallenge::PURPOSE_ENABLE =>
                "Code to enable two-factor authentication: {$code}. The code is valid for 10 minutes.",
            TwoFactorChallenge::PURPOSE_DISABLE =>
                "Code to disable two-factor authentication: {$code}. The code is valid for 10 minutes.",
            default =>
                "Code to confirm sign in: {$code}. The code is valid for 10 minutes.",
        };

        try {
            Mail::raw($text, function ($message) use ($user, $subject) {
                $message->to($user->email)->subject($subject);
            });
        } catch (\Throwable $error) {
            Log::warning('Two-factor email delivery failed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'purpose' => $purpose,
                'error' => $error->getMessage(),
            ]);
        }
    }
}
