<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\PublicationIndexData;
use App\Models\PublishedContent;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PublicationIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'scope' => ['nullable', 'string', Rule::in(['own', 'public'])],
            'type' => ['nullable', 'string', Rule::in([
                PublishedContent::TYPE_SCENARIO,
                PublishedContent::TYPE_MAP,
                PublishedContent::TYPE_CHARACTER,
                PublishedContent::TYPE_ITEM,
                PublishedContent::TYPE_ASSET,
                PublishedContent::TYPE_LOCATION,
                PublishedContent::TYPE_FACTION,
                PublishedContent::TYPE_EVENT,
            ])],
            'status' => ['nullable', 'string', Rule::in([
                PublishedContent::STATUS_DRAFT,
                PublishedContent::STATUS_PUBLISHED,
                PublishedContent::STATUS_ARCHIVED,
            ])],
            'visibility' => ['nullable', 'string', Rule::in([
                PublishedContent::VISIBILITY_PRIVATE,
                PublishedContent::VISIBILITY_UNLISTED,
                PublishedContent::VISIBILITY_PUBLIC,
            ])],
            'search' => ['nullable', 'string', 'max:120'],
        ];
    }

    public function toDto(): PublicationIndexData
    {
        $validated = $this->validated();

        return new PublicationIndexData(
            scope: $validated['scope'] ?? null,
            type: $validated['type'] ?? null,
            status: $validated['status'] ?? null,
            visibility: $validated['visibility'] ?? null,
            search: $validated['search'] ?? null,
        );
    }
}
