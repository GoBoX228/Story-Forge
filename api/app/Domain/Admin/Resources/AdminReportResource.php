<?php

namespace App\Domain\Admin\Resources;

use App\Models\Report;

class AdminReportResource extends BaseAdminResource
{
    public function toArray($request): array
    {
        /** @var Report $report */
        $report = $this->resource;

        return [
            'id' => $report->id,
            'target_type' => $report->target_type,
            'target_id' => $report->target_id,
            'reason' => $report->reason,
            'description' => $report->description,
            'status' => $report->status,
            'reporter' => [
                'id' => $report->reporter?->id,
                'name' => $report->reporter?->name ?? 'unknown',
                'email' => $report->reporter?->email,
            ],
            'reviewed_by' => [
                'id' => $report->reviewedBy?->id,
                'name' => $report->reviewedBy?->name,
                'email' => $report->reviewedBy?->email,
            ],
            'reviewed_at' => $report->reviewed_at,
            'created_at' => $report->created_at,
        ];
    }
}
