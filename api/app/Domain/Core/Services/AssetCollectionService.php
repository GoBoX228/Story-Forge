<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\DTO\AssetCollectionStoreData;
use App\Domain\Core\DTO\AssetCollectionUpdateData;
use App\Models\AssetCollection;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AssetCollectionService
{
    public function list(User $user): Collection
    {
        return AssetCollection::query()
            ->where('user_id', $user->id)
            ->with('assets:id')
            ->orderBy('name')
            ->get();
    }

    public function create(User $user, AssetCollectionStoreData $data): AssetCollection
    {
        $name = $this->uniqueName($user, $this->normalizeName($data->name));
        $slug = $this->slug($name);

        /** @var AssetCollection $collection */
        $collection = AssetCollection::query()->create([
            'user_id' => $user->id,
            'name' => $name,
            'slug' => $slug,
            'description' => $data->description,
        ]);

        return $collection->fresh('assets:id');
    }

    public function show(User $user, string $id): AssetCollection
    {
        /** @var AssetCollection $collection */
        $collection = AssetCollection::query()
            ->where('user_id', $user->id)
            ->where('id', $id)
            ->with('assets:id')
            ->firstOrFail();

        return $collection;
    }

    public function update(User $user, string $id, AssetCollectionUpdateData $data): AssetCollection
    {
        $collection = $this->show($user, $id);
        $payload = $data->data;

        if (array_key_exists('name', $payload)) {
            $name = $this->normalizeName($payload['name']);
            $slug = $this->slug($name);
            $duplicateExists = AssetCollection::query()
                ->where('user_id', $user->id)
                ->where('slug', $slug)
                ->where('id', '!=', $collection->id)
                ->exists();

            if ($duplicateExists) {
                throw ValidationException::withMessages([
                    'name' => ['Asset collection with this name already exists.'],
                ]);
            }

            $payload['name'] = $name;
            $payload['slug'] = $slug;
        }

        $collection->update($payload);

        return $collection->fresh('assets:id');
    }

    public function delete(User $user, string $id): void
    {
        $collection = $this->show($user, $id);

        $collection->delete();
    }

    private function normalizeName(string $name): string
    {
        return trim(preg_replace('/\s+/', ' ', $name) ?? $name);
    }

    private function slug(string $name): string
    {
        $slug = Str::slug($this->normalizeName($name));

        if ($slug !== '') {
            return $slug;
        }

        return mb_strtolower(preg_replace('/[^\pL\pN]+/u', '-', $this->normalizeName($name)) ?? 'collection');
    }

    private function uniqueSlug(User $user, string $name): string
    {
        $base = $this->slug($name);
        $slug = $base;
        $suffix = 2;

        while (AssetCollection::query()->where('user_id', $user->id)->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    private function uniqueName(User $user, string $name): string
    {
        $base = $name !== '' ? $name : 'Asset set';
        $candidate = $base;
        $suffix = 2;

        while (AssetCollection::query()->where('user_id', $user->id)->where('slug', $this->slug($candidate))->exists()) {
            $candidate = "{$base} {$suffix}";
            $suffix++;
        }

        return $candidate;
    }
}
