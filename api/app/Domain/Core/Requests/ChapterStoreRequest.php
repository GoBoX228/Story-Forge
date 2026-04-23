<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ChapterStoreData;
use Illuminate\Foundation\Http\FormRequest;

class ChapterStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'order_index' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function toDto(): ChapterStoreData
    {
        return new ChapterStoreData($this->validated());
    }
}
