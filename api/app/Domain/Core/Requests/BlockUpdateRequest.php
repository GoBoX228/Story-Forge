<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\BlockUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class BlockUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['sometimes', 'string', 'max:50'],
            'content' => ['sometimes', 'string'],
            'order_index' => ['sometimes', 'integer', 'min:0'],
            'difficulty' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function toDto(): BlockUpdateData
    {
        return new BlockUpdateData($this->validated());
    }
}
