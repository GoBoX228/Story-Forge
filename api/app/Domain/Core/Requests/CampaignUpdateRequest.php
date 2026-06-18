<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\CampaignUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class CampaignUpdateRequest extends FormRequest
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
        ];
    }

    public function toDto(): CampaignUpdateData
    {
        return new CampaignUpdateData($this->validated());
    }
}
