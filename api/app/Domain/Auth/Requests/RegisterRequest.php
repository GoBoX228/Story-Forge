<?php

namespace App\Domain\Auth\Requests;

use App\Domain\Auth\DTO\RegisterData;
use App\Domain\Auth\Support\AuthValidationRules;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => array_merge(AuthValidationRules::strongPassword(), ['confirmed']),
        ];
    }

    public function toDto(): RegisterData
    {
        return new RegisterData(
            (string) $this->string('name'),
            (string) $this->string('email'),
            (string) $this->string('password'),
        );
    }
}
