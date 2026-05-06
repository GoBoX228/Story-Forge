<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EntityLink extends Model
{
    public const SOURCE_SCENARIO_NODE = 'scenario_node';

    public const TARGET_SCENARIO = 'scenario';

    public const TARGET_MAP = 'map';

    public const TARGET_CHARACTER = 'character';

    public const TARGET_ITEM = 'item';

    public const TARGET_ASSET = 'asset';

    public const TARGET_LOCATION = 'location';

    public const TARGET_FACTION = 'faction';

    public const TARGET_EVENT = 'event';

    public const RELATION_RELATED = 'related';

    public const RELATION_USES = 'uses';

    public const RELATION_LOCATED_IN = 'located_in';

    public const RELATION_MEMBER_OF = 'member_of';

    public const RELATION_REWARDS = 'rewards';

    public const RELATION_MENTIONS = 'mentions';

    protected $fillable = [
        'source_type',
        'source_id',
        'target_type',
        'target_id',
        'relation_type',
        'label',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];
}
