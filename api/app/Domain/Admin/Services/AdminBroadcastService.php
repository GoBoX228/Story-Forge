<?php

namespace App\Domain\Admin\Services;

use App\Domain\Admin\Actions\CreateAdminBroadcastAction;
use App\Domain\Admin\Actions\FetchAdminBroadcastsAction;
use App\Domain\Admin\DTO\CreateBroadcastData;
use App\Domain\Admin\Support\AdminConfig;
use App\Models\Announcement;
use App\Models\User;
use Illuminate\Support\Collection;

class AdminBroadcastService
{
    public function __construct(
        private readonly FetchAdminBroadcastsAction $fetchAdminBroadcastsAction,
        private readonly CreateAdminBroadcastAction $createAdminBroadcastAction,
        private readonly AdminAuditLogService $adminAuditLogService,
    ) {
    }

    public function list(): Collection
    {
        return $this->fetchAdminBroadcastsAction->execute(AdminConfig::BROADCASTS_LIMIT);
    }

    public function create(User $admin, CreateBroadcastData $data): Announcement
    {
        $announcement = $this->createAdminBroadcastAction->execute($admin, $data);
        $announcement->load('user:id,name,email');

        $this->adminAuditLogService->write(
            $admin,
            'ADMIN_BROADCAST_CREATED',
            'Created system broadcast',
            ['broadcast_id' => $announcement->id, 'type' => $announcement->type]
        );

        return $announcement;
    }
}
