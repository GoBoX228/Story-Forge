<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    public const STATUS_OPEN = 'open';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_DISMISSED = 'dismissed';

    public const TARGET_USER = 'user';
    public const TARGET_SCENARIO = 'scenario';
    public const TARGET_MAP = 'map';
    public const TARGET_CHARACTER = 'character';
    public const TARGET_ITEM = 'item';
    public const TARGET_CAMPAIGN = 'campaign';

    protected $fillable = [
        'reporter_id',
        'target_type',
        'target_id',
        'reason',
        'description',
        'status',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
