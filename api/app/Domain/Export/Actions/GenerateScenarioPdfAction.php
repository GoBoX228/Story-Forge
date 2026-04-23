<?php

namespace App\Domain\Export\Actions;

use Spatie\Browsershot\Browsershot;

class GenerateScenarioPdfAction
{
    public function execute(string $html): string
    {
        return Browsershot::html($html)
            ->format('A4')
            ->showBackground()
            ->margins(12, 12, 12, 12)
            ->noSandbox()
            ->setChromePath(env('CHROME_PATH', '/usr/bin/chromium'))
            ->pdf();
    }
}

