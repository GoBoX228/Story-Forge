<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Auth\Support\AuthConfig;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class PasswordResetTokenAction
{
    public function createForUser(User $user): string
    {
        $this->clearExpired();

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => hash('sha256', $code),
                'created_at' => now(),
            ]
        );

        $this->sendCode($user, $code);

        return $code;
    }

    public function findRecord(string $email): ?object
    {
        return DB::table('password_reset_tokens')->where('email', $email)->first();
    }

    public function verifyRecord(object $record, string $code): bool
    {
        if (!isset($record->token, $record->created_at)) {
            return false;
        }

        $createdAt = Carbon::parse($record->created_at);
        if ($createdAt->addMinutes(AuthConfig::passwordResetTtlMinutes())->isPast()) {
            return false;
        }

        return hash_equals((string) $record->token, hash('sha256', trim($code)));
    }

    public function deleteForEmail(string $email): void
    {
        DB::table('password_reset_tokens')->where('email', $email)->delete();
    }

    public function clearExpired(): void
    {
        DB::table('password_reset_tokens')
            ->where('created_at', '<', now()->subMinutes(AuthConfig::passwordResetTtlMinutes()))
            ->delete();
    }

    public function ttlMinutes(): int
    {
        return AuthConfig::passwordResetTtlMinutes();
    }

    private function sendCode(User $user, string $code): void
    {
        $ttl = AuthConfig::passwordResetTtlMinutes();
        $text = "Code to reset password: {$code}. The code is valid for {$ttl} minutes.";

        try {
            Mail::raw($text, function ($message) use ($user) {
                $message->to($user->email)->subject('Story Forge: password reset');
            });
        } catch (\Throwable $error) {
            Log::warning('Password reset email delivery failed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $error->getMessage(),
            ]);
        }
    }
}
