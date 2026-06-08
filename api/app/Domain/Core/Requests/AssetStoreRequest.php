<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\AssetStoreData;
use App\Models\Asset;
use App\Support\SafePublicUpload;
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
            'file' => [
                'required',
                'file',
                'max:10240',
                'mimetypes:image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,application/zip,application/x-zip-compressed,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation',
                SafePublicUpload::rule(['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'txt', 'zip', 'docx', 'xlsx', 'pptx']),
            ],
            'name' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'in:' . implode(',', Asset::TYPES)],
            'kind' => ['nullable', 'string', 'in:' . implode(',', Asset::KINDS)],
            'folder_id' => ['nullable', 'integer'],
            'collection_ids' => ['nullable', 'array'],
            'collection_ids.*' => ['integer'],
        ];
    }

    public function toDto(): AssetStoreData
    {
        return new AssetStoreData(
            $this->file('file'),
            $this->validated('name'),
            $this->validated('type'),
            $this->validated('kind'),
            $this->validated('folder_id'),
            $this->validated('collection_ids') ?? []
        );
    }
}
