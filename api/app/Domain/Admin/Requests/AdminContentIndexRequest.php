<?php

namespace App\Domain\Admin\Requests;

use App\Domain\Admin\DTO\ListContentData;
use Illuminate\Foundation\Http\FormRequest;

class AdminContentIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['nullable', 'string'],
            'search' => ['nullable', 'string'],
        ];
    }

    public function toDto(): ListContentData
    {
        return new ListContentData(
            strtolower(trim((string) $this->input('type', ''))),
            mb_strtolower(trim((string) $this->input('search', '')))
        );
    }
}
