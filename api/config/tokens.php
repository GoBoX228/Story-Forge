<?php

return [
    'access_ttl_minutes' => (int) env('ACCESS_TOKEN_TTL', 15),
    'refresh_ttl_minutes' => (int) env('REFRESH_TOKEN_TTL', 43200),
];
