<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScenarioGroup extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'description',
        'order_index',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scenarios(): HasMany
    {
        return $this->hasMany(Scenario::class);
    }
}

