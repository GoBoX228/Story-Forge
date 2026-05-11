<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\DTO\AssetFolderStoreData;
use App\Domain\Core\DTO\AssetFolderUpdateData;
use App\Models\Asset;
use App\Models\AssetFolder;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AssetFolderService
{
    public function list(User $user): Collection
    {
        return AssetFolder::query()
            ->where('user_id', $user->id)
            ->with('assets:id,asset_folder_id')
            ->orderBy('name')
            ->get();
    }

    public function create(User $user, AssetFolderStoreData $data): AssetFolder
    {
        $name = $this->uniqueName($user, $this->normalizeName($data->name));
        $slug = $this->slug($name);

        /** @var AssetFolder $folder */
        $folder = AssetFolder::query()->create([
            'user_id' => $user->id,
            'name' => $name,
            'slug' => $slug,
        ]);

        return $folder->fresh('assets:id,asset_folder_id');
    }

    public function show(User $user, string $id): AssetFolder
    {
        /** @var AssetFolder $folder */
        $folder = AssetFolder::query()
            ->where('user_id', $user->id)
            ->where('id', $id)
            ->with('assets:id,asset_folder_id')
            ->firstOrFail();

        return $folder;
    }

    public function update(User $user, string $id, AssetFolderUpdateData $data): AssetFolder
    {
        $folder = $this->show($user, $id);
        $payload = $data->data;

        if (array_key_exists('name', $payload)) {
            $name = $this->normalizeName($payload['name']);
            $slug = $this->slug($name);
            $duplicateExists = AssetFolder::query()
                ->where('user_id', $user->id)
                ->where('slug', $slug)
                ->where('id', '!=', $folder->id)
                ->exists();

            if ($duplicateExists) {
                throw ValidationException::withMessages([
                    'name' => ['Asset folder with this name already exists.'],
                ]);
            }

            $payload['name'] = $name;
            $payload['slug'] = $slug;
        }

        $folder->update($payload);

        return $folder->fresh('assets:id,asset_folder_id');
    }

    public function delete(User $user, string $id): void
    {
        $folder = $this->show($user, $id);

        Asset::query()
            ->where('user_id', $user->id)
            ->where('asset_folder_id', $folder->id)
            ->update(['asset_folder_id' => null]);

        $folder->delete();
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

        return mb_strtolower(preg_replace('/[^\pL\pN]+/u', '-', $this->normalizeName($name)) ?? 'folder');
    }

    private function uniqueName(User $user, string $name): string
    {
        $base = $name;
        $candidate = $base;
        $suffix = 2;

        while (AssetFolder::query()->where('user_id', $user->id)->where('slug', $this->slug($candidate))->exists()) {
            $candidate = "{$base} {$suffix}";
            $suffix++;
        }

        return $candidate;
    }
}
