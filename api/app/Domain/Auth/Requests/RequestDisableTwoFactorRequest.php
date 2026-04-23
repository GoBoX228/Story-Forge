<?php

namespace App\Domain\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RequestDisableTwoFactorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [];
    }
}
