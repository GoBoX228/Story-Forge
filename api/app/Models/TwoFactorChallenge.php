<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TwoFactorChallenge extends Model
{
    public const PURPOSE_LOGIN = 'login';
    public const PURPOSE_ENABLE = 'enable';
    public const PURPOSE_DISABLE = 'disable';

    protected $fillable = [
        'user_id',
        'purpose',
        'challenge_hash',
        'code_hash',
        'attempts',
        'expires_at',
        'consumed_at',
        'last_sent_at',
        'sent_count',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'consumed_at' => 'datetime',
        'last_sent_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
