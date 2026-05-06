<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ScenarioNodeEntityLinkStoreData;
use App\Models\EntityLink;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ScenarioNodeEntityLinkStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'target_type' => ['required', 'string', Rule::in([
                EntityLink::TARGET_MAP,
                EntityLink::TARGET_CHARACTER,
                EntityLink::TARGET_ITEM,
                EntityLink::TARGET_ASSET,
                EntityLink::TARGET_LOCATION,
                EntityLink::TARGET_FACTION,
                EntityLink::TARGET_EVENT,
            ])],
            'target_id' => ['required', 'integer'],
            'label' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function toDto(): ScenarioNodeEntityLinkStoreData
    {
        return new ScenarioNodeEntityLinkStoreData($this->validated());
    }
}
