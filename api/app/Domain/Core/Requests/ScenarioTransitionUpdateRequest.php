<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ScenarioTransitionUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class ScenarioTransitionUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_node_id' => ['sometimes', 'integer'],
            'to_node_id' => ['sometimes', 'integer'],
            'type' => ['sometimes', 'string', 'max:32'],
            'label' => ['nullable', 'string', 'max:255'],
            'condition' => ['nullable', 'array'],
            'metadata' => ['nullable', 'array'],
            'order_index' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    public function toDto(): ScenarioTransitionUpdateData
    {
        return new ScenarioTransitionUpdateData($this->validated());
    }
}
