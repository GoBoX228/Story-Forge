<?php

namespace App\Domain\Broadcast\Services;

use App\Domain\Broadcast\Actions\FetchBroadcastsAction;
use App\Domain\Broadcast\DTO\BroadcastIndexData;
use Illuminate\Support\Collection;

class BroadcastService
{
    private const BROADCASTS_LIMIT = 50;

    public function __construct(
        private readonly FetchBroadcastsAction $fetchBroadcastsAction,
    ) {
    }

    public function list(BroadcastIndexData $data): Collection
    {
        unset($data);

        return $this->fetchBroadcastsAction->execute(self::BROADCASTS_LIMIT);
    }
}

