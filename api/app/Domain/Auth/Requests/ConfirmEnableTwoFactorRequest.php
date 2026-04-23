<?php

namespace App\Domain\Auth\Requests;

use App\Domain\Auth\DTO\ConfirmTwoFactorData;
use Illuminate\Foundation\Http\FormRequest;

class ConfirmEnableTwoFactorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'challenge_token' => ['required', 'string', 'min:32'],
            'code' => ['required', 'string', 'size:6', 'regex:/^[0-9]{6}$/'],
        ];
    }

    public function toDto(): ConfirmTwoFactorData
    {
        return new ConfirmTwoFactorData(
            (string) $this->string('challenge_token'),
            (string) $this->string('code'),
        );
    }
}
