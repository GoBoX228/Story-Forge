<?php

namespace App\Domain\Admin\Requests;

use App\Domain\Admin\DTO\DeleteContentData;
use Illuminate\Foundation\Http\FormRequest;

class AdminContentDeleteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'type' => $this->route('type'),
            'id' => $this->route('id'),
        ]);
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string'],
            'id' => ['required', 'string'],
        ];
    }

    public function toDto(): DeleteContentData
    {
        return new DeleteContentData(
            strtolower((string) $this->input('type')),
            (int) $this->input('id')
        );
    }
}
