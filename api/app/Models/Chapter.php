<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Chapter extends Model
{
    protected $fillable = [
        'scenario_id',
        'title',
        'order_index',
    ];

    public function scenario(): BelongsTo
    {
        return $this->belongsTo(Scenario::class);
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(Block::class)->orderBy('order_index');
    }
}
