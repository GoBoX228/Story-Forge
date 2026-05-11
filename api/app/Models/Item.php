<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Item extends Model
{
    protected $fillable = [
        'user_id',
        'item_group_id',
        'name',
        'type',
        'rarity',
        'description',
        'modifiers',
        'weight',
        'value',
    ];

    protected $casts = [
        'modifiers' => 'array',
        'weight' => 'float',
        'value' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(ItemGroup::class, 'item_group_id');
    }
}
