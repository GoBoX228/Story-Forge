<?php

namespace App\Domain\Admin\Actions;

use App\Domain\Admin\Support\AdminConfig;
use App\Models\Report;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class FetchAdminReportsAction
{
    public function execute(string $status, string $search): Collection
    {
        $query = Report::query()->with(['reporter:id,name,email', 'reviewedBy:id,name,email']);

        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($search !== '') {
            $query->where(function (Builder $inner) use ($search) {
                $inner->whereRaw('LOWER(reason) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(description) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(target_type) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('CAST(target_id AS TEXT) LIKE ?', ["%{$search}%"]);
            });
        }

        return $query
            ->orderByRaw("CASE WHEN status = 'open' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at')
            ->limit(AdminConfig::REPORTS_LIMIT)
            ->get();
    }
}
