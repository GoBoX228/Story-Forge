<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\AssetCollectionStoreData;
use Illuminate\Foundation\Http\FormRequest;

class AssetCollectionStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ];
    }

    public function toDto(): AssetCollectionStoreData
    {
        return new AssetCollectionStoreData(
            $this->validated('name'),
            $this->validated('description')
        );
    }
}
