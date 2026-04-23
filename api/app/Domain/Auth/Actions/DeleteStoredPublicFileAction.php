<?php

namespace App\Domain\Auth\Actions;

use Illuminate\Support\Facades\Storage;

class DeleteStoredPublicFileAction
{
    public function execute(?string $url): void
    {
        if (!$url) {
            return;
        }

        $path = parse_url($url, PHP_URL_PATH);
        if (!$path || !str_starts_with($path, '/storage/')) {
            return;
        }

        $diskPath = ltrim(substr($path, strlen('/storage/')), '/');
        if ($diskPath !== '') {
            Storage::disk('public')->delete($diskPath);
        }
    }
}
