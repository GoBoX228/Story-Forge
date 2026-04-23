<?php

namespace App\Domain\Admin\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdminLogsIndexRequest extends FormRequest
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
