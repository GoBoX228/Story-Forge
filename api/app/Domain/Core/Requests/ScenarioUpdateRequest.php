<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ScenarioUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class ScenarioUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'campaign_id' => ['nullable', 'integer'],
        ];
    }

    public function toDto(): ScenarioUpdateData
    {
        return new ScenarioUpdateData($this->validated());
    }
}
