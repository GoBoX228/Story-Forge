<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\WorldEntityUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class LocationUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'campaign_id' => ['sometimes', 'nullable', 'integer'],
            'metadata' => ['sometimes', 'nullable', 'array'],
        ];
    }

    public function toDto(): WorldEntityUpdateData
    {
        return new WorldEntityUpdateData($this->validated());
    }
}
