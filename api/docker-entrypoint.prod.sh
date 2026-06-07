#!/usr/bin/env sh
set -eu

until php -r "exit((int)!@fsockopen(getenv('DB_HOST') ?: 'postgres', (int)(getenv('DB_PORT') ?: 5432)));"; do
  echo "Waiting for database..."
  sleep 2
done

mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

php artisan migrate --force
php artisan storage:link || true
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache || php artisan route:clear
php artisan view:cache

exec php artisan serve --host=0.0.0.0 --port=8000
