<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Scenario extends Model
{
    protected $fillable = [
        'user_id',
        'campaign_id',
        'title',
        'description',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function nodes(): HasMany
    {
        return $this->hasMany(ScenarioNode::class)->orderBy('order_index');
    }

    public function transitions(): HasMany
    {
        return $this->hasMany(ScenarioTransition::class)->orderBy('order_index');
    }

    public function maps(): HasMany
    {
        return $this->hasMany(Map::class);
    }

    public function characters(): HasMany
    {
        return $this->hasMany(Character::class);
    }
}
