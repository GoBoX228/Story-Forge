<?php

namespace App\Domain\Admin\Services;

use App\Domain\Admin\Actions\FetchAdminUsersAction;
use App\Domain\Admin\Actions\FetchUserReportCountsAction;
use App\Domain\Admin\Actions\PersistAdminUserChangesAction;
use App\Domain\Admin\DTO\ListUsersData;
use App\Domain\Admin\DTO\UpdateUserData;
use App\Domain\Admin\Policies\AdminModerationPolicy;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

class AdminUserModerationService
{
    public function __construct(
        private readonly FetchAdminUsersAction $fetchAdminUsersAction,
        private readonly FetchUserReportCountsAction $fetchUserReportCountsAction,
        private readonly PersistAdminUserChangesAction $persistAdminUserChangesAction,
        private readonly AdminAuditLogService $adminAuditLogService,
        private readonly AdminModerationPolicy $adminModerationPolicy,
    ) {
    }

    public function list(ListUsersData $data): Collection
    {
        $users = $this->fetchAdminUsersAction->execute($data->search);
        $reportCounts = $this->fetchUserReportCountsAction->execute();

        return $users->map(function (User $user) use ($reportCounts) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'created_at' => $user->created_at,
                'reports_count' => (int) ($reportCounts[$user->id] ?? 0),
            ];
        })->values();
    }

    public function update(User $admin, string $id, UpdateUserData $data): array
    {
        $target = User::query()->find($id);
        if (!$target) {
            throw (new ModelNotFoundException())->setModel(User::class, [$id]);
        }

        if (
            $data->hasRole &&
            !$this->adminModerationPolicy->canRemoveOwnAdminRole($admin, $target, $data->role)
        ) {
            return [
                'status' => 'invalid',
                'code' => 422,
                'message' => 'You cannot remove your own admin role',
            ];
        }

        if (
            $data->hasStatus &&
            !$this->adminModerationPolicy->canBanSelf($admin, $target, $data->status)
        ) {
            return [
                'status' => 'invalid',
                'code' => 422,
                'message' => 'You cannot ban yourself',
            ];
        }

        $changes = [];
        if ($data->hasRole) {
            $changes['role'] = $data->role;
        }
        if ($data->hasStatus) {
            $changes['status'] = $data->status;
        }

        $this->persistAdminUserChangesAction->execute($target, $changes);

        if (!empty($changes)) {
            $this->adminAuditLogService->write(
                $admin,
                'ADMIN_USER_UPDATED',
                sprintf('User #%d updated', $target->id),
                ['target_user_id' => $target->id, 'changes' => $changes]
            );
        }

        return [
            'status' => 'success',
            'user' => [
                'id' => $target->id,
                'name' => $target->name,
                'email' => $target->email,
                'role' => $target->role,
                'status' => $target->status,
                'created_at' => $target->created_at,
            ],
        ];
    }
}
