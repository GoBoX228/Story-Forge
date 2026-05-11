<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\Actions\DeleteModelAction;
use App\Domain\Core\Actions\EnsureOwnedModelExistsAction;
use App\Domain\Core\Actions\FindOwnedModelAction;
use App\Domain\Core\Actions\ListOwnedModelsAction;
use App\Domain\Core\Actions\UpdateModelAction;
use App\Domain\Core\DTO\AssetIndexData;
use App\Domain\Core\DTO\AssetStoreData;
use App\Domain\Core\DTO\AssetUpdateData;
use App\Models\Asset;
use App\Models\AssetCollection;
use App\Models\AssetFolder;
use App\Models\EntityLink;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;

class AssetService
{
    public function __construct(
        private readonly ListOwnedModelsAction $listOwnedModelsAction,
        private readonly FindOwnedModelAction $findOwnedModelAction,
        private readonly UpdateModelAction $updateModelAction,
        private readonly DeleteModelAction $deleteModelAction,
        private readonly EnsureOwnedModelExistsAction $ensureOwnedModelExistsAction,
    ) {
    }

    public function list(User $user, AssetIndexData $data): Collection
    {
        if ($data->folderId !== null && $data->folderId !== '' && !in_array($data->folderId, ['root', 'null', 'none'], true)) {
            $this->normalizeOwnedFolderId($user, $data->folderId);
        }

        return $this->listOwnedModelsAction->execute(
            Asset::class,
            $user->id,
            function ($query) use ($data): void {
                $query->with('collections:id');

                if ($data->type) {
                    $query->where('type', $data->type);
                }

                if ($data->kind) {
                    $query->where('kind', $data->kind);
                }

                if ($data->folderId !== null && $data->folderId !== '') {
                    if (in_array($data->folderId, ['root', 'null', 'none'], true)) {
                        $query->whereNull('asset_folder_id');
                    } else {
                        $query->where('asset_folder_id', (int) $data->folderId);
                    }
                }

                if ($data->collectionId !== null && $data->collectionId !== '') {
                    $query->whereHas('collections', function ($collectionQuery) use ($data): void {
                        $collectionQuery->where('asset_collections.id', $data->collectionId);
                    });
                }

                if ($data->search) {
                    $search = trim($data->search);
                    if ($search !== '') {
                        $query->where(function ($searchQuery) use ($search): void {
                            $searchQuery
                                ->where('name', 'like', '%' . $search . '%')
                                ->orWhere('mime_type', 'like', '%' . $search . '%');
                        });
                    }
                }
            }
        );
    }

    public function create(User $user, AssetStoreData $data, string $baseUrl): Asset
    {
        $collectionIds = $this->normalizeOwnedCollectionIds($user, $data->collectionIds);
        $folderId = $this->normalizeOwnedFolderId($user, $data->folderId);

        $file = $data->file;
        $path = $file->store('assets/' . $user->id, 'public');
        $mimeType = $file->getMimeType() ?: $file->getClientMimeType();
        $type = $data->type ?: $this->inferType($mimeType);
        $name = trim((string) ($data->name ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)));

        /** @var Asset $asset */
        $asset = Asset::query()->create([
            'user_id' => $user->id,
            'asset_folder_id' => $folderId,
            'type' => $type,
            'kind' => $data->kind ?: $this->inferKind($type),
            'name' => $name !== '' ? $name : 'Asset',
            'path' => $path,
            'url' => rtrim($baseUrl, '/') . Storage::url($path),
            'mime_type' => $mimeType,
            'size' => $file->getSize(),
            'metadata' => [
                'original_name' => $file->getClientOriginalName(),
                'extension' => $file->getClientOriginalExtension(),
            ],
        ]);

        $asset->collections()->sync($collectionIds);

        return $asset->fresh('collections');
    }

    public function show(User $user, string $id): Asset
    {
        /** @var Asset $asset */
        $asset = $this->findOwnedModelAction->execute(Asset::class, $user->id, $id);

        return $asset->load('collections:id');
    }

    public function update(User $user, string $id, AssetUpdateData $data): Asset
    {
        /** @var Asset $asset */
        $asset = $this->findOwnedModelAction->execute(Asset::class, $user->id, $id);

        $payload = Arr::except($data->data, ['collection_ids', 'folder_id']);

        if (array_key_exists('folder_id', $data->data)) {
            $payload['asset_folder_id'] = $this->normalizeOwnedFolderId($user, $data->data['folder_id']);
        }

        $this->updateModelAction->execute($asset, $payload);

        if (array_key_exists('collection_ids', $data->data)) {
            $asset->collections()->sync($this->normalizeOwnedCollectionIds($user, $data->data['collection_ids'] ?? []));
        }

        return $asset->fresh('collections');
    }

    public function delete(User $user, string $id): void
    {
        /** @var Asset $asset */
        $asset = $this->findOwnedModelAction->execute(Asset::class, $user->id, $id);

        if ($asset->path) {
            Storage::disk('public')->delete($asset->path);
        }

        EntityLink::query()
            ->where(function ($query) use ($asset): void {
                $query
                    ->where(function ($sourceQuery) use ($asset): void {
                        $sourceQuery
                            ->where('source_type', EntityLink::TARGET_ASSET)
                            ->where('source_id', $asset->id);
                    })
                    ->orWhere(function ($targetQuery) use ($asset): void {
                        $targetQuery
                            ->where('target_type', EntityLink::TARGET_ASSET)
                            ->where('target_id', $asset->id);
                    });
            })
            ->delete();

        $this->deleteModelAction->execute($asset);
    }

    private function inferType(?string $mimeType): string
    {
        if ($mimeType && str_starts_with($mimeType, 'image/')) {
            return Asset::TYPE_IMAGE;
        }

        if (
            $mimeType === 'application/pdf' ||
            ($mimeType && str_starts_with($mimeType, 'text/')) ||
            ($mimeType && str_contains($mimeType, 'document'))
        ) {
            return Asset::TYPE_DOCUMENT;
        }

        return Asset::TYPE_OTHER;
    }

    private function inferKind(string $type): string
    {
        return $type === Asset::TYPE_DOCUMENT ? Asset::KIND_DOCUMENT : Asset::KIND_OTHER;
    }

    private function normalizeOwnedCollectionIds(User $user, array $collectionIds): array
    {
        $ids = collect($collectionIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return [];
        }

        $ownedCount = AssetCollection::query()
            ->where('user_id', $user->id)
            ->whereIn('id', $ids)
            ->count();

        if ($ownedCount !== $ids->count()) {
            abort(404);
        }

        return $ids->all();
    }

    private function normalizeOwnedFolderId(User $user, mixed $folderId): ?int
    {
        if ($folderId === null || $folderId === '' || in_array($folderId, ['root', 'null', 'none'], true)) {
            return null;
        }

        $id = (int) $folderId;

        if ($id <= 0) {
            return null;
        }

        $exists = AssetFolder::query()
            ->where('user_id', $user->id)
            ->where('id', $id)
            ->exists();

        if (!$exists) {
            abort(404);
        }

        return $id;
    }
}
