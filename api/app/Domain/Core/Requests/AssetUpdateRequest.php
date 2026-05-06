<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\AssetUpdateData;
use App\Models\Asset;
use Illuminate\Foundation\Http\FormRequest;

class AssetUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'string', 'in:' . implode(',', Asset::TYPES)],
            'campaign_id' => ['sometimes', 'nullable', 'integer'],
        ];
    }

    public function toDto(): AssetUpdateData
    {
        return new AssetUpdateData($this->validated());
    }
}
