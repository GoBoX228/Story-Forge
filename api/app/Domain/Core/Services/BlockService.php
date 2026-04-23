<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\Actions\CreateModelAction;
use App\Domain\Core\Actions\DeleteModelAction;
use App\Domain\Core\Actions\FindOwnedBlockAction;
use App\Domain\Core\Actions\FindOwnedChapterAction;
use App\Domain\Core\Actions\NextOrderIndexAction;
use App\Domain\Core\Actions\UpdateModelAction;
use App\Domain\Core\DTO\BlockReorderData;
use App\Domain\Core\DTO\BlockStoreData;
use App\Domain\Core\DTO\BlockUpdateData;
use App\Models\Block;
use App\Models\Chapter;
use App\Models\User;

class BlockService
{
    public function __construct(
        private readonly FindOwnedChapterAction $findOwnedChapterAction,
        private readonly FindOwnedBlockAction $findOwnedBlockAction,
        private readonly CreateModelAction $createModelAction,
        private readonly UpdateModelAction $updateModelAction,
        private readonly DeleteModelAction $deleteModelAction,
        private readonly NextOrderIndexAction $nextOrderIndexAction,
    ) {
    }

    public function create(User $user, string $chapterId, BlockStoreData $data): Block
    {
        /** @var Chapter $chapter */
        $chapter = $this->findOwnedChapterAction->execute($user->id, $chapterId);
        $payload = $data->data;

        $orderIndex = $payload['order_index'] ?? $this->nextOrderIndexAction->execute($chapter->blocks());

        /** @var Block $block */
        $block = $this->createModelAction->execute(Block::class, [
            'chapter_id' => $chapter->id,
            'type' => $payload['type'],
            'content' => $payload['content'],
            'order_index' => $orderIndex,
            'difficulty' => $payload['difficulty'] ?? null,
        ]);

        return $block;
    }

    public function update(User $user, string $id, BlockUpdateData $data): Block
    {
        $block = $this->findOwnedBlockAction->execute($user->id, $id);
        $this->updateModelAction->execute($block, $data->data);

        return $block;
    }

    public function reorder(User $user, string $id, BlockReorderData $data): Block
    {
        $block = $this->findOwnedBlockAction->execute($user->id, $id);
        $this->updateModelAction->execute($block, ['order_index' => $data->orderIndex]);

        return $block;
    }

    public function delete(User $user, string $id): void
    {
        $block = $this->findOwnedBlockAction->execute($user->id, $id);
        $this->deleteModelAction->execute($block);
    }
}

