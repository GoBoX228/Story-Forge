<?php

namespace App\Domain\Auth\Requests;

use App\Domain\Auth\DTO\VerifyTwoFactorData;
use Illuminate\Foundation\Http\FormRequest;

class VerifyTwoFactorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'challenge_token' => ['required', 'string', 'min:32'],
            'code' => ['required', 'string', 'min:6', 'max:20', 'regex:/^[A-Za-z0-9-]+$/'],
        ];
    }

    public function toDto(): VerifyTwoFactorData
    {
        return new VerifyTwoFactorData(
            (string) $this->string('challenge_token'),
            (string) $this->string('code'),
        );
    }
}
