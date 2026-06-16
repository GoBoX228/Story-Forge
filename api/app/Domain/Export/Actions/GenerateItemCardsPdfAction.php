<?php

namespace App\Domain\Export\Actions;

use Spatie\Browsershot\Browsershot;

class GenerateItemCardsPdfAction
{
    public function execute(string $html): string
    {
        return Browsershot::html($html)
            ->format('A4')
            ->showBackground()
            ->margins(0, 0, 0, 0)
            ->noSandbox()
            ->setChromePath(env('CHROME_PATH', '/usr/bin/chromium'))
            ->pdf();
    }
}
