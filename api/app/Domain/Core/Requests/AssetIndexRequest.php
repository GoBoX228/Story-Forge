<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\AssetIndexData;
use App\Models\Asset;

class AssetIndexRequest extends CoreReadRequest
{
    public function rules(): array
    {
        return [
            'type' => ['nullable', 'string', 'in:' . implode(',', Asset::TYPES)],
            'kind' => ['nullable', 'string', 'in:' . implode(',', Asset::KINDS)],
            'folderId' => ['nullable'],
            'folder_id' => ['nullable'],
            'collectionId' => ['nullable', 'integer'],
            'collection_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function toDto(): AssetIndexData
    {
        return new AssetIndexData(
            $this->input('type'),
            $this->input('kind'),
            $this->input('folder_id', $this->input('folderId')),
            $this->input('collection_id', $this->input('collectionId')),
            $this->input('search')
        );
    }
}
