<?php

namespace App\Http\Controllers;

use App\Domain\Core\Requests\CoreReadRequest;
use App\Domain\Core\Services\SystemTileCatalog;
use Illuminate\Http\JsonResponse;

class SystemTileController extends Controller
{
    public function __construct(
        private readonly SystemTileCatalog $systemTileCatalog,
    ) {
    }

    public function index(CoreReadRequest $request): JsonResponse
    {
        return response()->json(
            $this->systemTileCatalog->list((string) config('app.url'))
        );
    }
}
