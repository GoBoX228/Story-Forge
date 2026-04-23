<?php

namespace App\Domain\Auth\Requests;

use App\Domain\Auth\DTO\LoginData;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    public function toDto(): LoginData
    {
        return new LoginData(
            (string) $this->string('email'),
            (string) $this->string('password'),
        );
    }
}
