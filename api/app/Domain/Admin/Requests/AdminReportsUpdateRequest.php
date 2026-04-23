<?php

namespace App\Domain\Admin\Requests;

use App\Domain\Admin\DTO\UpdateReportData;
use Illuminate\Foundation\Http\FormRequest;

class AdminReportsUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'string', 'in:open,resolved,dismissed'],
            'ban_target_user' => ['sometimes', 'boolean'],
        ];
    }

    public function toDto(): UpdateReportData
    {
        return new UpdateReportData(
            $this->has('status'),
            $this->has('status') ? (string) $this->input('status') : null,
            $this->boolean('ban_target_user')
        );
    }
}
