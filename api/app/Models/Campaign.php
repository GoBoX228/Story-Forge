<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'description',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scenarios(): HasMany
    {
        return $this->hasMany(Scenario::class)->orderByDesc('updated_at');
    }

    public function materialLinks(): HasMany
    {
        return $this->hasMany(EntityLink::class, 'source_id')
            ->where('source_type', EntityLink::TARGET_CAMPAIGN)
            ->where('relation_type', EntityLink::RELATION_USES)
            ->orderBy('id');
    }
}
