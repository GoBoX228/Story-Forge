<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\PublicationStoreData;
use App\Models\PublishedContent;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PublicationStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
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
            'metadata' => ['nullable', 'array'],
            'metadata.summary' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function toDto(): PublicationStoreData
    {
        return new PublicationStoreData($this->validated());
    }
}
