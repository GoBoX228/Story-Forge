<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\AssetCollectionUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class AssetCollectionUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
        ];
    }

    public function toDto(): AssetCollectionUpdateData
    {
        return new AssetCollectionUpdateData($this->validated());
    }
}
