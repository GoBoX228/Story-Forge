<?php

namespace App\Http\Controllers\Auth;

use App\Domain\Auth\Requests\ChangePasswordRequest;
use App\Domain\Auth\Requests\ForgotPasswordRequest;
use App\Domain\Auth\Requests\ResetPasswordRequest;
use App\Domain\Auth\Resources\ForgotPasswordResource;
use App\Domain\Auth\Resources\MessageResource;
use App\Domain\Auth\Services\PasswordService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class PasswordController extends Controller
{
    public function __construct(
        private readonly PasswordService $passwordService,
    ) {
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $result = $this->passwordService->forgotPassword($request->toDto());

        return response()->json((new ForgotPasswordResource($result))->resolve($request));
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $result = $this->passwordService->resetPassword($request->toDto());

        if ($result['status'] === 'invalid_token') {
            return response()->json(['message' => $result['message']], 422);
        }

        return response()->json((new MessageResource(['message' => $result['message']]))->resolve($request));
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorize('changePassword', $user);

        $result = $this->passwordService->changePassword($user, $request->toDto());

        return match ($result['status']) {
            'invalid_current_password' => response()->json(['message' => $result['message']], 422),
            'same_password' => response()->json(['message' => $result['message']], 422),
            default => response()->json((new MessageResource(['message' => $result['message']]))->resolve($request)),
        };
    }
}
