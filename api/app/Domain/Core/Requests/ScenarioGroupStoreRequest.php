<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ScenarioGroupStoreData;
use Illuminate\Foundation\Http\FormRequest;

class ScenarioGroupStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'order_index' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function toDto(): ScenarioGroupStoreData
    {
        return new ScenarioGroupStoreData($this->validated());
    }
}

