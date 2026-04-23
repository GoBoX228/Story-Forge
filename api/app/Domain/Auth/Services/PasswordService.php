<?php

namespace App\Domain\Auth\Services;

use App\Domain\Auth\Actions\LoginLockAction;
use App\Domain\Auth\Actions\PasswordResetTokenAction;
use App\Domain\Auth\Actions\RefreshTokenAction;
use App\Domain\Auth\DTO\ChangePasswordData;
use App\Domain\Auth\DTO\ForgotPasswordData;
use App\Domain\Auth\DTO\ResetPasswordData;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class PasswordService
{
    public function __construct(
        private readonly PasswordResetTokenAction $passwordResetTokenAction,
        private readonly LoginLockAction $loginLockAction,
        private readonly RefreshTokenAction $refreshTokenAction,
    ) {
    }

    public function forgotPassword(ForgotPasswordData $data): array
    {
        $email = mb_strtolower(trim($data->email));

        /** @var User|null $user */
        $user = User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        $devCode = null;
        $devCodeUsable = false;

        if ($user) {
            $devCode = $this->passwordResetTokenAction->createForUser($user);
            $devCodeUsable = true;
        } elseif (app()->environment(['local', 'testing'])) {
            $devCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        }

        return [
            'message' => 'If an account exists for this email, a password reset code was sent',
            'expires_in' => $this->passwordResetTokenAction->ttlMinutes() * 60,
            'delivery' => 'email',
            'dev_code' => $devCode,
            'dev_code_usable' => app()->environment(['local', 'testing']) ? $devCodeUsable : null,
        ];
    }

    public function resetPassword(ResetPasswordData $data): array
    {
        $record = $this->passwordResetTokenAction->findRecord($data->email);

        if (!$record || !$this->passwordResetTokenAction->verifyRecord($record, $data->token)) {
            return [
                'status' => 'invalid_token',
                'message' => 'Password reset token is invalid or expired',
            ];
        }

        /** @var User|null $user */
        $user = User::query()->where('email', $data->email)->first();
        if (!$user) {
            $this->passwordResetTokenAction->deleteForEmail($data->email);

            return [
                'status' => 'invalid_token',
                'message' => 'Password reset token is invalid or expired',
            ];
        }

        $user->password = Hash::make($data->password);
        $this->loginLockAction->clearFailedAttempts($user);
        $user->save();

        $this->passwordResetTokenAction->deleteForEmail($data->email);
        $user->tokens()->delete();
        $this->refreshTokenAction->revokeForUser($user);

        return [
            'status' => 'success',
            'message' => 'Password has been reset',
        ];
    }

    public function changePassword(User $user, ChangePasswordData $data): array
    {
        if (!Hash::check($data->currentPassword, $user->password)) {
            return [
                'status' => 'invalid_current_password',
                'message' => 'Current password is incorrect',
            ];
        }

        if (Hash::check($data->newPassword, $user->password)) {
            return [
                'status' => 'same_password',
                'message' => 'New password must be different from current password',
            ];
        }

        $user->password = Hash::make($data->newPassword);
        $this->loginLockAction->clearFailedAttempts($user);
        $user->save();

        $this->passwordResetTokenAction->deleteForEmail($user->email);

        return [
            'status' => 'success',
            'message' => 'Password has been changed',
        ];
    }
}
