<?php

namespace App\Http\Middleware;

use App\Domain\Auth\Actions\ForgetRefreshCookieAction;
use App\Domain\Auth\Actions\RefreshTokenAction;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateWithRefreshCookie
{
    public function __construct(
        private readonly RefreshTokenAction $refreshTokenAction,
        private readonly ForgetRefreshCookieAction $forgetRefreshCookieAction,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()) {
            return $next($request);
        }

        $plainToken = $request->cookie('refresh_token');
        if (!$plainToken) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $record = $this->refreshTokenAction->resolve($plainToken);
        $user = $record?->user;

        if (!$record || !$user) {
            return response()
                ->json(['message' => 'Unauthenticated.'], 401)
                ->withCookie($this->forgetRefreshCookieAction->execute());
        }

        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);
        $request->attributes->set('refresh_cookie_authenticated', true);

        return $next($request);
    }
}
