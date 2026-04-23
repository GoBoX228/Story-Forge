<?php

namespace App\Domain\Admin\DTO;

final readonly class ListUsersData
{
    public function __construct(
        public string $search,
    ) {
    }
}
