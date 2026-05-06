<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\TagStoreData;
use Illuminate\Foundation\Http\FormRequest;

class TagStoreRequest extends FormRequest
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

    public function toDto(): TagStoreData
    {
        return new TagStoreData($this->validated('name'));
    }
}
