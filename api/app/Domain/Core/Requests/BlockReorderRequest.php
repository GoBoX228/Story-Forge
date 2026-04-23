<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\BlockReorderData;
use Illuminate\Foundation\Http\FormRequest;

class BlockReorderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'order_index' => ['required', 'integer', 'min:0'],
        ];
    }

    public function toDto(): BlockReorderData
    {
        return new BlockReorderData((int) $this->validated('order_index'));
    }
}
