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
use App\Models\Campaign;
use App\Models\User;
use Illuminate\Support\Collection;
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
        return $this->listOwnedModelsAction->execute(
            Asset::class,
            $user->id,
            function ($query) use ($data): void {
                if ($data->type) {
                    $query->where('type', $data->type);
                }

                if ($data->campaignId !== null && $data->campaignId !== '') {
                    $query->where('campaign_id', $data->campaignId);
                }
            }
        );
    }

    public function create(User $user, AssetStoreData $data, string $baseUrl): Asset
    {
        if ($data->campaignId !== null && $data->campaignId !== '') {
            $this->ensureOwnedModelExistsAction->execute(Campaign::class, $user->id, $data->campaignId);
        }

        $file = $data->file;
        $path = $file->store('assets/' . $user->id, 'public');
        $mimeType = $file->getMimeType() ?: $file->getClientMimeType();
        $type = $data->type ?: $this->inferType($mimeType);
        $name = trim((string) ($data->name ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)));

        /** @var Asset $asset */
        $asset = Asset::query()->create([
            'user_id' => $user->id,
            'campaign_id' => $data->campaignId ?: null,
            'type' => $type,
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

        return $asset;
    }

    public function show(User $user, string $id): Asset
    {
        /** @var Asset $asset */
        $asset = $this->findOwnedModelAction->execute(Asset::class, $user->id, $id);

        return $asset;
    }

    public function update(User $user, string $id, AssetUpdateData $data): Asset
    {
        /** @var Asset $asset */
        $asset = $this->findOwnedModelAction->execute(Asset::class, $user->id, $id);

        if (
            array_key_exists('campaign_id', $data->data) &&
            $data->data['campaign_id'] !== null
        ) {
            $this->ensureOwnedModelExistsAction->execute(Campaign::class, $user->id, $data->data['campaign_id']);
        }

        $this->updateModelAction->execute($asset, $data->data);

        return $asset->fresh();
    }

    public function delete(User $user, string $id): void
    {
        /** @var Asset $asset */
        $asset = $this->findOwnedModelAction->execute(Asset::class, $user->id, $id);

        if ($asset->path) {
            Storage::disk('public')->delete($asset->path);
        }

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
}
