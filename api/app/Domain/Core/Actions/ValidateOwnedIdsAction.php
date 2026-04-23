<?php

namespace App\Domain\Core\Actions;

use Illuminate\Validation\ValidationException;

class ValidateOwnedIdsAction
{
    public function execute(string $modelClass, array $ids, int $userId, string $field): array
    {
        $normalized = array_values(array_unique(array_map('intval', $ids)));

        if (empty($normalized)) {
            return [];
        }

        $count = $modelClass::query()
            ->where('user_id', $userId)
            ->whereIn('id', $normalized)
            ->count();

        if ($count !== count($normalized)) {
            throw ValidationException::withMessages([
                $field => ['One or more linked entities are invalid or belong to another user.'],
            ]);
        }

        return $normalized;
    }
}
