<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PublishedContent extends Model
{
    public const TYPE_SCENARIO = 'scenario';

    public const TYPE_MAP = 'map';

    public const TYPE_CHARACTER = 'character';

    public const TYPE_ITEM = 'item';

    public const TYPE_ASSET = 'asset';

    public const TYPE_LOCATION = 'location';

    public const TYPE_FACTION = 'faction';

    public const TYPE_EVENT = 'event';

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    public const STATUS_ARCHIVED = 'archived';

    public const VISIBILITY_PRIVATE = 'private';

    public const VISIBILITY_UNLISTED = 'unlisted';

    public const VISIBILITY_PUBLIC = 'public';

    protected $fillable = [
        'content_type',
        'content_id',
        'user_id',
        'status',
        'visibility',
        'slug',
        'metadata',
        'published_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'published_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
