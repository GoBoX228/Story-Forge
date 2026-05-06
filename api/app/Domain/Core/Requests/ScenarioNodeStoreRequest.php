<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ScenarioNodeStoreData;
use Illuminate\Foundation\Http\FormRequest;

class ScenarioNodeStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'max:32'],
            'title' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'position' => ['nullable', 'array'],
            'config' => ['nullable', 'array'],
            'order_index' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function toDto(): ScenarioNodeStoreData
    {
        return new ScenarioNodeStoreData($this->validated());
    }
}
