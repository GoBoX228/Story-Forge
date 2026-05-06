<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ScenarioNodeUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class ScenarioNodeUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['sometimes', 'string', 'max:32'],
            'title' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'position' => ['nullable', 'array'],
            'config' => ['nullable', 'array'],
            'order_index' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    public function toDto(): ScenarioNodeUpdateData
    {
        return new ScenarioNodeUpdateData($this->validated());
    }
}
