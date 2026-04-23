<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Auth\Support\AuthConfig;
use App\Models\User;

class LoginLockAction
{
    public function isTemporarilyLocked(User $user): bool
    {
        if (!$user->locked_until) {
            return false;
        }

        if ($user->locked_until->isPast()) {
            $this->clearFailedAttempts($user);
            return false;
        }

        return true;
    }

    public function retryAfterSeconds(User $user): int
    {
        if (!$user->locked_until) {
            return 0;
        }

        return max(0, now()->diffInSeconds($user->locked_until, false));
    }

    public function registerFailedAttempt(User $user): array
    {
        $attempts = ((int) $user->failed_login_attempts) + 1;

        if ($attempts >= AuthConfig::LOGIN_MAX_FAILED_ATTEMPTS) {
            $user->failed_login_attempts = 0;
            $user->locked_until = now()->addMinutes(AuthConfig::LOGIN_LOCK_MINUTES);
            $user->save();

            return [
                'locked' => true,
                'retry_after' => $this->retryAfterSeconds($user),
            ];
        }

        $user->failed_login_attempts = $attempts;
        $user->save();

        return [
            'locked' => false,
            'retry_after' => 0,
        ];
    }

    public function clearFailedAttempts(User $user): void
    {
        if ((int) $user->failed_login_attempts === 0 && $user->locked_until === null) {
            return;
        }

        $user->failed_login_attempts = 0;
        $user->locked_until = null;
        $user->save();
    }
}
