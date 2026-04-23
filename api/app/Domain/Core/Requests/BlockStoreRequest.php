<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\BlockStoreData;
use Illuminate\Foundation\Http\FormRequest;

class BlockStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'max:50'],
            'content' => ['required', 'string'],
            'order_index' => ['nullable', 'integer', 'min:0'],
            'difficulty' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function toDto(): BlockStoreData
    {
        return new BlockStoreData($this->validated());
    }
}
