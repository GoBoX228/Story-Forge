#!/usr/bin/env sh
set -eu

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

require_env() {
  name="$1"
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    fail "$name is required for production startup."
  fi
}

assert_production_config() {
  if [ "${APP_ENV:-}" != "production" ]; then
    fail "APP_ENV must be production in docker-entrypoint.prod.sh."
  fi

  debug_value="$(printf '%s' "${APP_DEBUG:-}" | tr '[:upper:]' '[:lower:]')"
  case "$debug_value" in
    false|0|no|off) ;;
    *) fail "APP_DEBUG must be false in production." ;;
  esac

  require_env APP_URL
  require_env APP_KEY
  require_env DB_PASSWORD
  require_env CORS_ALLOWED_ORIGINS

  case "$APP_URL" in
    https://*) ;;
    *) fail "APP_URL must use https:// in production." ;;
  esac

  case "$APP_KEY" in
    base64:REPLACE_WITH_REAL_KEY|REPLACE_WITH_REAL_KEY|"")
      fail "APP_KEY must be a real generated key, not a placeholder."
      ;;
  esac

  case "$DB_PASSWORD" in
    CHANGE_ME|storyforge|password|"")
      fail "DB_PASSWORD must be changed from the development/default value."
      ;;
  esac

  cors_value="$(printf '%s' "$CORS_ALLOWED_ORIGINS" | tr '[:upper:]' '[:lower:]')"
  case "$cors_value" in
    *localhost*|*127.0.0.1*|http://*)
      fail "CORS_ALLOWED_ORIGINS must contain only production HTTPS origins."
      ;;
  esac
}

assert_production_config

until php -r "exit((int)!@fsockopen(getenv('DB_HOST') ?: 'postgres', (int)(getenv('DB_PORT') ?: 5432)));"; do
  echo "Waiting for database..."
  sleep 2
done

mkdir -p storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

php artisan migrate --force
if [ ! -L public/storage ]; then
  php artisan storage:link
fi
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache || php artisan route:clear
php artisan view:cache

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec php artisan serve --host=0.0.0.0 --port=8000
