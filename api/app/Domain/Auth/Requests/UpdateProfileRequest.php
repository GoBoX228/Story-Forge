<?php

namespace App\Domain\Auth\Requests;

use App\Domain\Auth\DTO\UpdateProfileData;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var User $user */
        $user = $this->user();

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'bio' => ['nullable', 'string', 'max:2000'],
            'avatar_file' => ['nullable', 'file', 'image', 'max:2048'],
            'banner_file' => ['nullable', 'file', 'image', 'max:4096'],
            'remove_avatar' => ['nullable', 'boolean'],
            'remove_banner' => ['nullable', 'boolean'],
        ];
    }

    public function toDto(): UpdateProfileData
    {
        $bio = $this->input('bio');
        $normalizedBio = null;

        if (is_string($bio) && trim($bio) !== '') {
            $normalizedBio = $bio;
        }

        return new UpdateProfileData(
            (string) $this->string('name'),
            (string) $this->string('email'),
            $normalizedBio,
            $this->file('avatar_file'),
            $this->file('banner_file'),
            $this->boolean('remove_avatar'),
            $this->boolean('remove_banner'),
        );
    }
}
