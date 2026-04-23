<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ChapterUpdateData;
use Illuminate\Foundation\Http\FormRequest;

class ChapterUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'order_index' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    public function toDto(): ChapterUpdateData
    {
        return new ChapterUpdateData($this->validated());
    }
}
