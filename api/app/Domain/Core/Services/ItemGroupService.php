<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\DTO\ItemGroupStoreData;
use App\Domain\Core\DTO\ItemGroupUpdateData;
use App\Models\ItemGroup;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ItemGroupService
{
    public function list(User $user): Collection
    {
        return ItemGroup::query()
            ->where('user_id', $user->id)
            ->orderBy('order_index')
            ->orderBy('name')
            ->get();
    }

    public function create(User $user, ItemGroupStoreData $data): ItemGroup
    {
        $payload = $data->data;
        $name = $this->uniqueName($user, $this->normalizeName($payload['name'] ?? 'Новая группа'));

        /** @var ItemGroup $group */
        $group = ItemGroup::query()->create([
            'user_id' => $user->id,
            'name' => $name,
            'slug' => $this->slug($name),
            'description' => $payload['description'] ?? null,
            'order_index' => $payload['order_index'] ?? $this->nextOrderIndex($user),
        ]);

        return $group;
    }

    public function show(User $user, string $id): ItemGroup
    {
        /** @var ItemGroup $group */
        $group = ItemGroup::query()
            ->where('user_id', $user->id)
            ->where('id', $id)
            ->firstOrFail();

        return $group;
    }

    public function update(User $user, string $id, ItemGroupUpdateData $data): ItemGroup
    {
        $group = $this->show($user, $id);
        $payload = $data->data;

        if (array_key_exists('name', $payload)) {
            $name = $this->normalizeName($payload['name']);
            $slug = $this->slug($name);
            $duplicateExists = ItemGroup::query()
                ->where('user_id', $user->id)
                ->where('slug', $slug)
                ->where('id', '!=', $group->id)
                ->exists();

            if ($duplicateExists) {
                throw ValidationException::withMessages([
                    'name' => ['Item group with this name already exists.'],
                ]);
            }

            $payload['name'] = $name;
            $payload['slug'] = $slug;
        }

        $group->update($payload);

        return $group;
    }

    public function delete(User $user, string $id): void
    {
        $this->show($user, $id)->delete();
    }

    private function nextOrderIndex(User $user): int
    {
        return (int) ItemGroup::query()->where('user_id', $user->id)->max('order_index') + 1;
    }

    private function normalizeName(string $name): string
    {
        $normalized = trim(preg_replace('/\s+/', ' ', $name) ?? $name);

        return $normalized !== '' ? $normalized : 'Новая группа';
    }

    private function slug(string $name): string
    {
        $slug = Str::slug($this->normalizeName($name));

        if ($slug !== '') {
            return $slug;
        }

        return mb_strtolower(preg_replace('/[^\pL\pN]+/u', '-', $this->normalizeName($name)) ?? 'group');
    }

    private function uniqueName(User $user, string $name): string
    {
        $base = $name !== '' ? $name : 'Новая группа';
        $candidate = $base;
        $suffix = 2;

        while (ItemGroup::query()->where('user_id', $user->id)->where('slug', $this->slug($candidate))->exists()) {
            $candidate = "{$base} {$suffix}";
            $suffix++;
        }

        return $candidate;
    }
}
