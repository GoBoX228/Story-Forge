<?php

namespace App\Http\Controllers\Auth;

use App\Domain\Auth\Requests\UpdateProfileRequest;
use App\Domain\Auth\Resources\UserResource;
use App\Domain\Auth\Services\ProfileService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(
        private readonly ProfileService $profileService,
    ) {
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorize('viewMe', $user);

        return response()->json((new UserResource($user))->resolve($request));
    }

    public function updateMe(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorize('updateMe', $user);

        $updated = $this->profileService->update(
            $user,
            $request->toDto(),
            $request->getSchemeAndHttpHost()
        );

        return response()->json((new UserResource($updated))->resolve($request));
    }
}
