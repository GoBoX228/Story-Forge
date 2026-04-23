<?php

namespace App\Domain\Admin\Services;

use App\Domain\Admin\Actions\BanUserAction;
use App\Domain\Admin\Actions\FetchAdminReportsAction;
use App\Domain\Admin\Actions\PersistAdminReportChangesAction;
use App\Domain\Admin\DTO\ListReportsData;
use App\Domain\Admin\DTO\UpdateReportData;
use App\Domain\Admin\Policies\AdminModerationPolicy;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

class AdminReportModerationService
{
    public function __construct(
        private readonly FetchAdminReportsAction $fetchAdminReportsAction,
        private readonly PersistAdminReportChangesAction $persistAdminReportChangesAction,
        private readonly BanUserAction $banUserAction,
        private readonly AdminAuditLogService $adminAuditLogService,
        private readonly AdminModerationPolicy $adminModerationPolicy,
    ) {
    }

    public function list(ListReportsData $data): Collection
    {
        return $this->fetchAdminReportsAction->execute($data->status, $data->search);
    }

    public function update(User $admin, string $id, UpdateReportData $data): array
    {
        $report = Report::query()->find($id);
        if (!$report) {
            throw (new ModelNotFoundException())->setModel(Report::class, [$id]);
        }

        $targetUserBanned = false;

        if ($data->banTargetUser && $report->target_type === Report::TARGET_USER) {
            $target = User::query()->find($report->target_id);
            if ($this->adminModerationPolicy->canAutoBanReportTarget($admin, $target)) {
                $this->banUserAction->execute($target);
                $targetUserBanned = true;
            }
        }

        $this->persistAdminReportChangesAction->execute($report, $admin, $data->hasStatus, $data->status);

        $this->adminAuditLogService->write(
            $admin,
            'ADMIN_REPORT_UPDATED',
            sprintf('Report #%d updated', $report->id),
            [
                'report_id' => $report->id,
                'status' => $report->status,
                'ban_target_user' => $targetUserBanned,
            ]
        );

        $report->load(['reporter:id,name,email', 'reviewedBy:id,name,email']);

        return [
            'status' => 'success',
            'report' => $report,
        ];
    }
}
