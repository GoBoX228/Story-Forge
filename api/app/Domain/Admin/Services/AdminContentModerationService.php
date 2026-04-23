<?php

namespace App\Domain\Admin\Services;

use App\Domain\Admin\Actions\BuildAdminContentItemsAction;
use App\Domain\Admin\Actions\DeleteContentModelAction;
use App\Domain\Admin\Actions\DeleteContentReportsAction;
use App\Domain\Admin\Actions\ResolveContentModelAction;
use App\Domain\Admin\DTO\DeleteContentData;
use App\Domain\Admin\DTO\ListContentData;
use App\Models\Campaign;
use App\Models\Character;
use App\Models\Item;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class AdminContentModerationService
{
    public function __construct(
        private readonly BuildAdminContentItemsAction $buildAdminContentItemsAction,
        private readonly ResolveContentModelAction $resolveContentModelAction,
        private readonly DeleteContentModelAction $deleteContentModelAction,
        private readonly DeleteContentReportsAction $deleteContentReportsAction,
        private readonly AdminAuditLogService $adminAuditLogService,
    ) {
    }

    public function list(ListContentData $data): Collection
    {
        return $this->buildAdminContentItemsAction->execute($data->type, $data->search);
    }

    public function delete(User $admin, DeleteContentData $data): array
    {
        if ($data->entityId <= 0) {
            return [
                'status' => 'invalid_id',
                'code' => 422,
                'message' => 'Invalid content id',
            ];
        }

        $model = $this->resolveContentModelAction->execute($data->type, $data->entityId);
        if (!$model) {
            return [
                'status' => 'not_found',
                'code' => 404,
                'message' => 'Content not found',
            ];
        }

        $title = $this->resolveContentTitle($model);
        $this->deleteContentModelAction->execute($model);
        $this->deleteContentReportsAction->execute($data->type, $data->entityId);

        $this->adminAuditLogService->write(
            $admin,
            'ADMIN_CONTENT_DELETED',
            sprintf('Deleted %s #%d', $data->type, $data->entityId),
            ['type' => $data->type, 'id' => $data->entityId, 'title' => $title]
        );

        return [
            'status' => 'success',
            'message' => 'Deleted',
        ];
    }

    private function resolveContentTitle(Model $model): string
    {
        if ($model instanceof Scenario || $model instanceof Campaign) {
            return $model->title;
        }

        if ($model instanceof Map || $model instanceof Character || $model instanceof Item) {
            return $model->name;
        }

        return 'unknown';
    }
}
