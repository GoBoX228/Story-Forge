<?php

namespace App\Domain\Export\Requests;

use App\Domain\Export\DTO\ExportScenarioItemCardsPdfData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExportScenarioItemCardsPdfRequest extends FormRequest
{
    public const DUPLEX_EDGE_LONG = 'long';

    public const DUPLEX_EDGE_SHORT = 'short';

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'duplex_edge' => ['nullable', 'string', Rule::in([
                self::DUPLEX_EDGE_LONG,
                self::DUPLEX_EDGE_SHORT,
            ])],
        ];
    }

    public function toDto(string $scenarioId): ExportScenarioItemCardsPdfData
    {
        return new ExportScenarioItemCardsPdfData(
            scenarioId: $scenarioId,
            duplexEdge: $this->validated('duplex_edge', self::DUPLEX_EDGE_LONG)
        );
    }
}
