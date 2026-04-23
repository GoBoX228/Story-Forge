<?php

namespace App\Domain\Admin\Requests;

use App\Domain\Admin\DTO\ListReportsData;
use Illuminate\Foundation\Http\FormRequest;

class AdminReportsIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string'],
            'search' => ['nullable', 'string'],
        ];
    }

    public function toDto(): ListReportsData
    {
        return new ListReportsData(
            strtolower(trim((string) $this->input('status', ''))),
            mb_strtolower(trim((string) $this->input('search', '')))
        );
    }
}
