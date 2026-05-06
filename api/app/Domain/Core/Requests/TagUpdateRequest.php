<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\TagUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class TagUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:64'],
        ];
    }

    public function toDto(): TagUpdateData
    {
        return new TagUpdateData($this->validated('name'));
    }
}
