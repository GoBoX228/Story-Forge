<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\WorldEntityStoreData;
use Illuminate\Foundation\Http\FormRequest;

class ChronicleStoreRequest extends FormRequest
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
            'start_label' => ['nullable', 'string', 'max:255'],
            'end_label' => ['nullable', 'string', 'max:255'],
            'step_size' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'campaign_id' => ['nullable', 'integer'],
            'metadata' => ['nullable', 'array'],
        ];
    }

    public function toDto(): WorldEntityStoreData
    {
        return new WorldEntityStoreData($this->validated());
    }
}
