<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\CampaignUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class CampaignUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'tags' => ['nullable', 'array'],
            'resources' => ['nullable', 'array'],
            'progress' => ['nullable', 'integer', 'min:0', 'max:100'],
            'last_played' => ['nullable', 'date'],
            'scenario_ids' => ['nullable', 'array'],
            'scenario_ids.*' => ['integer'],
            'map_ids' => ['nullable', 'array'],
            'map_ids.*' => ['integer'],
            'character_ids' => ['nullable', 'array'],
            'character_ids.*' => ['integer'],
        ];
    }

    public function toDto(): CampaignUpdateData
    {
        return new CampaignUpdateData($this->validated());
    }
}
