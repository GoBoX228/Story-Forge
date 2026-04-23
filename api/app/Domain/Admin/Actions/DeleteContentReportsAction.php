<?php

namespace App\Domain\Admin\Actions;

use App\Models\Report;

class DeleteContentReportsAction
{
    public function execute(string $type, int $entityId): void
    {
        Report::query()
            ->where('target_type', $type)
            ->where('target_id', $entityId)
            ->delete();
    }
}
