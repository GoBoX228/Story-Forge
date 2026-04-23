<?php

namespace App\Domain\Auth\Support;

use Illuminate\Validation\Rules\Password;

class AuthValidationRules
{
    public static function strongPassword(): array
    {
        return [
            'required',
            'string',
            'max:255',
            Password::min(8)->letters()->mixedCase()->numbers()->symbols(),
        ];
    }
}
