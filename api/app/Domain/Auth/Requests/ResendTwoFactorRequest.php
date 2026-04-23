<?php

namespace App\Domain\Auth\Requests;

use App\Domain\Auth\DTO\ResendTwoFactorData;
use Illuminate\Foundation\Http\FormRequest;

class ResendTwoFactorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'challenge_token' => ['required', 'string', 'min:32'],
        ];
    }

    public function toDto(): ResendTwoFactorData
    {
        return new ResendTwoFactorData((string) $this->string('challenge_token'));
    }
}
