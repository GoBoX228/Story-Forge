<?php

return [
    'refresh_ttl_minutes' => (int) env('REFRESH_TOKEN_TTL', 43200),
    'csrf_ttl_minutes' => (int) env('CSRF_TOKEN_TTL', 120),
];
