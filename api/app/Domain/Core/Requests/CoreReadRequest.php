<?php

namespace App\Domain\Core\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CoreReadRequest extends FormRequest
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
