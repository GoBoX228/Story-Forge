<?php

namespace App\Domain\Auth\Services;

use App\Domain\Auth\Actions\IssueTokensAction;
use App\Domain\Auth\Actions\TwoFactorChallengeAction;
use App\Domain\Auth\Actions\TwoFactorRecoveryCodeAction;
use App\Domain\Auth\DTO\ConfirmTwoFactorData;
use App\Domain\Auth\DTO\ResendTwoFactorData;
use App\Domain\Auth\DTO\VerifyTwoFactorData;
use App\Models\TwoFactorChallenge;
use App\Models\User;

class TwoFactorService
{
    public function __construct(
        private readonly TwoFactorChallengeAction $challengeAction,
        private readonly TwoFactorRecoveryCodeAction $recoveryCodeAction,
        private readonly IssueTokensAction $issueTokensAction,
    ) {
    }

    public function verifyLoginChallenge(VerifyTwoFactorData $data): array
    {
        $challenge = $this->challengeAction->resolve($data->challengeToken, TwoFactorChallenge::PURPOSE_LOGIN);
        if (!$challenge) {
            return [
                'status' => 'invalid_challenge',
                'message' => 'Two-factor challenge invalid',
            ];
        }

        $user = $challenge->user;
        $inputCode = $this->challengeAction->normalizeInputCode($data->code);

        if ($this->challengeAction->isRecoveryCodeInput($inputCode)) {
            if (!$user || !$this->recoveryCodeAction->consume($user, $inputCode)) {
                $this->challengeAction->incrementAttempt($challenge);
                return [
                    'status' => 'invalid_code',
                    'message' => 'Invalid verification code',
                ];
            }
        } elseif (!$this->challengeAction->verifyCode($challenge, $inputCode)) {
            return [
                'status' => 'invalid_code',
                'message' => 'Invalid verification code',
            ];
        }

        $challenge->delete();

        if (!$user || !$user->isActive()) {
            return [
                'status' => 'banned',
                'message' => 'Account is banned',
            ];
        }

        return [
            'status' => 'success',
            'tokens' => $this->issueTokensAction->execute($user),
        ];
    }

    public function resendCode(ResendTwoFactorData $data): array
    {
        $challenge = $this->challengeAction->resolve($data->challengeToken);
        if (!$challenge) {
            return [
                'status' => 'invalid_challenge',
                'message' => 'Two-factor challenge invalid',
            ];
        }

        if (!$challenge->user || !$challenge->user->isActive()) {
            $challenge->delete();
            return [
                'status' => 'banned',
                'message' => 'Account is banned',
            ];
        }

        $retryAfter = $this->challengeAction->retryAfterSeconds($challenge);
        if ($retryAfter > 0) {
            return [
                'status' => 'rate_limited',
                'message' => 'Resend is temporarily limited',
                'retry_after' => $retryAfter,
            ];
        }

        return [
            'status' => 'success',
            'challenge' => $this->challengeAction->resend($challenge, $data->challengeToken),
        ];
    }

    public function requestEnable(User $user): array
    {
        if ($user->two_factor_enabled) {
            return [
                'status' => 'already_enabled',
                'message' => 'Two-factor is already enabled',
            ];
        }

        return [
            'status' => 'success',
            'challenge' => $this->challengeAction->create($user, TwoFactorChallenge::PURPOSE_ENABLE),
        ];
    }

    public function confirmEnable(User $user, ConfirmTwoFactorData $data): array
    {
        $challenge = $this->challengeAction->resolve($data->challengeToken, TwoFactorChallenge::PURPOSE_ENABLE);
        if (!$challenge || $challenge->user_id !== $user->id) {
            return [
                'status' => 'invalid_challenge',
                'message' => 'Two-factor challenge invalid',
            ];
        }

        if (!$this->challengeAction->verifyCode($challenge, $data->code)) {
            return [
                'status' => 'invalid_code',
                'message' => 'Invalid verification code',
            ];
        }

        $user->two_factor_enabled = true;
        $user->two_factor_enabled_at = now();
        $user->save();
        $challenge->delete();

        return [
            'status' => 'success',
            'message' => 'Two-factor enabled',
            'user' => $user->fresh(),
            'recovery_codes' => $this->recoveryCodeAction->regenerate($user),
        ];
    }

    public function requestDisable(User $user): array
    {
        if (!$user->two_factor_enabled) {
            return [
                'status' => 'already_disabled',
                'message' => 'Two-factor is already disabled',
            ];
        }

        return [
            'status' => 'success',
            'challenge' => $this->challengeAction->create($user, TwoFactorChallenge::PURPOSE_DISABLE),
        ];
    }

    public function confirmDisable(User $user, ConfirmTwoFactorData $data): array
    {
        $challenge = $this->challengeAction->resolve($data->challengeToken, TwoFactorChallenge::PURPOSE_DISABLE);
        if (!$challenge || $challenge->user_id !== $user->id) {
            return [
                'status' => 'invalid_challenge',
                'message' => 'Two-factor challenge invalid',
            ];
        }

        if (!$this->challengeAction->verifyCode($challenge, $data->code)) {
            return [
                'status' => 'invalid_code',
                'message' => 'Invalid verification code',
            ];
        }

        $user->two_factor_enabled = false;
        $user->two_factor_enabled_at = null;
        $user->save();
        $challenge->delete();
        $this->recoveryCodeAction->clearForUser($user);

        return [
            'status' => 'success',
            'message' => 'Two-factor disabled',
            'user' => $user->fresh(),
        ];
    }
}
