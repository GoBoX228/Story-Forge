<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Asset extends Model
{
    public const TYPE_IMAGE = 'image';

    public const TYPE_TOKEN = 'token';

    public const TYPE_DOCUMENT = 'document';

    public const TYPE_OTHER = 'other';

    public const TYPES = [
        self::TYPE_IMAGE,
        self::TYPE_TOKEN,
        self::TYPE_DOCUMENT,
        self::TYPE_OTHER,
    ];

    protected $fillable = [
        'user_id',
        'campaign_id',
        'type',
        'name',
        'path',
        'url',
        'mime_type',
        'size',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }
}
