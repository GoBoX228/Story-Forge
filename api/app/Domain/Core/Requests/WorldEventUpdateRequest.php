<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\WorldEntityUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class WorldEventUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date', 'after_or_equal:starts_at'],
            'campaign_id' => ['sometimes', 'nullable', 'integer'],
            'metadata' => ['sometimes', 'nullable', 'array'],
        ];
    }

    public function toDto(): WorldEntityUpdateData
    {
        return new WorldEntityUpdateData($this->validated());
    }
}
