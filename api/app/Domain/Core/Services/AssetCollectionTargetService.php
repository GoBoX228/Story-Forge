<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\DTO\AssetCollectionAssignmentData;
use App\Models\AssetCollection;
use App\Models\Character;
use App\Models\CharacterGroup;
use App\Models\Item;
use App\Models\ItemGroup;
use App\Models\Map;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssetCollectionTargetService
{
    private const TARGET_TYPES = [
        'map' => Map::class,
        'character' => Character::class,
        'character_group' => CharacterGroup::class,
        'item' => Item::class,
        'item_group' => ItemGroup::class,
    ];

    public function listForTarget(User $user, string $type, string $id): Collection
    {
        $this->findOwnedTarget($user, $type, $id);

        return $this->collectionsFor($type, $id);
    }

    public function replaceForTarget(User $user, string $type, string $id, AssetCollectionAssignmentData $data): Collection
    {
        $target = $this->findOwnedTarget($user, $type, $id);
        $collectionIds = collect($data->collectionIds)
            ->map(fn ($collectionId) => (int) $collectionId)
            ->filter(fn ($collectionId) => $collectionId > 0)
            ->unique()
            ->values();

        if ($collectionIds->isNotEmpty()) {
            $ownedCount = AssetCollection::query()
                ->where('user_id', $user->id)
                ->whereIn('id', $collectionIds)
                ->count();

            if ($ownedCount !== $collectionIds->count()) {
                abort(404);
            }
        }

        DB::table('asset_collection_targets')
            ->where('target_type', $type)
            ->where('target_id', $target->id)
            ->delete();

        if ($collectionIds->isNotEmpty()) {
            DB::table('asset_collection_targets')->insert(
                $collectionIds->map(fn ($collectionId) => [
                    'user_id' => $user->id,
                    'asset_collection_id' => $collectionId,
                    'target_type' => $type,
                    'target_id' => (int) $target->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])->all()
            );
        }

        return $this->collectionsFor($type, (string) $target->id);
    }

    private function collectionsFor(string $type, string $id): Collection
    {
        return AssetCollection::query()
            ->join('asset_collection_targets', 'asset_collections.id', '=', 'asset_collection_targets.asset_collection_id')
            ->where('asset_collection_targets.target_type', $type)
            ->where('asset_collection_targets.target_id', $id)
            ->with('assets:id')
            ->orderBy('asset_collections.name')
            ->select('asset_collections.*')
            ->get();
    }

    private function findOwnedTarget(User $user, string $type, string $id): Model
    {
        $modelClass = self::TARGET_TYPES[$type] ?? null;

        if (!$modelClass) {
            throw ValidationException::withMessages([
                'type' => ['Unsupported asset collection target type.'],
            ]);
        }

        return $modelClass::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();
    }
}
