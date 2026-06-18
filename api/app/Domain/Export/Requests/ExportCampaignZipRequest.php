<?php

namespace App\Domain\Export\Requests;

use App\Domain\Export\DTO\ExportCampaignZipData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExportCampaignZipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'map_page_size' => ['nullable', 'string', Rule::in(['a4', 'a3', 'a2', 'a1', 'a0'])],
            'map_orientation' => ['nullable', 'string', Rule::in(['landscape', 'portrait'])],
            'duplex_edge' => ['nullable', 'string', Rule::in(['long', 'short'])],
        ];
    }

    public function toDto(string $campaignId): ExportCampaignZipData
    {
        $validated = $this->validated();

        return new ExportCampaignZipData(
            campaignId: $campaignId,
            mapPageSize: $validated['map_page_size'] ?? 'a4',
            mapOrientation: $validated['map_orientation'] ?? 'landscape',
            duplexEdge: $validated['duplex_edge'] ?? 'long',
        );
    }
}
