<?php

namespace App\Domain\Export\Actions;

use Spatie\Browsershot\Browsershot;

class GenerateMapPdfAction
{
    public function execute(string $html, string $pageSize, string $orientation): string
    {
        return Browsershot::html($html)
            ->format(mb_strtoupper($pageSize))
            ->landscape($orientation === 'landscape')
            ->showBackground()
            ->margins(0, 0, 0, 0)
            ->noSandbox()
            ->setChromePath(env('CHROME_PATH', '/usr/bin/chromium'))
            ->pdf();
    }
}
