<?php

namespace App\Http\Controllers\Auth;

use App\Domain\Auth\DTO\IssuedTokensData;
use App\Domain\Auth\Requests\ConfirmDisableTwoFactorRequest;
use App\Domain\Auth\Requests\ConfirmEnableTwoFactorRequest;
use App\Domain\Auth\Requests\RequestDisableTwoFactorRequest;
use App\Domain\Auth\Requests\RequestEnableTwoFactorRequest;
use App\Domain\Auth\Requests\ResendTwoFactorRequest;
use App\Domain\Auth\Requests\VerifyTwoFactorRequest;
use App\Domain\Auth\Resources\AuthTokensResource;
use App\Domain\Auth\Resources\MessageResource;
use App\Domain\Auth\Resources\TwoFactorChallengeResource;
use App\Domain\Auth\Resources\UserResource;
use App\Domain\Auth\Services\TwoFactorService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class TwoFactorController extends Controller
{
    public function __construct(
        private readonly TwoFactorService $twoFactorService,
    ) {
    }

    public function verifyTwoFactor(VerifyTwoFactorRequest $request): JsonResponse
    {
        $result = $this->twoFactorService->verifyLoginChallenge($request->toDto());

        return match ($result['status']) {
            'invalid_challenge' => response()->json(['message' => $result['message']], 401),
            'invalid_code' => response()->json(['message' => $result['message']], 401),
            'banned' => response()->json(['message' => $result['message']], 403),
            default => $this->tokensResponse($result['tokens']),
        };
    }

    public function resendTwoFactorCode(ResendTwoFactorRequest $request): JsonResponse
    {
        $result = $this->twoFactorService->resendCode($request->toDto());

        return match ($result['status']) {
            'invalid_challenge' => response()->json(['message' => $result['message']], 401),
            'banned' => response()->json(['message' => $result['message']], 403),
            'rate_limited' => response()->json([
                'message' => $result['message'],
                'retry_after' => $result['retry_after'],
            ], 429),
            default => response()->json((new TwoFactorChallengeResource($result['challenge']))->resolve($request)),
        };
    }

    public function requestEnableTwoFactor(RequestEnableTwoFactorRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorize('manageTwoFactor', $user);

        $result = $this->twoFactorService->requestEnable($user);

        if ($result['status'] === 'already_enabled') {
            return response()->json(['message' => $result['message']], 422);
        }

        return response()->json((new TwoFactorChallengeResource($result['challenge']))->resolve($request));
    }

    public function confirmEnableTwoFactor(ConfirmEnableTwoFactorRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorize('manageTwoFactor', $user);

        $result = $this->twoFactorService->confirmEnable($user, $request->toDto());

        return match ($result['status']) {
            'invalid_challenge' => response()->json(['message' => $result['message']], 401),
            'invalid_code' => response()->json(['message' => $result['message']], 401),
            default => response()->json([
                'message' => $result['message'],
                'user' => (new UserResource($result['user']))->resolve($request),
                'recovery_codes' => $result['recovery_codes'],
            ]),
        };
    }

    public function requestDisableTwoFactor(RequestDisableTwoFactorRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorize('manageTwoFactor', $user);

        $result = $this->twoFactorService->requestDisable($user);

        if ($result['status'] === 'already_disabled') {
            return response()->json(['message' => $result['message']], 422);
        }

        return response()->json((new TwoFactorChallengeResource($result['challenge']))->resolve($request));
    }

    public function confirmDisableTwoFactor(ConfirmDisableTwoFactorRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorize('manageTwoFactor', $user);

        $result = $this->twoFactorService->confirmDisable($user, $request->toDto());

        return match ($result['status']) {
            'invalid_challenge' => response()->json(['message' => $result['message']], 401),
            'invalid_code' => response()->json(['message' => $result['message']], 401),
            default => response()->json((new MessageResource([
                'message' => $result['message'],
                'user' => (new UserResource($result['user']))->resolve($request),
            ]))->resolve($request)),
        };
    }

    private function tokensResponse(IssuedTokensData $tokens): JsonResponse
    {
        return response()
            ->json((new AuthTokensResource($tokens))->resolve())
            ->withCookie($tokens->refreshCookie);
    }
}
