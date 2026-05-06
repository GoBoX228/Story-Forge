<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\DTO\EntityLinkStoreData;
use App\Domain\Core\DTO\EntityLinkUpdateData;
use App\Models\Asset;
use App\Models\Character;
use App\Models\EntityLink;
use App\Models\Faction;
use App\Models\Item;
use App\Models\Location;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\User;
use App\Models\WorldEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class EntityLinkService
{
    private const ASSET_USAGE_ROLES = [
        'portrait',
        'token',
        'item_image',
        'map_background',
        'map_token',
    ];

    private const MATERIAL_TYPES = [
        EntityLink::TARGET_SCENARIO => Scenario::class,
        EntityLink::TARGET_MAP => Map::class,
        EntityLink::TARGET_CHARACTER => Character::class,
        EntityLink::TARGET_ITEM => Item::class,
        EntityLink::TARGET_ASSET => Asset::class,
        EntityLink::TARGET_LOCATION => Location::class,
        EntityLink::TARGET_FACTION => Faction::class,
        EntityLink::TARGET_EVENT => WorldEvent::class,
    ];

    public function list(User $user, string $sourceType, string $sourceId): Collection
    {
        $source = $this->findOwnedMaterial($user, $sourceType, $sourceId);

        return EntityLink::query()
            ->where('source_type', $sourceType)
            ->where('source_id', $source->id)
            ->orderBy('target_type')
            ->orderBy('relation_type')
            ->orderBy('id')
            ->get();
    }

    public function create(User $user, string $sourceType, string $sourceId, EntityLinkStoreData $data): EntityLink
    {
        $source = $this->findOwnedMaterial($user, $sourceType, $sourceId);
        $target = $this->findOwnedMaterial($user, $data->data['target_type'], $data->data['target_id']);
        $relationType = $data->data['relation_type'] ?? EntityLink::RELATION_RELATED;
        $metadata = $this->normalizeMetadata($data->data['target_type'], $data->data['metadata'] ?? []);

        /** @var EntityLink $link */
        $link = $this->findDuplicateLink(
            $sourceType,
            (string) $source->id,
            $data->data['target_type'],
            (string) $target->id,
            $relationType,
            $metadata['role'] ?? null,
        );

        if ($link) {
            $link->update([
                'label' => $data->data['label'] ?? null,
                'metadata' => $metadata,
            ]);
        } else {
            $link = EntityLink::query()->create([
                'source_type' => $sourceType,
                'source_id' => $source->id,
                'target_type' => $data->data['target_type'],
                'target_id' => $target->id,
                'relation_type' => $relationType,
                'label' => $data->data['label'] ?? null,
                'metadata' => $metadata,
            ]);
        }

        return $link->fresh();
    }

    public function update(User $user, string $linkId, EntityLinkUpdateData $data): EntityLink
    {
        /** @var EntityLink $link */
        $link = EntityLink::query()->where('id', $linkId)->firstOrFail();

        $this->assertOwnedLink($user, $link);

        $link->update([
            ...(array_key_exists('relation_type', $data->data)
                ? ['relation_type' => $data->data['relation_type'] ?? EntityLink::RELATION_RELATED]
                : []),
            ...(array_key_exists('label', $data->data)
                ? ['label' => $data->data['label']]
                : []),
            ...(array_key_exists('metadata', $data->data)
                ? ['metadata' => $this->normalizeMetadata((string) $link->target_type, $data->data['metadata'] ?? [])]
                : []),
        ]);

        return $link->fresh();
    }

    public function delete(User $user, string $linkId): void
    {
        /** @var EntityLink $link */
        $link = EntityLink::query()->where('id', $linkId)->firstOrFail();

        $this->assertOwnedLink($user, $link);

        $link->delete();
    }

    private function assertOwnedLink(User $user, EntityLink $link): void
    {
        $this->findOwnedMaterial($user, (string) $link->source_type, (string) $link->source_id);
        $this->findOwnedMaterial($user, (string) $link->target_type, (string) $link->target_id);
    }

    private function findOwnedMaterial(User $user, string $type, string|int $id): Model
    {
        $modelClass = self::MATERIAL_TYPES[$type] ?? null;

        if (!$modelClass) {
            throw ValidationException::withMessages([
                'type' => ['Unsupported entity link material type.'],
            ]);
        }

        return $modelClass::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();
    }

    private function findDuplicateLink(
        string $sourceType,
        string $sourceId,
        string $targetType,
        string $targetId,
        string $relationType,
        ?string $assetRole,
    ): ?EntityLink {
        $links = EntityLink::query()
            ->where('source_type', $sourceType)
            ->where('source_id', $sourceId)
            ->where('target_type', $targetType)
            ->where('target_id', $targetId)
            ->where('relation_type', $relationType)
            ->orderBy('id')
            ->get();

        if ($targetType !== EntityLink::TARGET_ASSET) {
            return $links->first();
        }

        return $links->first(
            fn (EntityLink $link): bool => (($link->metadata ?? [])['role'] ?? null) === $assetRole
        );
    }

    /**
     * @param array<string, mixed>|null $metadata
     * @return array<string, mixed>
     */
    private function normalizeMetadata(string $targetType, ?array $metadata): array
    {
        $metadata = $metadata ?? [];
        $role = $metadata['role'] ?? null;

        if ($role === null || $role === '') {
            unset($metadata['role']);

            return $metadata;
        }

        if ($targetType !== EntityLink::TARGET_ASSET || !in_array($role, self::ASSET_USAGE_ROLES, true)) {
            throw ValidationException::withMessages([
                'metadata.role' => ['Unsupported asset usage role.'],
            ]);
        }

        $metadata['role'] = $role;

        return $metadata;
    }
}
