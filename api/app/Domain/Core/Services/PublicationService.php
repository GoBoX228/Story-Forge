<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\DTO\PublicationIndexData;
use App\Domain\Core\DTO\PublicationStoreData;
use App\Domain\Core\DTO\PublicationUpdateData;
use App\Models\Asset;
use App\Models\Character;
use App\Models\Faction;
use App\Models\Item;
use App\Models\Location;
use App\Models\Map;
use App\Models\PublishedContent;
use App\Models\Scenario;
use App\Models\ScenarioNode;
use App\Models\ScenarioTransition;
use App\Models\User;
use App\Models\WorldEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PublicationService
{
    private const TARGET_TYPES = [
        PublishedContent::TYPE_SCENARIO => Scenario::class,
        PublishedContent::TYPE_MAP => Map::class,
        PublishedContent::TYPE_CHARACTER => Character::class,
        PublishedContent::TYPE_ITEM => Item::class,
        PublishedContent::TYPE_ASSET => Asset::class,
        PublishedContent::TYPE_LOCATION => Location::class,
        PublishedContent::TYPE_FACTION => Faction::class,
        PublishedContent::TYPE_EVENT => WorldEvent::class,
    ];

    public function list(User $user, PublicationIndexData $data): Collection
    {
        $scope = $data->scope ?? 'own';

        $query = PublishedContent::query()
            ->when($data->type, fn ($query, string $type) => $query->where('content_type', $type))
            ->when($data->status, fn ($query, string $status) => $query->where('status', $status))
            ->when($data->visibility, fn ($query, string $visibility) => $query->where('visibility', $visibility));

        if ($scope === 'public') {
            $query->where('status', PublishedContent::STATUS_PUBLISHED)
                ->where('visibility', PublishedContent::VISIBILITY_PUBLIC);
        } else {
            $query->where('user_id', $user->id);
        }

        $publications = $query
            ->orderByDesc('published_at')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (PublishedContent $publication): PublishedContent => $this->attachTargetSnapshot($publication));

        $search = trim((string) $data->search);
        if ($search === '') {
            return $publications->values();
        }

        $needle = mb_strtolower($search);

        return $publications
            ->filter(function (PublishedContent $publication) use ($needle): bool {
                $summary = mb_strtolower((string) (($publication->metadata ?? [])['summary'] ?? ''));
                $title = mb_strtolower((string) $publication->getAttribute('target_title'));

                return str_contains($title, $needle) || str_contains($summary, $needle);
            })
            ->values();
    }

    public function show(User $user, string $slug): PublishedContent
    {
        /** @var PublishedContent $publication */
        $publication = PublishedContent::query()->where('slug', $slug)->firstOrFail();

        if ((int) $publication->user_id !== (int) $user->id) {
            $isVisible = $publication->status === PublishedContent::STATUS_PUBLISHED
                && in_array($publication->visibility, [PublishedContent::VISIBILITY_PUBLIC, PublishedContent::VISIBILITY_UNLISTED], true);

            if (!$isVisible) {
                abort(404);
            }
        }

        return $this->attachTargetSnapshot($publication);
    }

    public function publishTarget(User $user, string $type, string $id, PublicationStoreData $data): PublishedContent
    {
        $target = $this->findOwnedTarget($user, $type, $id);
        $status = $data->data['status'] ?? PublishedContent::STATUS_DRAFT;
        $visibility = $data->data['visibility'] ?? PublishedContent::VISIBILITY_PRIVATE;

        $this->assertCanSetStatus($target, $status);

        /** @var PublishedContent $publication */
        $publication = PublishedContent::query()->firstOrNew([
            'content_type' => $type,
            'content_id' => $target->id,
            'user_id' => $user->id,
        ]);

        if (!$publication->exists || !$publication->slug) {
            $publication->slug = $this->uniqueSlug($this->targetTitle($target));
        }

        $publication->fill([
            'status' => $status,
            'visibility' => $visibility,
            'metadata' => $this->normalizeMetadata($data->data['metadata'] ?? []),
            'published_at' => $status === PublishedContent::STATUS_PUBLISHED
                ? ($publication->published_at ?? now())
                : null,
        ]);

        $publication->save();

        return $this->attachTargetSnapshot($publication->fresh());
    }

    public function update(User $user, string $id, PublicationUpdateData $data): PublishedContent
    {
        /** @var PublishedContent $publication */
        $publication = PublishedContent::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $target = $this->findOwnedTarget($user, (string) $publication->content_type, (string) $publication->content_id);
        $nextStatus = $data->data['status'] ?? $publication->status;
        $this->assertCanSetStatus($target, $nextStatus);

        $publication->update([
            ...(array_key_exists('status', $data->data) ? [
                'status' => $nextStatus,
                'published_at' => $nextStatus === PublishedContent::STATUS_PUBLISHED
                    ? ($publication->published_at ?? now())
                    : null,
            ] : []),
            ...(array_key_exists('visibility', $data->data) ? ['visibility' => $data->data['visibility']] : []),
            ...(array_key_exists('metadata', $data->data) ? ['metadata' => $this->normalizeMetadata($data->data['metadata'] ?? [])] : []),
        ]);

        return $this->attachTargetSnapshot($publication->fresh());
    }

    public function delete(User $user, string $id): void
    {
        PublishedContent::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail()
            ->delete();
    }

    private function findOwnedTarget(User $user, string $type, string|int $id): Model
    {
        $modelClass = self::TARGET_TYPES[$type] ?? null;

        if (!$modelClass) {
            throw ValidationException::withMessages([
                'type' => ['Unsupported publication target type.'],
            ]);
        }

        return $modelClass::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();
    }

    private function findTarget(string $type, string|int $id): ?Model
    {
        $modelClass = self::TARGET_TYPES[$type] ?? null;

        if (!$modelClass) {
            return null;
        }

        return $modelClass::query()->where('id', $id)->first();
    }

    private function attachTargetSnapshot(PublishedContent $publication): PublishedContent
    {
        $target = $this->findTarget((string) $publication->content_type, (string) $publication->content_id);

        $publication->setAttribute('target_title', $target ? $this->targetTitle($target) : null);
        $publication->setAttribute('target_missing', $target === null);

        return $publication;
    }

    private function targetTitle(Model $target): string
    {
        return (string) match (true) {
            $target instanceof Scenario => $target->title,
            $target instanceof Map => $target->name,
            $target instanceof Character => $target->name,
            $target instanceof Item => $target->name,
            $target instanceof Asset => $target->name,
            $target instanceof Location => $target->name,
            $target instanceof Faction => $target->name,
            $target instanceof WorldEvent => $target->title,
            default => 'material',
        };
    }

    /**
     * @param array<string, mixed>|null $metadata
     * @return array<string, mixed>
     */
    private function normalizeMetadata(?array $metadata): array
    {
        $metadata = $metadata ?? [];
        $summary = trim((string) ($metadata['summary'] ?? ''));

        return [
            ...($summary !== '' ? ['summary' => $summary] : []),
        ];
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title);
        if ($base === '') {
            $base = 'publication';
        }

        $slug = $base;
        $suffix = 2;

        while (PublishedContent::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    private function assertCanSetStatus(Model $target, string $status): void
    {
        if (!$target instanceof Scenario || $status !== PublishedContent::STATUS_PUBLISHED) {
            return;
        }

        $errors = $this->scenarioGraphErrors($target);
        if ($errors === []) {
            return;
        }

        throw ValidationException::withMessages([
            'graph' => $errors,
        ]);
    }

    /**
     * @return list<string>
     */
    private function scenarioGraphErrors(Scenario $scenario): array
    {
        $nodes = $scenario->nodes()->get();
        $transitions = $scenario->transitions()->get();

        if ($nodes->isEmpty()) {
            return ['Graph is empty. Create at least one scenario node before publishing.'];
        }

        $nodeById = $nodes->keyBy('id');
        $incoming = $nodes->mapWithKeys(fn (ScenarioNode $node): array => [$node->id => 0])->all();
        $outgoing = $nodes->mapWithKeys(fn (ScenarioNode $node): array => [$node->id => 0])->all();
        $errors = [];

        foreach ($transitions as $transition) {
            if (!$nodeById->has($transition->from_node_id) || !$nodeById->has($transition->to_node_id)) {
                $errors[] = "Transition #{$transition->id} has missing source or target node.";
                continue;
            }

            $outgoing[$transition->from_node_id]++;
            $incoming[$transition->to_node_id]++;

            $source = $nodeById->get($transition->from_node_id);
            if (in_array($transition->type, ['success', 'failure'], true) && $source->type !== 'check') {
                $errors[] = "Transition #{$transition->id} uses {$transition->type} outcome outside a check node.";
            }
        }

        if ($nodes->filter(fn (ScenarioNode $node): bool => ($incoming[$node->id] ?? 0) === 0)->isEmpty()) {
            $errors[] = 'Graph has no start node.';
        }

        if ($nodes->filter(fn (ScenarioNode $node): bool => ($outgoing[$node->id] ?? 0) === 0)->isEmpty()) {
            $errors[] = 'Graph has no final node.';
        }

        foreach ($nodes->where('type', 'check') as $node) {
            $types = $transitions
                ->where('from_node_id', $node->id)
                ->pluck('type')
                ->unique()
                ->values()
                ->all();

            if (!in_array('success', $types, true) || !in_array('failure', $types, true)) {
                $errors[] = "Check node #{$node->id} must have success and failure transitions.";
            }
        }

        return array_values(array_unique($errors));
    }
}
