<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\EntityLinkUpdateData;
use App\Models\EntityLink;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EntityLinkUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'relation_type' => ['sometimes', 'nullable', 'string', Rule::in([
                EntityLink::RELATION_RELATED,
                EntityLink::RELATION_USES,
                EntityLink::RELATION_LOCATED_IN,
                EntityLink::RELATION_MEMBER_OF,
                EntityLink::RELATION_REWARDS,
                EntityLink::RELATION_MENTIONS,
            ])],
            'label' => ['sometimes', 'nullable', 'string', 'max:255'],
            'metadata' => ['sometimes', 'nullable', 'array'],
            'metadata.role' => ['nullable', 'string', Rule::in([
                'portrait',
                'token',
                'item_image',
                'map_background',
                'map_token',
            ])],
        ];
    }

    public function toDto(): EntityLinkUpdateData
    {
        return new EntityLinkUpdateData($this->validated());
    }
}
