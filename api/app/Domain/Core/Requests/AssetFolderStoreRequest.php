<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\AssetFolderStoreData;
use Illuminate\Foundation\Http\FormRequest;

class AssetFolderStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
        ];
    }

    public function toDto(): AssetFolderStoreData
    {
        return new AssetFolderStoreData($this->validated('name'));
    }
}
