<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ScenarioGroupUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class ScenarioGroupUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'order_index' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function toDto(): ScenarioGroupUpdateData
    {
        return new ScenarioGroupUpdateData($this->validated());
    }
}

