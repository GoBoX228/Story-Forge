<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScenarioTransition extends Model
{
    protected $fillable = [
        'scenario_id',
        'from_node_id',
        'to_node_id',
        'type',
        'label',
        'condition',
        'metadata',
        'order_index',
    ];

    protected $casts = [
        'condition' => 'array',
        'metadata' => 'array',
    ];

    public function scenario(): BelongsTo
    {
        return $this->belongsTo(Scenario::class);
    }

    public function fromNode(): BelongsTo
    {
        return $this->belongsTo(ScenarioNode::class, 'from_node_id');
    }

    public function toNode(): BelongsTo
    {
        return $this->belongsTo(ScenarioNode::class, 'to_node_id');
    }
}
