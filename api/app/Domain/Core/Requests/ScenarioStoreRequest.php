<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ScenarioStoreData;
use Illuminate\Foundation\Http\FormRequest;

class ScenarioStoreRequest extends FormRequest
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
            'campaign_id' => ['nullable', 'integer'],
        ];
    }

    public function toDto(): ScenarioStoreData
    {
        return new ScenarioStoreData($this->validated());
    }
}
