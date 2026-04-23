<?php

namespace App\Domain\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RefreshRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [];
    }

    public function refreshToken(): ?string
    {
        $token = $this->cookie('refresh_token');
        return is_string($token) && $token !== '' ? $token : null;
    }
}
