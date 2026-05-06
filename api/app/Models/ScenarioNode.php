<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScenarioNode extends Model
{
    protected $fillable = [
        'scenario_id',
        'type',
        'title',
        'content',
        'position',
        'config',
        'order_index',
    ];

    protected $casts = [
        'position' => 'array',
        'config' => 'array',
    ];

    public function scenario(): BelongsTo
    {
        return $this->belongsTo(Scenario::class);
    }

    public function outgoingTransitions(): HasMany
    {
        return $this->hasMany(ScenarioTransition::class, 'from_node_id')->orderBy('order_index');
    }

    public function incomingTransitions(): HasMany
    {
        return $this->hasMany(ScenarioTransition::class, 'to_node_id')->orderBy('order_index');
    }
}
