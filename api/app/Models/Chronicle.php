<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Chronicle extends Model
{
    protected $fillable = [
        'user_id',
        'campaign_id',
        'title',
        'description',
        'start_label',
        'end_label',
        'step_size',
        'metadata',
    ];

    protected $casts = [
        'step_size' => 'integer',
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

    public function events(): HasMany
    {
        return $this->hasMany(WorldEvent::class);
    }
}
