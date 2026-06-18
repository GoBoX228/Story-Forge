<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\DTO\ScenarioGroupStoreData;
use App\Domain\Core\DTO\ScenarioGroupUpdateData;
use App\Models\ScenarioGroup;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ScenarioGroupService
{
    public function list(User $user): Collection
    {
        return ScenarioGroup::query()
            ->where('user_id', $user->id)
            ->orderBy('order_index')
            ->orderBy('name')
            ->get();
    }

    public function create(User $user, ScenarioGroupStoreData $data): ScenarioGroup
    {
        $payload = $data->data;
        $name = $this->uniqueName($user, $this->normalizeName($payload['name'] ?? 'Новая группа'));

        /** @var ScenarioGroup $group */
        $group = ScenarioGroup::query()->create([
            'user_id' => $user->id,
            'name' => $name,
            'slug' => $this->slug($name),
            'description' => $payload['description'] ?? null,
            'order_index' => $payload['order_index'] ?? $this->nextOrderIndex($user),
        ]);

        return $group;
    }

    public function show(User $user, string $id): ScenarioGroup
    {
        /** @var ScenarioGroup $group */
        $group = ScenarioGroup::query()
            ->where('user_id', $user->id)
            ->where('id', $id)
            ->firstOrFail();

        return $group;
    }

    public function update(User $user, string $id, ScenarioGroupUpdateData $data): ScenarioGroup
    {
        $group = $this->show($user, $id);
        $payload = $data->data;

        if (array_key_exists('name', $payload)) {
            $name = $this->normalizeName($payload['name']);
            $slug = $this->slug($name);
            $duplicateExists = ScenarioGroup::query()
                ->where('user_id', $user->id)
                ->where('slug', $slug)
                ->where('id', '!=', $group->id)
                ->exists();

            if ($duplicateExists) {
                throw ValidationException::withMessages([
                    'name' => ['Scenario group with this name already exists.'],
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
        return (int) ScenarioGroup::query()->where('user_id', $user->id)->max('order_index') + 1;
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

        while (ScenarioGroup::query()->where('user_id', $user->id)->where('slug', $this->slug($candidate))->exists()) {
            $candidate = "{$base} {$suffix}";
            $suffix++;
        }

        return $candidate;
    }
}

