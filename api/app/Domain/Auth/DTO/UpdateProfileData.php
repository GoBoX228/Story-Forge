<?php

namespace App\Domain\Auth\DTO;

use Illuminate\Http\UploadedFile;

final readonly class UpdateProfileData
{
    public function __construct(
        public string $name,
        public string $email,
        public ?string $bio,
        public ?UploadedFile $avatarFile,
        public ?UploadedFile $bannerFile,
        public bool $removeAvatar,
        public bool $removeBanner,
    ) {
    }
}
