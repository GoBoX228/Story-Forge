<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\WorldEntityStoreData;
use Illuminate\Foundation\Http\FormRequest;

class LocationStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'campaign_id' => ['nullable', 'integer'],
            'metadata' => ['nullable', 'array'],
        ];
    }

    public function toDto(): WorldEntityStoreData
    {
        return new WorldEntityStoreData($this->validated());
    }
}
