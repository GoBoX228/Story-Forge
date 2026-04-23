<?php

namespace App\Domain\Export\Requests;

use App\Domain\Export\DTO\ExportScenarioPdfData;
use Illuminate\Foundation\Http\FormRequest;

class ExportScenarioPdfRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [];
    }

    public function toDto(string $scenarioId): ExportScenarioPdfData
    {
        return new ExportScenarioPdfData($scenarioId);
    }
}

