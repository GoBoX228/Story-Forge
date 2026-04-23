<?php

namespace App\Domain\Admin\Requests;

use App\Domain\Admin\DTO\ListUsersData;
use Illuminate\Foundation\Http\FormRequest;

class AdminUsersIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string'],
        ];
    }

    public function toDto(): ListUsersData
    {
        return new ListUsersData(
            mb_strtolower(trim((string) $this->input('search', '')))
        );
    }
}
