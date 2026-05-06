<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\WorldEntityStoreData;
use Illuminate\Foundation\Http\FormRequest;

class WorldEventStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'campaign_id' => ['nullable', 'integer'],
            'metadata' => ['nullable', 'array'],
        ];
    }

    public function toDto(): WorldEntityStoreData
    {
        return new WorldEntityStoreData($this->validated());
    }
}
