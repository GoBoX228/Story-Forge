<?php

namespace App\Http\Middleware;

use App\Domain\Auth\Actions\IssueCsrfTokenAction;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateCsrfHeader
{
    public function __construct(
        private readonly IssueCsrfTokenAction $issueCsrfTokenAction,
    ) {
    }

    public function handle(Request $request, Closure $next, string $mode = 'cookie'): Response
    {
        if ($request->isMethodSafe()) {
            return $next($request);
        }

        $mustValidate = $mode === 'always' || $request->attributes->get('refresh_cookie_authenticated') === true;
        if (!$mustValidate) {
            return $next($request);
        }

        $token = $request->headers->get(IssueCsrfTokenAction::HEADER_NAME)
            ?: $request->headers->get('X-XSRF-TOKEN');
        $signature = $request->cookie(IssueCsrfTokenAction::COOKIE_NAME);

        if (!$this->issueCsrfTokenAction->isValid($token, $signature)) {
            return response()
                ->json(['message' => 'CSRF token invalid'], 419)
                ->withCookie($this->issueCsrfTokenAction->forgetCookie());
        }

        return $next($request);
    }
}
