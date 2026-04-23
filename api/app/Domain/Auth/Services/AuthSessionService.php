<?php

namespace App\Domain\Auth\Services;

use App\Domain\Auth\Actions\CreateUserAction;
use App\Domain\Auth\Actions\IssueTokensAction;
use App\Domain\Auth\Actions\LoginLockAction;
use App\Domain\Auth\Actions\RefreshTokenAction;
use App\Domain\Auth\Actions\TwoFactorChallengeAction;
use App\Domain\Auth\DTO\LoginData;
use App\Domain\Auth\DTO\RegisterData;
use App\Models\TwoFactorChallenge;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthSessionService
{
    public function __construct(
        private readonly CreateUserAction $createUserAction,
        private readonly IssueTokensAction $issueTokensAction,
        private readonly LoginLockAction $loginLockAction,
        private readonly TwoFactorChallengeAction $twoFactorChallengeAction,
        private readonly RefreshTokenAction $refreshTokenAction,
    ) {
    }

    public function register(RegisterData $data): array
    {
        $user = $this->createUserAction->execute($data);
        $tokens = $this->issueTokensAction->execute($user);

        return [
            'status' => 'success',
            'tokens' => $tokens,
        ];
    }

    public function login(LoginData $data): array
    {
        $user = User::query()->where('email', $data->email)->first();

        if ($user && $this->loginLockAction->isTemporarilyLocked($user)) {
            return [
                'status' => 'locked',
                'message' => 'Account is temporarily locked due to failed sign-in attempts',
                'retry_after' => $this->loginLockAction->retryAfterSeconds($user),
            ];
        }

        if (!$user || !Hash::check($data->password, $user->password)) {
            if ($user) {
                $lockInfo = $this->loginLockAction->registerFailedAttempt($user);
                if ($lockInfo['locked'] === true) {
                    return [
                        'status' => 'locked',
                        'message' => 'Account is temporarily locked due to failed sign-in attempts',
                        'retry_after' => $lockInfo['retry_after'],
                    ];
                }
            }

            return [
                'status' => 'invalid_credentials',
                'message' => 'Invalid credentials',
            ];
        }

        $this->loginLockAction->clearFailedAttempts($user);

        if (!$user->isActive()) {
            return [
                'status' => 'banned',
                'message' => 'Account is banned',
            ];
        }

        if ($user->two_factor_enabled) {
            $challenge = $this->twoFactorChallengeAction->create($user, TwoFactorChallenge::PURPOSE_LOGIN);

            return [
                'status' => 'requires_2fa',
                'challenge' => $challenge,
                'message' => 'Two-factor code sent',
            ];
        }

        $tokens = $this->issueTokensAction->execute($user);

        return [
            'status' => 'success',
            'tokens' => $tokens,
        ];
    }

    public function refresh(?string $refreshToken): array
    {
        if (!$refreshToken) {
            return [
                'status' => 'missing',
                'message' => 'Refresh token missing',
            ];
        }

        $record = $this->refreshTokenAction->resolve($refreshToken);
        if (!$record) {
            return [
                'status' => 'invalid',
                'message' => 'Refresh token invalid',
            ];
        }

        $user = $record->user;
        if (!$user || !$user->isActive()) {
            $record->delete();

            return [
                'status' => 'invalid',
                'message' => 'Refresh token invalid',
            ];
        }

        $record->delete();
        $tokens = $this->issueTokensAction->execute($user);

        return [
            'status' => 'success',
            'tokens' => $tokens,
        ];
    }

    public function logout(?User $user): void
    {
        if (!$user) {
            return;
        }

        $user->tokens()->delete();
        $this->refreshTokenAction->revokeForUser($user);
    }
}
