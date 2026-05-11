<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AssetCollection extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'description',
    ];

    protected $appends = [
        'asset_ids',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assets(): BelongsToMany
    {
        return $this->belongsToMany(Asset::class, 'asset_collection_items')
            ->withTimestamps();
    }

    public function getAssetIdsAttribute(): array
    {
        $assets = $this->relationLoaded('assets')
            ? $this->assets
            : $this->assets()->get(['assets.id']);

        return $assets->pluck('id')->map(fn ($id) => (string) $id)->all();
    }
}
