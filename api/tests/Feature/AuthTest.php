<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Contracts\Auth\Access\Gate as GateContract;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_returns_user_and_refresh_cookie_without_access_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password#123',
            'password_confirmation' => 'Password#123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'role', 'status'],
            ])
            ->assertJsonMissingPath('access_token')
            ->assertJsonMissingPath('token_type')
            ->assertJsonMissingPath('expires_in')
            ->assertCookie('refresh_token');
    }

    public function test_register_rejects_weak_password(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'weak@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_register_requires_matching_password_confirmation(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'mismatch@example.com',
            'password' => 'Password#123',
            'password_confirmation' => 'Password#321',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_login_returns_user_and_refresh_cookie_without_access_token(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'role', 'status'],
            ])
            ->assertJsonMissingPath('access_token')
            ->assertJsonMissingPath('token_type')
            ->assertJsonMissingPath('expires_in')
            ->assertCookie('refresh_token');
    }

    public function test_login_endpoint_is_rate_limited(): void
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
                ->postJson('/api/auth/login', [
                    'email' => 'missing@example.com',
                    'password' => 'wrong-password',
                ])->assertStatus(401);
        }

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
            ->postJson('/api/auth/login', [
                'email' => 'missing@example.com',
                'password' => 'wrong-password',
            ])->assertStatus(429);
    }

    public function test_refresh_token_is_rotated_and_cannot_be_reused(): void
    {
        $user = User::factory()->create();
        $issuedTokens = app(\App\Domain\Auth\Actions\IssueTokensAction::class)->execute($user);
        $oldRefreshToken = $issuedTokens->refreshCookie->getValue();

        $this->assertDatabaseHas('refresh_tokens', [
            'token_hash' => hash('sha256', $oldRefreshToken),
        ]);

        $refresh = app(\App\Domain\Auth\Services\AuthSessionService::class)->refresh($oldRefreshToken);

        $this->assertSame('success', $refresh['status']);
        $newRefreshToken = $refresh['tokens']->refreshCookie->getValue();
        $this->assertNotSame($oldRefreshToken, $newRefreshToken);
        $this->assertDatabaseMissing('refresh_tokens', [
            'token_hash' => hash('sha256', $oldRefreshToken),
        ]);
        $this->assertDatabaseHas('refresh_tokens', [
            'token_hash' => hash('sha256', $newRefreshToken),
        ]);

        $reused = app(\App\Domain\Auth\Services\AuthSessionService::class)->refresh($oldRefreshToken);

        $this->assertSame('invalid', $reused['status']);
    }

    public function test_logout_revokes_refresh_cookie_session(): void
    {
        $login = $this->postJson('/api/auth/register', [
            'name' => 'Logout User',
            'email' => 'logout@example.com',
            'password' => 'Password#123',
            'password_confirmation' => 'Password#123',
        ]);

        $login->assertStatus(200)->assertCookie('refresh_token');

        $refreshToken = $this->refreshCookieValue($login);
        $userId = $login->json('user.id');

        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $userId,
        ]);
        $this->assertDatabaseHas('refresh_tokens', [
            'user_id' => $userId,
            'token_hash' => hash('sha256', $refreshToken),
        ]);

        $csrf = $this->csrfTokenPair();

        $this->withCredentials()
            ->withUnencryptedCookie('refresh_token', $refreshToken)
            ->withUnencryptedCookie('csrf_token_signature', $csrf['signature'])
            ->withHeader('X-CSRF-TOKEN', $csrf['token'])
            ->postJson('/api/auth/logout')
            ->assertStatus(200)
            ->assertCookieExpired('refresh_token');

        $this->assertDatabaseMissing('refresh_tokens', [
            'user_id' => $userId,
        ]);
    }

    public function test_login_returns_two_factor_challenge_when_enabled(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password123'),
            'two_factor_enabled' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $response->assertStatus(202)
            ->assertJsonStructure([
                'requires_2fa',
                'challenge_token',
                'expires_in',
            ])
            ->assertJsonPath('requires_2fa', true);
    }

    public function test_two_factor_challenge_does_not_expose_dev_code_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        $user = User::factory()->create([
            'password' => bcrypt('password123'),
            'two_factor_enabled' => true,
        ]);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertStatus(202)
            ->assertJsonPath('requires_2fa', true)
            ->assertJsonPath('dev_code', null);
    }

    public function test_two_factor_verify_returns_user_and_refresh_cookie_after_login_challenge(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password123'),
            'two_factor_enabled' => true,
        ]);

        $challenge = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $challenge->assertStatus(202);
        $challengeToken = $challenge->json('challenge_token');
        $code = $challenge->json('dev_code');

        $verify = $this->postJson('/api/auth/2fa/verify', [
            'challenge_token' => $challengeToken,
            'code' => $code,
        ]);

        $verify->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'role', 'status'],
            ])
            ->assertJsonMissingPath('access_token')
            ->assertJsonMissingPath('token_type')
            ->assertJsonMissingPath('expires_in')
            ->assertCookie('refresh_token');
    }

    public function test_two_factor_resend_is_rate_limited_and_then_succeeds(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password123'),
            'two_factor_enabled' => true,
        ]);

        $challenge = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $challenge->assertStatus(202);
        $challengeToken = $challenge->json('challenge_token');

        $this->postJson('/api/auth/2fa/resend', [
            'challenge_token' => $challengeToken,
        ])->assertStatus(429)
            ->assertJsonStructure(['message', 'retry_after']);

        $this->travel(31)->seconds();

        $this->postJson('/api/auth/2fa/resend', [
            'challenge_token' => $challengeToken,
        ])->assertStatus(200)
            ->assertJsonPath('challenge_token', $challengeToken)
            ->assertJsonStructure(['expires_in', 'retry_after', 'delivery']);
    }

    public function test_two_factor_recovery_code_can_only_be_used_once(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password123'),
            'two_factor_enabled' => false,
        ]);

        Sanctum::actingAs($user);

        $enableRequest = $this->postJson('/api/auth/2fa/enable');
        $enableRequest->assertStatus(200);

        $enableConfirm = $this->postJson('/api/auth/2fa/enable/confirm', [
            'challenge_token' => $enableRequest->json('challenge_token'),
            'code' => $enableRequest->json('dev_code'),
        ]);

        $enableConfirm->assertStatus(200)
            ->assertJsonStructure(['recovery_codes']);

        $recoveryCode = $enableConfirm->json('recovery_codes.0');
        $this->assertIsString($recoveryCode);

        $challenge1 = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);
        $challenge1->assertStatus(202);

        $this->postJson('/api/auth/2fa/verify', [
            'challenge_token' => $challenge1->json('challenge_token'),
            'code' => $recoveryCode,
        ])->assertStatus(200);

        $challenge2 = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);
        $challenge2->assertStatus(202);

        $this->postJson('/api/auth/2fa/verify', [
            'challenge_token' => $challenge2->json('challenge_token'),
            'code' => $recoveryCode,
        ])->assertStatus(401)
            ->assertJson(['message' => 'Invalid verification code']);
    }

    public function test_user_can_enable_and_disable_two_factor(): void
    {
        $user = User::factory()->create([
            'two_factor_enabled' => false,
        ]);
        Sanctum::actingAs($user);

        $enableRequest = $this->postJson('/api/auth/2fa/enable');
        $enableRequest->assertStatus(200);

        $this->postJson('/api/auth/2fa/enable/confirm', [
            'challenge_token' => $enableRequest->json('challenge_token'),
            'code' => $enableRequest->json('dev_code'),
        ])->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'two_factor_enabled' => true,
        ]);

        $disableRequest = $this->postJson('/api/auth/2fa/disable');
        $disableRequest->assertStatus(200);

        $this->postJson('/api/auth/2fa/disable/confirm', [
            'challenge_token' => $disableRequest->json('challenge_token'),
            'code' => $disableRequest->json('dev_code'),
        ])->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'two_factor_enabled' => false,
        ]);
    }

    public function test_user_can_reset_password_with_email_code(): void
    {
        $user = User::factory()->create([
            'email' => 'reset@example.com',
            'password' => bcrypt('OldPassword#123'),
        ]);

        $forgot = $this->postJson('/api/auth/password/forgot', [
            'email' => $user->email,
        ]);

        $forgot->assertStatus(200)
            ->assertJsonStructure(['message']);

        $devCode = $forgot->json('dev_code');
        if (!is_string($devCode) || strlen($devCode) !== 6) {
            $record = DB::table('password_reset_tokens')->where('email', $user->email)->first();
            $this->assertNotNull($record);
            $this->fail('Testing environment must expose dev_code for password reset tests.');
        }

        $reset = $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => $devCode,
            'password' => 'NewPassword#123',
            'password_confirmation' => 'NewPassword#123',
        ]);

        $reset->assertStatus(200);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'OldPassword#123',
        ])->assertStatus(401);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'NewPassword#123',
        ])->assertStatus(200);
    }

    public function test_reset_password_rejects_expired_token(): void
    {
        $user = User::factory()->create([
            'email' => 'expired@example.com',
            'password' => bcrypt('OldPassword#123'),
        ]);

        $forgot = $this->postJson('/api/auth/password/forgot', [
            'email' => $user->email,
        ]);

        $forgot->assertStatus(200);
        $code = $forgot->json('dev_code');
        $this->assertIsString($code);

        $this->travel(config('auth.passwords.users.expire') + 1)->minutes();

        $this->postJson('/api/auth/password/reset', [
            'email' => $user->email,
            'token' => $code,
            'password' => 'NewPassword#123',
            'password_confirmation' => 'NewPassword#123',
        ])->assertStatus(422)
            ->assertJson(['message' => 'Password reset token is invalid or expired']);
    }

    public function test_forgot_password_returns_dev_code_for_unknown_email_in_testing(): void
    {
        $email = 'unknown@example.com';

        $response = $this->postJson('/api/auth/password/forgot', [
            'email' => $email,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'dev_code_usable' => false,
            ]);

        $devCode = $response->json('dev_code');
        $this->assertIsString($devCode);
        $this->assertMatchesRegularExpression('/^[0-9]{6}$/', $devCode);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $email]);
    }

    public function test_forgot_password_does_not_expose_dev_code_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        $user = User::factory()->create([
            'email' => 'prod-reset@example.com',
        ]);

        $this->postJson('/api/auth/password/forgot', [
            'email' => $user->email,
        ])->assertStatus(200)
            ->assertJsonPath('dev_code', null)
            ->assertJsonPath('dev_code_usable', null);

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => $user->email,
        ]);
    }

    public function test_login_is_temporarily_locked_after_failed_attempts(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('Password#123'),
        ]);

        for ($attempt = 1; $attempt <= 4; $attempt++) {
            $this->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'WrongPassword#123',
            ])->assertStatus(401);
        }

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'WrongPassword#123',
        ])->assertStatus(423);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'Password#123',
        ])->assertStatus(423);

        $this->travel(16)->minutes();

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'Password#123',
        ])->assertStatus(200);
    }

    public function test_authenticated_user_can_change_password(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('OldPassword#123'),
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/auth/password/change', [
            'current_password' => 'OldPassword#123',
            'password' => 'NewPassword#123',
            'password_confirmation' => 'NewPassword#123',
        ])->assertStatus(200);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'OldPassword#123',
        ])->assertStatus(401);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'NewPassword#123',
        ])->assertStatus(200);
    }

    public function test_change_password_requires_valid_current_password(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('OldPassword#123'),
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/auth/password/change', [
            'current_password' => 'WrongPassword#123',
            'password' => 'NewPassword#123',
            'password_confirmation' => 'NewPassword#123',
        ])->assertStatus(422);
    }

    public function test_change_password_rejects_same_as_current_password(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('OldPassword#123'),
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/auth/password/change', [
            'current_password' => 'OldPassword#123',
            'password' => 'OldPassword#123',
            'password_confirmation' => 'OldPassword#123',
        ])->assertStatus(422);
    }

    public function test_authenticated_user_can_update_profile(): void
    {
        $user = User::factory()->create([
            'name' => 'Old Name',
            'email' => 'old@example.com',
        ]);
        Sanctum::actingAs($user);

        $response = $this->patchJson('/api/me', [
            'name' => 'New Name',
            'email' => 'new@example.com',
            'bio' => 'GM bio',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'name' => 'New Name',
                'email' => 'new@example.com',
                'bio' => 'GM bio',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name',
            'email' => 'new@example.com',
            'bio' => 'GM bio',
        ]);
    }

    public function test_authenticated_user_can_upload_profile_images(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $tinyPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgL6dNwAAAABJRU5ErkJggg==');

        $response = $this->patch('/api/me', [
            'name' => 'Image User',
            'email' => 'image@example.com',
            'avatar_file' => UploadedFile::fake()->createWithContent('avatar.png', $tinyPng),
            'banner_file' => UploadedFile::fake()->createWithContent('banner.png', $tinyPng),
        ], ['Accept' => 'application/json']);

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Image User')
            ->assertJsonPath('email', 'image@example.com');

        $avatarUrl = $response->json('avatar_url');
        $bannerUrl = $response->json('banner_url');

        $this->assertIsString($avatarUrl);
        $this->assertIsString($bannerUrl);
        $this->assertStringContainsString('/storage/profile/avatars/', $avatarUrl);
        $this->assertStringContainsString('/storage/profile/banners/', $bannerUrl);
        $this->assertStringNotContainsString('avatar.png', $avatarUrl);
        $this->assertStringNotContainsString('banner.png', $bannerUrl);

        $avatarPath = ltrim(str_replace('/storage/', '', parse_url($avatarUrl, PHP_URL_PATH) ?? ''), '/');
        $bannerPath = ltrim(str_replace('/storage/', '', parse_url($bannerUrl, PHP_URL_PATH) ?? ''), '/');

        Storage::disk('public')->assertExists($avatarPath);
        Storage::disk('public')->assertExists($bannerPath);
    }

    public function test_profile_image_upload_rejects_unsafe_public_file_types(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->patch('/api/me', [
            'name' => 'Unsafe User',
            'email' => 'unsafe@example.com',
            'avatar_file' => UploadedFile::fake()->create('avatar.svg', 1, 'image/svg+xml'),
        ], ['Accept' => 'application/json'])->assertStatus(422);

        $this->patch('/api/me', [
            'name' => 'Unsafe User',
            'email' => 'unsafe@example.com',
            'banner_file' => UploadedFile::fake()->create('banner.html', 1, 'text/html'),
        ], ['Accept' => 'application/json'])->assertStatus(422);

        $this->patch('/api/me', [
            'name' => 'Unsafe User',
            'email' => 'unsafe@example.com',
            'avatar_file' => UploadedFile::fake()->create('avatar.php.jpg', 1, 'image/jpeg'),
        ], ['Accept' => 'application/json'])->assertStatus(422);
    }

    public function test_refresh_cookie_authenticates_protected_api_without_bearer_token(): void
    {
        $user = User::factory()->create();
        $issuedTokens = app(\App\Domain\Auth\Actions\IssueTokensAction::class)->execute($user);
        $refreshToken = $issuedTokens->refreshCookie->getValue();

        $this->getJson('/api/me')->assertStatus(401);

        $this->withCredentials()
            ->withUnencryptedCookie('refresh_token', $refreshToken)
            ->getJson('/api/me')
            ->assertStatus(200)
            ->assertJsonPath('id', $user->id);
    }

    public function test_refresh_endpoint_requires_csrf_header_with_refresh_cookie(): void
    {
        $user = User::factory()->create();
        $issuedTokens = app(\App\Domain\Auth\Actions\IssueTokensAction::class)->execute($user);
        $refreshToken = $issuedTokens->refreshCookie->getValue();

        $this->withCredentials()
            ->withUnencryptedCookie('refresh_token', $refreshToken)
            ->postJson('/api/auth/refresh')
            ->assertStatus(419)
            ->assertCookieExpired('csrf_token_signature');

        $csrf = $this->csrfTokenPair();

        $this->withCredentials()
            ->withUnencryptedCookie('refresh_token', $refreshToken)
            ->withUnencryptedCookie('csrf_token_signature', $csrf['signature'])
            ->withHeader('X-CSRF-TOKEN', $csrf['token'])
            ->postJson('/api/auth/refresh')
            ->assertStatus(200)
            ->assertJsonStructure(['user'])
            ->assertCookie('refresh_token');
    }

    public function test_csrf_endpoint_issues_token_and_http_only_signature_cookie(): void
    {
        $response = $this->getJson('/api/auth/csrf')
            ->assertStatus(200)
            ->assertJsonStructure(['csrf_token'])
            ->assertCookie('csrf_token_signature');

        $cookie = $response->getCookie('csrf_token_signature', false);

        $this->assertNotEmpty($response->json('csrf_token'));
        $this->assertNotNull($cookie);
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('lax', strtolower((string) $cookie->getSameSite()));
    }

    public function test_user_auth_policy_allows_only_self_for_profile_actions(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $gate = app(GateContract::class)->forUser($owner);

        $this->assertTrue($gate->allows('viewMe', $owner));
        $this->assertFalse($gate->allows('viewMe', $other));
        $this->assertTrue($gate->allows('updateMe', $owner));
        $this->assertFalse($gate->allows('updateMe', $other));
        $this->assertTrue($gate->allows('changePassword', $owner));
        $this->assertFalse($gate->allows('changePassword', $other));
        $this->assertTrue($gate->allows('manageTwoFactor', $owner));
        $this->assertFalse($gate->allows('manageTwoFactor', $other));
    }

    private function refreshCookieValue($response): string
    {
        $cookie = $response->getCookie('refresh_token', false);

        if ($cookie) {
            return $cookie->getValue();
        }

        $this->fail('Response does not contain refresh_token cookie.');
    }

    private function csrfTokenPair(): array
    {
        $response = $this->getJson('/api/auth/csrf')->assertStatus(200);
        $cookie = $response->getCookie('csrf_token_signature', false);

        if (!$cookie) {
            $this->fail('Response does not contain csrf_token_signature cookie.');
        }

        return [
            'token' => $response->json('csrf_token'),
            'signature' => $cookie->getValue(),
        ];
    }
}
