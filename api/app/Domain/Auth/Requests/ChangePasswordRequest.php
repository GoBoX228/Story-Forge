<?php

namespace App\Domain\Auth\Requests;

use App\Domain\Auth\DTO\ChangePasswordData;
use App\Domain\Auth\Support\AuthValidationRules;
use Illuminate\Foundation\Http\FormRequest;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'password' => array_merge(AuthValidationRules::strongPassword(), ['confirmed']),
        ];
    }

    public function toDto(): ChangePasswordData
    {
        return new ChangePasswordData(
            (string) $this->string('current_password'),
            (string) $this->string('password'),
        );
    }
}
