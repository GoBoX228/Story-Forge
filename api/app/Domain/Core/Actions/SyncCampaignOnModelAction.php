<?php

namespace App\Domain\Core\Actions;

class SyncCampaignOnModelAction
{
    public function execute(string $modelClass, int $campaignId, array $ids, int $userId): void
    {
        $detachQuery = $modelClass::query()
            ->where('user_id', $userId)
            ->where('campaign_id', $campaignId);

        if (!empty($ids)) {
            $detachQuery->whereNotIn('id', $ids);
        }

        $detachQuery->update(['campaign_id' => null]);

        if (!empty($ids)) {
            $modelClass::query()
                ->where('user_id', $userId)
                ->whereIn('id', $ids)
                ->update(['campaign_id' => $campaignId]);
        }
    }
}
