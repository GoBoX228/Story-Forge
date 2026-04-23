<?php

namespace App\Domain\Report\Actions;

use App\Domain\Report\DTO\ReportStoreData;
use App\Models\Report;
use App\Models\User;

class CreateReportAction
{
    public function execute(User $reporter, ReportStoreData $data): Report
    {
        return Report::query()->create([
            'reporter_id' => $reporter->id,
            'target_type' => strtolower($data->targetType),
            'target_id' => $data->targetId,
            'reason' => strtolower($data->reason),
            'description' => $data->description,
            'status' => Report::STATUS_OPEN,
        ]);
    }
}

