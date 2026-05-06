<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ScenarioTransitionStoreData;
use Illuminate\Foundation\Http\FormRequest;

class ScenarioTransitionStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_node_id' => ['required', 'integer'],
            'to_node_id' => ['required', 'integer'],
            'type' => ['nullable', 'string', 'max:32'],
            'label' => ['nullable', 'string', 'max:255'],
            'condition' => ['nullable', 'array'],
            'metadata' => ['nullable', 'array'],
            'order_index' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function toDto(): ScenarioTransitionStoreData
    {
        return new ScenarioTransitionStoreData($this->validated());
    }
}
