<?php

namespace App\Support;

use Closure;
use Illuminate\Http\UploadedFile;

final class SafePublicUpload
{
    private const DANGEROUS_EXTENSIONS = [
        'bat',
        'cmd',
        'com',
        'exe',
        'htm',
        'html',
        'jar',
        'js',
        'mjs',
        'phar',
        'php',
        'phtml',
        'ps1',
        'scr',
        'sh',
        'svg',
    ];

    /**
     * @param array<int, string> $allowedExtensions
     */
    public static function rule(array $allowedExtensions): Closure
    {
        $allowed = array_map(
            static fn (string $extension): string => strtolower(ltrim($extension, '.')),
            $allowedExtensions
        );

        return static function (string $attribute, mixed $value, Closure $fail) use ($allowed): void {
            if (!$value instanceof UploadedFile) {
                return;
            }

            $originalName = $value->getClientOriginalName();
            if ($originalName === '' || str_contains($originalName, "\0")) {
                $fail('The uploaded file name is invalid.');

                return;
            }

            $normalizedName = str_replace('\\', '/', $originalName);
            if (str_contains($normalizedName, '/')) {
                $fail('The uploaded file name is invalid.');

                return;
            }

            $segments = array_values(array_filter(
                explode('.', strtolower($originalName)),
                static fn (string $segment): bool => $segment !== ''
            ));

            if (count($segments) < 2) {
                $fail('The uploaded file must have an allowed extension.');

                return;
            }

            $finalExtension = end($segments);
            if (!is_string($finalExtension) || !in_array($finalExtension, $allowed, true)) {
                $fail('The uploaded file extension is not allowed.');

                return;
            }

            foreach (array_slice($segments, 1) as $extensionSegment) {
                if (in_array($extensionSegment, self::DANGEROUS_EXTENSIONS, true)) {
                    $fail('The uploaded file name contains an unsafe extension.');

                    return;
                }
            }
        };
    }
}
