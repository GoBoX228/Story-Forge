<?php

namespace App\Domain\Auth\Actions;

use Symfony\Component\HttpFoundation\Cookie;

class ForgetRefreshCookieAction
{
    public function execute(): Cookie
    {
        return cookie('refresh_token', '', -1, '/', null, app()->environment('production'), true, false, 'Lax');
    }
}
