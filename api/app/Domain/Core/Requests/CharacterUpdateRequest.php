<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\CharacterUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class CharacterUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:50'],
            'race' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'stats' => ['nullable', 'array'],
            'inventory' => ['nullable', 'array'],
            'campaign_id' => ['nullable', 'integer'],
            'group_id' => ['nullable', 'integer'],
        ];
    }

    public function toDto(): CharacterUpdateData
    {
        return new CharacterUpdateData($this->validated());
    }
}
