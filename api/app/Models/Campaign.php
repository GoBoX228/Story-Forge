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
        'tags',
        'resources',
        'progress',
        'last_played',
    ];

    protected $casts = [
        'tags' => 'array',
        'resources' => 'array',
        'last_played' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scenarios(): HasMany
    {
        return $this->hasMany(Scenario::class)->orderByDesc('updated_at');
    }

    public function maps(): HasMany
    {
        return $this->hasMany(Map::class)->orderByDesc('updated_at');
    }

    public function characters(): HasMany
    {
        return $this->hasMany(Character::class)->orderByDesc('updated_at');
    }
}

