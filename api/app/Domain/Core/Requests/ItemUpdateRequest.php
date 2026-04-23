<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ItemUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class ItemUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:100'],
            'rarity' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'modifiers' => ['nullable', 'array'],
            'modifiers.*.stat' => ['required_with:modifiers', 'string', 'max:32'],
            'modifiers.*.value' => ['required_with:modifiers', 'numeric'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'value' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function toDto(): ItemUpdateData
    {
        return new ItemUpdateData($this->validated());
    }
}
