<?php

namespace App\Domain\Auth\Services;

use App\Domain\Auth\Actions\DeleteStoredPublicFileAction;
use App\Domain\Auth\DTO\UpdateProfileData;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class ProfileService
{
    public function __construct(
        private readonly DeleteStoredPublicFileAction $deleteStoredPublicFileAction,
    ) {
    }

    public function update(User $user, UpdateProfileData $data, string $baseUrl): User
    {
        if ($data->removeAvatar) {
            $this->deleteStoredPublicFileAction->execute($user->avatar_url);
            $user->avatar_url = null;
        }

        if ($data->removeBanner) {
            $this->deleteStoredPublicFileAction->execute($user->banner_url);
            $user->banner_url = null;
        }

        if ($data->avatarFile) {
            $this->deleteStoredPublicFileAction->execute($user->avatar_url);
            $avatarPath = $data->avatarFile->store('profile/avatars', 'public');
            $user->avatar_url = rtrim($baseUrl, '/') . Storage::url($avatarPath);
        }

        if ($data->bannerFile) {
            $this->deleteStoredPublicFileAction->execute($user->banner_url);
            $bannerPath = $data->bannerFile->store('profile/banners', 'public');
            $user->banner_url = rtrim($baseUrl, '/') . Storage::url($bannerPath);
        }

        $user->name = $data->name;
        $user->email = $data->email;
        $user->bio = $data->bio;
        $user->save();

        return $user->fresh();
    }
}
