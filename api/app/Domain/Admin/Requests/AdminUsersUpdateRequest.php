<?php

namespace App\Domain\Admin\Requests;

use App\Domain\Admin\DTO\UpdateUserData;
use Illuminate\Foundation\Http\FormRequest;

class AdminUsersUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'role' => ['sometimes', 'string', 'in:user,moderator,admin'],
            'status' => ['sometimes', 'string', 'in:active,muted,banned'],
        ];
    }

    public function toDto(): UpdateUserData
    {
        return new UpdateUserData(
            $this->has('role'),
            $this->has('role') ? (string) $this->input('role') : null,
            $this->has('status'),
            $this->has('status') ? (string) $this->input('status') : null,
        );
    }
}
