<?php

namespace App\Domain\Auth\Requests;

use App\Domain\Auth\DTO\ForgotPasswordData;
use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
        ];
    }

    public function toDto(): ForgotPasswordData
    {
        return new ForgotPasswordData((string) $this->string('email'));
    }
}
