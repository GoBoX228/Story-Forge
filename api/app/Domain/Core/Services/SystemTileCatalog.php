<?php

namespace App\Domain\Core\Services;

use RuntimeException;

class SystemTileCatalog
{
    private const MANIFEST_PATH = 'system/tiles/core/v1/manifest.json';

    private ?array $manifest = null;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function list(string $baseUrl): array
    {
        $manifest = $this->manifest();
        $setName = (string) ($manifest['name'] ?? 'Основной набор');

        return collect($manifest['tiles'] ?? [])
            ->filter(fn (mixed $tile): bool => is_array($tile))
            ->map(fn (array $tile): array => [
                'id' => (string) $tile['id'],
                'slug' => (string) $tile['slug'],
                'name' => (string) $tile['name'],
                'category' => (string) ($tile['category'] ?? 'floor'),
                'color' => (string) ($tile['color'] ?? '#9aa0a6'),
                'url' => $this->tileUrl($tile, $baseUrl),
                'set_name' => $setName,
                'readonly' => true,
            ])
            ->values()
            ->all();
    }

    public function resolveUrl(string $id, string $baseUrl): ?string
    {
        $tile = $this->tileById($id);

        return is_array($tile) ? $this->tileUrl($tile, $baseUrl) : null;
    }

    public function resolveLocalUri(string $id): ?string
    {
        $tile = $this->tileById($id);
        if (!is_array($tile)) {
            return null;
        }

        $path = $this->tilePath($tile);
        if (!is_file($path)) {
            return null;
        }

        return $this->fileUri($path);
    }

    /**
     * @return array<string, mixed>
     */
    private function manifest(): array
    {
        if ($this->manifest !== null) {
            return $this->manifest;
        }

        $path = public_path(self::MANIFEST_PATH);
        $contents = file_get_contents($path);

        if ($contents === false) {
            throw new RuntimeException('System tile manifest is unavailable.');
        }

        $manifest = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);

        if (!is_array($manifest) || !is_array($manifest['tiles'] ?? null)) {
            throw new RuntimeException('System tile manifest is invalid.');
        }

        return $this->manifest = $manifest;
    }

    /**
     * @param array<string, mixed> $tile
     */
    private function tileUrl(array $tile, string $baseUrl): string
    {
        $file = basename((string) ($tile['file'] ?? ''));

        return rtrim($baseUrl, '/') . '/system/tiles/core/v1/' . rawurlencode($file);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function tileById(string $id): ?array
    {
        $tile = collect($this->manifest()['tiles'] ?? [])
            ->first(fn (mixed $tile): bool => is_array($tile) && ($tile['id'] ?? null) === $id);

        return is_array($tile) ? $tile : null;
    }

    /**
     * @param array<string, mixed> $tile
     */
    private function tilePath(array $tile): string
    {
        return public_path('system/tiles/core/v1/' . basename((string) ($tile['file'] ?? '')));
    }

    private function fileUri(string $path): string
    {
        $normalized = str_replace('\\', '/', $path);
        if (preg_match('/^[A-Za-z]:\//', $normalized) === 1) {
            $normalized = '/' . $normalized;
        }

        return 'file://' . str_replace('%2F', '/', rawurlencode($normalized));
    }
}
