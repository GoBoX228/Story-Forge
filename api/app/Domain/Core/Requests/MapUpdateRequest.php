<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\MapUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class MapUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'width' => ['sometimes', 'integer', 'min:1'],
            'height' => ['sometimes', 'integer', 'min:1'],
            'cell_size' => ['sometimes', 'integer', 'min:1'],
            'data' => ['nullable', 'array'],
            'scenario_id' => ['nullable', 'integer'],
            'campaign_id' => ['nullable', 'integer'],
        ];
    }

    public function toDto(): MapUpdateData
    {
        return new MapUpdateData($this->validated());
    }
}
