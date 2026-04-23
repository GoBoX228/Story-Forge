<?php

namespace App\Domain\Report\Requests;

use App\Domain\Report\DTO\ReportStoreData;
use Illuminate\Foundation\Http\FormRequest;

class ReportStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'target_type' => ['required', 'string', 'in:user,scenario,map,character,item,campaign'],
            'target_id' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:64'],
            'description' => ['nullable', 'string', 'max:3000'],
        ];
    }

    public function toDto(): ReportStoreData
    {
        return new ReportStoreData(
            targetType: (string) $this->validated('target_type'),
            targetId: (int) $this->validated('target_id'),
            reason: (string) $this->validated('reason'),
            description: $this->validated('description')
        );
    }
}

