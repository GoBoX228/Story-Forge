<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\DTO\ScenarioNodeEntityLinkStoreData;
use App\Models\Asset;
use App\Models\Character;
use App\Models\EntityLink;
use App\Models\Faction;
use App\Models\Item;
use App\Models\Location;
use App\Models\Map;
use App\Models\ScenarioNode;
use App\Models\User;
use App\Models\WorldEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

class ScenarioNodeEntityLinkService
{
    public function list(User $user, string $nodeId): Collection
    {
        $node = $this->findOwnedNode($user, $nodeId);

        return EntityLink::query()
            ->where('source_type', EntityLink::SOURCE_SCENARIO_NODE)
            ->where('source_id', $node->id)
            ->where('relation_type', EntityLink::RELATION_RELATED)
            ->orderBy('target_type')
            ->orderBy('id')
            ->get();
    }

    public function create(User $user, string $nodeId, ScenarioNodeEntityLinkStoreData $data): EntityLink
    {
        $node = $this->findOwnedNode($user, $nodeId);
        $target = $this->findOwnedTarget($user, $data->data['target_type'], $data->data['target_id']);

        /** @var EntityLink $link */
        $link = EntityLink::query()->updateOrCreate(
            [
                'source_type' => EntityLink::SOURCE_SCENARIO_NODE,
                'source_id' => $node->id,
                'target_type' => $data->data['target_type'],
                'target_id' => $target->id,
                'relation_type' => EntityLink::RELATION_RELATED,
            ],
            [
                'label' => $data->data['label'] ?? null,
                'metadata' => [],
            ]
        );

        return $link;
    }

    public function delete(User $user, string $linkId): void
    {
        /** @var EntityLink $link */
        $link = EntityLink::query()
            ->where('id', $linkId)
            ->where('source_type', EntityLink::SOURCE_SCENARIO_NODE)
            ->where('relation_type', EntityLink::RELATION_RELATED)
            ->firstOrFail();

        $this->findOwnedNode($user, (string) $link->source_id);

        $link->delete();
    }

    private function findOwnedNode(User $user, string|int $nodeId): ScenarioNode
    {
        /** @var ScenarioNode $node */
        $node = ScenarioNode::query()
            ->where('id', $nodeId)
            ->whereHas('scenario', fn ($query) => $query->where('user_id', $user->id))
            ->firstOrFail();

        return $node;
    }

    private function findOwnedTarget(User $user, string $targetType, string|int $targetId): Model
    {
        $modelClass = match ($targetType) {
            EntityLink::TARGET_MAP => Map::class,
            EntityLink::TARGET_CHARACTER => Character::class,
            EntityLink::TARGET_ITEM => Item::class,
            EntityLink::TARGET_ASSET => Asset::class,
            EntityLink::TARGET_LOCATION => Location::class,
            EntityLink::TARGET_FACTION => Faction::class,
            EntityLink::TARGET_EVENT => WorldEvent::class,
            default => null,
        };

        if ($modelClass === null) {
            throw (new ModelNotFoundException())->setModel(EntityLink::class, [$targetType]);
        }

        return $modelClass::query()
            ->where('id', $targetId)
            ->where('user_id', $user->id)
            ->firstOrFail();
    }
}
