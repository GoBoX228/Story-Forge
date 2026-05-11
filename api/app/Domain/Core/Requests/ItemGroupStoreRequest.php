<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ItemGroupStoreData;
use Illuminate\Foundation\Http\FormRequest;

class ItemGroupStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'order_index' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function toDto(): ItemGroupStoreData
    {
        return new ItemGroupStoreData($this->validated());
    }
}
