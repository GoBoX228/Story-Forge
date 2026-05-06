<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\EntityLinkStoreData;
use App\Models\EntityLink;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EntityLinkStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'target_type' => ['required', 'string', Rule::in([
                EntityLink::TARGET_SCENARIO,
                EntityLink::TARGET_MAP,
                EntityLink::TARGET_CHARACTER,
                EntityLink::TARGET_ITEM,
                EntityLink::TARGET_ASSET,
                EntityLink::TARGET_LOCATION,
                EntityLink::TARGET_FACTION,
                EntityLink::TARGET_EVENT,
            ])],
            'target_id' => ['required', 'integer'],
            'relation_type' => ['nullable', 'string', Rule::in([
                EntityLink::RELATION_RELATED,
                EntityLink::RELATION_USES,
                EntityLink::RELATION_LOCATED_IN,
                EntityLink::RELATION_MEMBER_OF,
                EntityLink::RELATION_REWARDS,
                EntityLink::RELATION_MENTIONS,
            ])],
            'label' => ['nullable', 'string', 'max:255'],
            'metadata' => ['nullable', 'array'],
            'metadata.role' => ['nullable', 'string', Rule::in([
                'portrait',
                'token',
                'item_image',
                'map_background',
                'map_token',
            ])],
        ];
    }

    public function toDto(): EntityLinkStoreData
    {
        return new EntityLinkStoreData($this->validated());
    }
}
