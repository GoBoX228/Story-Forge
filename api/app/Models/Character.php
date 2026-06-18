<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Character extends Model
{
    protected $fillable = [
        'user_id',
        'character_group_id',
        'name',
        'role',
        'race',
        'description',
        'stats',
        'inventory',
    ];

    protected $casts = [
        'stats' => 'array',
        'inventory' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(CharacterGroup::class, 'character_group_id');
    }
}
