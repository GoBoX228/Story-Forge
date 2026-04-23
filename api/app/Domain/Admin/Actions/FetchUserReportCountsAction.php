<?php

namespace App\Domain\Admin\Actions;

use App\Models\Report;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FetchUserReportCountsAction
{
    public function execute(): Collection
    {
        return Report::query()
            ->select('target_id', DB::raw('COUNT(*) as total'))
            ->where('target_type', Report::TARGET_USER)
            ->groupBy('target_id')
            ->pluck('total', 'target_id');
    }
}
