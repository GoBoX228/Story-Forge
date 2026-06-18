<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\CampaignStoreData;
use Illuminate\Foundation\Http\FormRequest;

class CampaignStoreRequest extends FormRequest
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
        ];
    }

    public function toDto(): CampaignStoreData
    {
        return new CampaignStoreData($this->validated());
    }
}
