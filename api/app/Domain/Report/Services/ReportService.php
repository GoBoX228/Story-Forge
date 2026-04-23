<?php

namespace App\Domain\Report\Services;

use App\Domain\Report\Actions\CreateReportAction;
use App\Domain\Report\Actions\FindOpenDuplicateReportAction;
use App\Domain\Report\Actions\ResolveReportTargetAction;
use App\Domain\Report\Actions\WriteReportAuditLogAction;
use App\Domain\Report\DTO\ReportStoreData;
use App\Models\Report;
use App\Models\User;

class ReportService
{
    public function __construct(
        private readonly ResolveReportTargetAction $resolveReportTargetAction,
        private readonly FindOpenDuplicateReportAction $findOpenDuplicateReportAction,
        private readonly CreateReportAction $createReportAction,
        private readonly WriteReportAuditLogAction $writeReportAuditLogAction,
    ) {
    }

    public function store(User $reporter, ReportStoreData $data): array
    {
        $targetType = strtolower($data->targetType);
        $reason = strtolower($data->reason);
        $normalizedData = new ReportStoreData(
            targetType: $targetType,
            targetId: $data->targetId,
            reason: $reason,
            description: $data->description
        );

        $target = $this->resolveReportTargetAction->execute($targetType, $data->targetId);
        if (!$target) {
            return ['status' => 'target_not_found'];
        }

        if ($targetType === Report::TARGET_USER && $data->targetId === $reporter->id) {
            return ['status' => 'self_report'];
        }

        $existing = $this->findOpenDuplicateReportAction->execute(
            reporterId: $reporter->id,
            targetType: $targetType,
            targetId: $data->targetId
        );

        if ($existing) {
            return [
                'status' => 'duplicate',
                'report' => $existing,
            ];
        }

        $report = $this->createReportAction->execute($reporter, $normalizedData);
        $this->writeReportAuditLogAction->execute($reporter, $report);

        return [
            'status' => 'created',
            'report' => $report,
        ];
    }
}

