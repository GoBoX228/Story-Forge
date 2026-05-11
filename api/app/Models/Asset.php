<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Asset extends Model
{
    public const TYPE_IMAGE = 'image';

    public const TYPE_DOCUMENT = 'document';

    public const TYPE_OTHER = 'other';

    public const TYPES = [
        self::TYPE_IMAGE,
        self::TYPE_DOCUMENT,
        self::TYPE_OTHER,
    ];

    public const KIND_TILE = 'tile';

    public const KIND_TOKEN = 'token';

    public const KIND_PORTRAIT = 'portrait';

    public const KIND_BACKGROUND = 'background';

    public const KIND_ITEM_IMAGE = 'item_image';

    public const KIND_HANDOUT = 'handout';

    public const KIND_DOCUMENT = 'document';

    public const KIND_ICON = 'icon';

    public const KIND_OTHER = 'other';

    public const KINDS = [
        self::KIND_TILE,
        self::KIND_TOKEN,
        self::KIND_PORTRAIT,
        self::KIND_BACKGROUND,
        self::KIND_ITEM_IMAGE,
        self::KIND_HANDOUT,
        self::KIND_DOCUMENT,
        self::KIND_ICON,
        self::KIND_OTHER,
    ];

    protected $fillable = [
        'user_id',
        'asset_folder_id',
        'type',
        'kind',
        'name',
        'path',
        'url',
        'mime_type',
        'size',
        'metadata',
    ];

    protected $appends = [
        'collection_ids',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(AssetFolder::class, 'asset_folder_id');
    }

    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(AssetCollection::class, 'asset_collection_items')
            ->withTimestamps();
    }

    public function getCollectionIdsAttribute(): array
    {
        $collections = $this->relationLoaded('collections')
            ? $this->collections
            : $this->collections()->get(['asset_collections.id']);

        return $collections->pluck('id')->map(fn ($id) => (string) $id)->all();
    }
}
