<?php

namespace App\Domain\Export\Requests;

use App\Domain\Export\DTO\ExportMapPdfData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExportMapPdfRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'page_size' => ['nullable', 'string', Rule::in(['a4', 'a3', 'a2', 'a1', 'a0'])],
            'orientation' => ['nullable', 'string', Rule::in(['landscape', 'portrait'])],
        ];
    }

    public function toDto(string $id): ExportMapPdfData
    {
        $validated = $this->validated();

        return new ExportMapPdfData(
            mapId: $id,
            pageSize: $validated['page_size'] ?? 'a4',
            orientation: $validated['orientation'] ?? 'landscape',
        );
    }
}
