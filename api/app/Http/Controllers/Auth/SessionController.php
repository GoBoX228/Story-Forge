<?php

namespace App\Http\Controllers\Auth;

use App\Domain\Auth\Actions\ForgetRefreshCookieAction;
use App\Domain\Auth\DTO\IssuedTokensData;
use App\Domain\Auth\Requests\LoginRequest;
use App\Domain\Auth\Requests\LogoutRequest;
use App\Domain\Auth\Requests\RefreshRequest;
use App\Domain\Auth\Requests\RegisterRequest;
use App\Domain\Auth\Resources\AuthTokensResource;
use App\Domain\Auth\Resources\TwoFactorChallengeResource;
use App\Domain\Auth\Services\AuthSessionService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class SessionController extends Controller
{
    public function __construct(
        private readonly AuthSessionService $authSessionService,
        private readonly ForgetRefreshCookieAction $forgetRefreshCookieAction,
    ) {
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authSessionService->register($request->toDto());

        return $this->tokensResponse($result['tokens']);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authSessionService->login($request->toDto());

        return match ($result['status']) {
            'locked' => response()->json([
                'message' => $result['message'],
                'retry_after' => $result['retry_after'],
            ], 423),
            'invalid_credentials' => response()->json(['message' => $result['message']], 401),
            'banned' => response()->json(['message' => $result['message']], 403),
            'requires_2fa' => response()->json(array_merge(
                ['requires_2fa' => true],
                (new TwoFactorChallengeResource($result['challenge']))->resolve($request),
                ['message' => $result['message']]
            ), 202),
            default => $this->tokensResponse($result['tokens']),
        };
    }

    public function refresh(RefreshRequest $request): JsonResponse
    {
        $result = $this->authSessionService->refresh($request->refreshToken());

        return match ($result['status']) {
            'missing' => response()->json(['message' => $result['message']], 401),
            'invalid' => response()->json(['message' => $result['message']], 401),
            default => $this->tokensResponse($result['tokens']),
        };
    }

    public function logout(LogoutRequest $request): JsonResponse
    {
        $this->authSessionService->logout($request->user());

        return response()->json(['message' => 'Logged out'])
            ->withCookie($this->forgetRefreshCookieAction->execute());
    }

    private function tokensResponse(IssuedTokensData $tokens): JsonResponse
    {
        return response()
            ->json((new AuthTokensResource($tokens))->resolve())
            ->withCookie($tokens->refreshCookie);
    }
}
