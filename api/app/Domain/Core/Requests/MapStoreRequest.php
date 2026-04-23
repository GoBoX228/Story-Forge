<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\MapStoreData;
use Illuminate\Foundation\Http\FormRequest;

class MapStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'width' => ['required', 'integer', 'min:1'],
            'height' => ['required', 'integer', 'min:1'],
            'cell_size' => ['required', 'integer', 'min:1'],
            'data' => ['nullable', 'array'],
            'scenario_id' => ['nullable', 'integer'],
            'campaign_id' => ['nullable', 'integer'],
        ];
    }

    public function toDto(): MapStoreData
    {
        return new MapStoreData($this->validated());
    }
}
