<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\WorldEntityUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class ChronicleUpdateRequest extends FormRequest
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
            'start_label' => ['sometimes', 'nullable', 'string', 'max:255'],
            'end_label' => ['sometimes', 'nullable', 'string', 'max:255'],
            'step_size' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:10000'],
            'campaign_id' => ['sometimes', 'nullable', 'integer'],
            'metadata' => ['sometimes', 'nullable', 'array'],
        ];
    }

    public function toDto(): WorldEntityUpdateData
    {
        return new WorldEntityUpdateData($this->validated());
    }
}
