<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\TagAssignmentData;
use Illuminate\Foundation\Http\FormRequest;

class TagAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer'],
            'new_tags' => ['nullable', 'array'],
            'new_tags.*' => ['string', 'max:64'],
        ];
    }

    public function toDto(): TagAssignmentData
    {
        return new TagAssignmentData(
            $this->validated('tag_ids') ?? [],
            $this->validated('new_tags') ?? [],
        );
    }
}
