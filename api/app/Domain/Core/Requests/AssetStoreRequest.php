<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\AssetStoreData;
use App\Models\Asset;
use Illuminate\Foundation\Http\FormRequest;

class AssetStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:10240'],
            'name' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'in:' . implode(',', Asset::TYPES)],
            'campaign_id' => ['nullable', 'integer'],
        ];
    }

    public function toDto(): AssetStoreData
    {
        return new AssetStoreData(
            $this->file('file'),
            $this->validated('name'),
            $this->validated('type'),
            $this->validated('campaign_id')
        );
    }
}
