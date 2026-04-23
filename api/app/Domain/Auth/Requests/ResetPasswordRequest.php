<?php

namespace App\Domain\Auth\Requests;

use App\Domain\Auth\DTO\ResetPasswordData;
use App\Domain\Auth\Support\AuthValidationRules;
use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'token' => ['required', 'string', 'size:6', 'regex:/^[0-9]{6}$/'],
            'password' => array_merge(AuthValidationRules::strongPassword(), ['confirmed']),
        ];
    }

    public function toDto(): ResetPasswordData
    {
        return new ResetPasswordData(
            (string) $this->string('email'),
            (string) $this->string('token'),
            (string) $this->string('password'),
        );
    }
}
