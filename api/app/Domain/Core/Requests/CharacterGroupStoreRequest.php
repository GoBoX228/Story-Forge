<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\CharacterGroupStoreData;
use Illuminate\Foundation\Http\FormRequest;

class CharacterGroupStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'order_index' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function toDto(): CharacterGroupStoreData
    {
        return new CharacterGroupStoreData($this->validated());
    }
}
