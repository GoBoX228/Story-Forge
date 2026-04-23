<?php

namespace App\Domain\Export\Actions;

use App\Models\Scenario;

class FindOwnedScenarioForExportAction
{
    public function execute(int $userId, string $scenarioId): Scenario
    {
        return Scenario::query()
            ->with(['chapters.blocks', 'user'])
            ->where('id', $scenarioId)
            ->where('user_id', $userId)
            ->firstOrFail();
    }
}

