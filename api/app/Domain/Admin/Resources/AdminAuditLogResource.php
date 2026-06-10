<?php

namespace App\Domain\Admin\Resources;

use App\Models\AdminAuditLog;

class AdminAuditLogResource extends BaseAdminResource
{
    private const REDACTED = '[redacted]';

    private const SENSITIVE_KEY_PARTS = [
        'authorization',
        'cookie',
        'db_password',
        'env',
        'exception',
        'key',
        'mail_password',
        'password',
        'private',
        'secret',
        'stack',
        'token',
        'trace',
    ];

    public function toArray($request): array
    {
        /** @var AdminAuditLog $log */
        $log = $this->resource;

        return [
            'id' => $log->id,
            'action' => $log->action,
            'details' => $log->details,
            'context' => self::sanitizeContext($log->context ?? []),
            'created_at' => $log->created_at,
            'user' => [
                'id' => $log->user?->id,
                'name' => $log->user?->name ?? 'system',
                'email' => $log->user?->email,
            ],
        ];
    }

    private static function sanitizeContext(mixed $value): mixed
    {
        if (!is_array($value)) {
            return is_string($value) && mb_strlen($value) > 500
                ? mb_substr($value, 0, 500) . '...'
                : $value;
        }

        $sanitized = [];

        foreach ($value as $key => $item) {
            if (is_string($key) && self::isSensitiveKey($key)) {
                $sanitized[$key] = self::REDACTED;
                continue;
            }

            $sanitized[$key] = self::sanitizeContext($item);
        }

        return $sanitized;
    }

    private static function isSensitiveKey(string $key): bool
    {
        $normalized = strtolower($key);

        foreach (self::SENSITIVE_KEY_PARTS as $part) {
            if (str_contains($normalized, $part)) {
                return true;
            }
        }

        return false;
    }
}
