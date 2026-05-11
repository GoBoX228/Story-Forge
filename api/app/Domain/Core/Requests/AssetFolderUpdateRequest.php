<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\AssetFolderUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class AssetFolderUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
        ];
    }

    public function toDto(): AssetFolderUpdateData
    {
        return new AssetFolderUpdateData($this->validated());
    }
}
