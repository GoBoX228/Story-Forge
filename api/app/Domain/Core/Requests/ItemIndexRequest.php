<?php

namespace App\Domain\Core\Requests;

use App\Domain\Core\DTO\ItemIndexData;

class ItemIndexRequest extends CoreReadRequest
{
    public function toDto(): ItemIndexData
    {
        return new ItemIndexData(
            $this->filled('q'),
            mb_strtolower((string) $this->input('q', ''))
        );
    }
}
