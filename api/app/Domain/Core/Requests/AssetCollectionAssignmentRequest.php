<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\AssetCollectionAssignmentData;
use Illuminate\Foundation\Http\FormRequest;

class AssetCollectionAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'collection_ids' => ['array'],
            'collection_ids.*' => ['integer'],
        ];
    }

    public function toDto(): AssetCollectionAssignmentData
    {
        return new AssetCollectionAssignmentData($this->validated('collection_ids', []));
    }
}
