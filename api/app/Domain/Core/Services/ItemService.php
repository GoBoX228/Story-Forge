<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\Actions\CreateModelAction;
use App\Domain\Core\Actions\DeleteModelAction;
use App\Domain\Core\Actions\FindOwnedModelAction;
use App\Domain\Core\Actions\ListOwnedModelsAction;
use App\Domain\Core\Actions\UpdateModelAction;
use App\Domain\Core\DTO\ItemIndexData;
use App\Domain\Core\DTO\ItemStoreData;
use App\Domain\Core\DTO\ItemUpdateData;
use App\Models\Item;
use App\Models\ItemGroup;
use App\Models\User;
use Illuminate\Support\Collection;

class ItemService
{
    public function __construct(
        private readonly ListOwnedModelsAction $listOwnedModelsAction,
        private readonly FindOwnedModelAction $findOwnedModelAction,
        private readonly CreateModelAction $createModelAction,
        private readonly UpdateModelAction $updateModelAction,
        private readonly DeleteModelAction $deleteModelAction,
    ) {
    }

    public function list(User $user, ItemIndexData $data): Collection
    {
        return $this->listOwnedModelsAction->execute(
            Item::class,
            $user->id,
            function ($query) use ($data): void {
                if ($data->hasGroupId) {
                    if ($data->groupId === null || $data->groupId === '') {
                        $query->whereNull('item_group_id');
                    } else {
                        $query->where('item_group_id', $data->groupId);
                    }
                }

                if (!$data->hasSearch) {
                    return;
                }

                $query->where(function ($inner) use ($data): void {
                    $inner->whereRaw('LOWER(name) LIKE ?', ["%{$data->search}%"])
                        ->orWhereRaw('LOWER(type) LIKE ?', ["%{$data->search}%"])
                        ->orWhereRaw('LOWER(rarity) LIKE ?', ["%{$data->search}%"]);
                });
            }
        );
    }

    public function create(User $user, ItemStoreData $data): Item
    {
        $payload = $data->data;

        if (!empty($payload['group_id'])) {
            $this->findOwnedModelAction->execute(ItemGroup::class, $user->id, $payload['group_id']);
        }

        /** @var Item $item */
        $item = $this->createModelAction->execute(Item::class, [
            'user_id' => $user->id,
            'item_group_id' => $payload['group_id'] ?? null,
            'name' => $payload['name'],
            'type' => $payload['type'] ?? 'Прочее',
            'rarity' => $payload['rarity'] ?? 'Обычный',
            'description' => $payload['description'] ?? null,
            'modifiers' => $payload['modifiers'] ?? [],
            'weight' => $payload['weight'] ?? 0,
            'value' => $payload['value'] ?? 0,
        ]);

        return $item;
    }

    public function show(User $user, string $id): Item
    {
        /** @var Item $item */
        $item = $this->findOwnedModelAction->execute(Item::class, $user->id, $id);

        return $item;
    }

    public function update(User $user, string $id, ItemUpdateData $data): Item
    {
        /** @var Item $item */
        $item = $this->findOwnedModelAction->execute(Item::class, $user->id, $id);
        $payload = $data->data;

        if (
            array_key_exists('group_id', $payload) &&
            $payload['group_id'] !== null
        ) {
            $this->findOwnedModelAction->execute(ItemGroup::class, $user->id, $payload['group_id']);
        }

        if (array_key_exists('group_id', $payload)) {
            $payload['item_group_id'] = $payload['group_id'];
            unset($payload['group_id']);
        }

        $this->updateModelAction->execute($item, $payload);

        return $item;
    }

    public function delete(User $user, string $id): void
    {
        /** @var Item $item */
        $item = $this->findOwnedModelAction->execute(Item::class, $user->id, $id);
        $this->deleteModelAction->execute($item);
    }
}
