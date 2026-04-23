<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\Actions\CreateModelAction;
use App\Domain\Core\Actions\DeleteModelAction;
use App\Domain\Core\Actions\FindOwnedChapterAction;
use App\Domain\Core\Actions\FindOwnedModelAction;
use App\Domain\Core\Actions\NextOrderIndexAction;
use App\Domain\Core\Actions\UpdateModelAction;
use App\Domain\Core\DTO\ChapterStoreData;
use App\Domain\Core\DTO\ChapterUpdateData;
use App\Models\Chapter;
use App\Models\Scenario;
use App\Models\User;

class ChapterService
{
    public function __construct(
        private readonly FindOwnedModelAction $findOwnedModelAction,
        private readonly FindOwnedChapterAction $findOwnedChapterAction,
        private readonly CreateModelAction $createModelAction,
        private readonly UpdateModelAction $updateModelAction,
        private readonly DeleteModelAction $deleteModelAction,
        private readonly NextOrderIndexAction $nextOrderIndexAction,
    ) {
    }

    public function create(User $user, string $scenarioId, ChapterStoreData $data): Chapter
    {
        /** @var Scenario $scenario */
        $scenario = $this->findOwnedModelAction->execute(Scenario::class, $user->id, $scenarioId);
        $payload = $data->data;

        $orderIndex = $payload['order_index'] ?? $this->nextOrderIndexAction->execute($scenario->chapters());

        /** @var Chapter $chapter */
        $chapter = $this->createModelAction->execute(Chapter::class, [
            'scenario_id' => $scenario->id,
            'title' => $payload['title'],
            'order_index' => $orderIndex,
        ]);

        return $chapter;
    }

    public function update(User $user, string $id, ChapterUpdateData $data): Chapter
    {
        $chapter = $this->findOwnedChapterAction->execute($user->id, $id);
        $this->updateModelAction->execute($chapter, $data->data);

        return $chapter;
    }

    public function delete(User $user, string $id): void
    {
        $chapter = $this->findOwnedChapterAction->execute($user->id, $id);
        $this->deleteModelAction->execute($chapter);
    }
}

