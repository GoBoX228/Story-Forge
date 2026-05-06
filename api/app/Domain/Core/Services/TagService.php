<?php

namespace App\Domain\Core\Services;

use App\Domain\Core\DTO\TagAssignmentData;
use App\Domain\Core\DTO\TagStoreData;
use App\Domain\Core\DTO\TagUpdateData;
use App\Models\Asset;
use App\Models\Character;
use App\Models\Faction;
use App\Models\Item;
use App\Models\Location;
use App\Models\Map;
use App\Models\Scenario;
use App\Models\Tag;
use App\Models\User;
use App\Models\WorldEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TagService
{
    private const TARGET_TYPES = [
        'scenario' => Scenario::class,
        'map' => Map::class,
        'character' => Character::class,
        'item' => Item::class,
        'asset' => Asset::class,
        'location' => Location::class,
        'faction' => Faction::class,
        'event' => WorldEvent::class,
    ];

    public function list(User $user): Collection
    {
        return Tag::query()
            ->where('user_id', $user->id)
            ->orderBy('name')
            ->get();
    }

    public function create(User $user, TagStoreData $data): Tag
    {
        return $this->findOrCreate($user, $data->name);
    }

    public function update(User $user, string $id, TagUpdateData $data): Tag
    {
        /** @var Tag $tag */
        $tag = Tag::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $slug = $this->slug($data->name);
        $duplicateExists = Tag::query()
            ->where('user_id', $user->id)
            ->where('slug', $slug)
            ->where('id', '!=', $tag->id)
            ->exists();

        if ($duplicateExists) {
            throw ValidationException::withMessages([
                'name' => ['Tag with this name already exists.'],
            ]);
        }

        $tag->update([
            'name' => $this->normalizeName($data->name),
            'slug' => $slug,
        ]);

        return $tag->fresh();
    }

    public function delete(User $user, string $id): void
    {
        /** @var Tag $tag */
        $tag = Tag::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $tag->delete();
    }

    public function listForTarget(User $user, string $type, string $id): Collection
    {
        $this->findOwnedTarget($user, $type, $id);

        return $this->tagsFor($type, $id);
    }

    public function replaceForTarget(User $user, string $type, string $id, TagAssignmentData $data): Collection
    {
        $this->findOwnedTarget($user, $type, $id);

        $tagIds = collect($data->tagIds)
            ->map(fn ($tagId) => (int) $tagId)
            ->filter(fn ($tagId) => $tagId > 0)
            ->unique()
            ->values();

        if ($tagIds->isNotEmpty()) {
            $ownedCount = Tag::query()
                ->where('user_id', $user->id)
                ->whereIn('id', $tagIds)
                ->count();

            if ($ownedCount !== $tagIds->count()) {
                abort(404);
            }
        }

        $createdIds = collect($data->newTags)
            ->map(fn ($name) => trim((string) $name))
            ->filter()
            ->unique(fn ($name) => $this->slug($name))
            ->map(fn ($name) => $this->findOrCreate($user, $name)->id);

        $nextTagIds = $tagIds->merge($createdIds)->unique()->values();

        DB::table('taggables')
            ->where('taggable_type', $type)
            ->where('taggable_id', $id)
            ->delete();

        if ($nextTagIds->isNotEmpty()) {
            DB::table('taggables')->insert(
                $nextTagIds->map(fn ($tagId) => [
                    'tag_id' => $tagId,
                    'taggable_type' => $type,
                    'taggable_id' => (int) $id,
                ])->all()
            );
        }

        return $this->tagsFor($type, $id);
    }

    private function tagsFor(string $type, string $id): Collection
    {
        return Tag::query()
            ->join('taggables', 'tags.id', '=', 'taggables.tag_id')
            ->where('taggables.taggable_type', $type)
            ->where('taggables.taggable_id', $id)
            ->orderBy('tags.name')
            ->select('tags.*')
            ->get();
    }

    private function findOwnedTarget(User $user, string $type, string $id): Model
    {
        $modelClass = self::TARGET_TYPES[$type] ?? null;

        if (!$modelClass) {
            throw ValidationException::withMessages([
                'type' => ['Unsupported tag target type.'],
            ]);
        }

        return $modelClass::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();
    }

    private function findOrCreate(User $user, string $name): Tag
    {
        $normalized = $this->normalizeName($name);
        $slug = $this->slug($normalized);

        /** @var Tag $tag */
        $tag = Tag::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'slug' => $slug,
            ],
            [
                'name' => $normalized,
            ]
        );

        return $tag;
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

        return mb_strtolower(preg_replace('/[^\pL\pN]+/u', '-', $this->normalizeName($name)) ?? 'tag');
    }
}
