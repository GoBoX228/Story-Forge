#!/bin/sh
set -e

if [ ! -f .env ]; then
  cp .env.example .env
fi

if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:" ]; then
  php artisan key:generate --force
fi

# Keep vendor in sync with composer.lock inside named volume.
LOCK_HASH_FILE="${COMPOSER_CACHE_DIR:-/tmp/composer-cache}/.composer.lock.hash"
CURRENT_LOCK_HASH=""
if [ -f composer.lock ]; then
  CURRENT_LOCK_HASH="$(sha1sum composer.lock | awk '{print $1}')"
fi
INSTALLED_LOCK_HASH=""
mkdir -p "$(dirname "$LOCK_HASH_FILE")"
if [ -f "$LOCK_HASH_FILE" ]; then
  INSTALLED_LOCK_HASH="$(cat "$LOCK_HASH_FILE")"
fi

if [ ! -f vendor/autoload.php ] || [ "$CURRENT_LOCK_HASH" != "$INSTALLED_LOCK_HASH" ]; then
  composer install --no-interaction --prefer-dist --no-scripts
  php artisan package:discover --ansi
  if [ -n "$CURRENT_LOCK_HASH" ]; then
    printf "%s" "$CURRENT_LOCK_HASH" > "$LOCK_HASH_FILE"
  fi
fi

if [ ! -d node_modules ]; then
  npm install
fi

echo "Waiting for database..."
for i in $(seq 1 30); do
  php -r "new PDO('pgsql:host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT') . ';dbname=' . getenv('DB_DATABASE'), getenv('DB_USERNAME'), getenv('DB_PASSWORD'));" >/dev/null 2>&1 && break
  echo "Database not ready, retrying ($i/30)..."
  sleep 2
done

php artisan migrate --force

chmod -R 777 storage bootstrap/cache

php artisan storage:link --force >/dev/null 2>&1 || true

php artisan serve --host=0.0.0.0 --port=8000
