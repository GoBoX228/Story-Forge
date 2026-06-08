# Timeweb Cloud Production Deploy

Production deploy uses a separate Docker Compose file. The development `docker-compose.yml` remains unchanged.

## 1. DNS

Create an `A` record for your domain pointing to the Timeweb server IP:

```text
your-domain.ru -> 91.135.156.113
```

Wait until DNS resolves before starting Caddy. Caddy will request HTTPS certificates automatically.

## 2. Server Env

On the server:

```bash
cd /opt/story-forge
cp .env.prod.example .env.prod
nano .env.prod
```

Generate `APP_KEY`:

```bash
openssl rand -base64 32
```

Put it into `.env.prod` as:

```env
APP_KEY=base64:PASTE_GENERATED_VALUE
```

Set a real database password and the real domain:

```env
DOMAIN=your-domain.ru
NEXT_PUBLIC_API_URL=https://your-domain.ru
APP_URL=https://your-domain.ru
CORS_ALLOWED_ORIGINS=https://your-domain.ru
DB_PASSWORD=CHANGE_ME
```

Replace `CHANGE_ME` with a real password before startup. The production API entrypoint fails fast when unsafe values are detected:

- `APP_ENV` is not `production`;
- `APP_DEBUG` is not false;
- `APP_URL` does not use `https://`;
- `APP_KEY` is empty or still `base64:REPLACE_WITH_REAL_KEY`;
- `DB_PASSWORD` is still `CHANGE_ME`, `storyforge`, or another default value;
- `CORS_ALLOWED_ORIGINS` contains `localhost`, `127.0.0.1`, or `http://`.

## 3. Start

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Check containers:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=100 api
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=100 web
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=100 caddy
```

## 4. Update From GitHub

```bash
cd /opt/story-forge
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker image prune -f
```

## Notes

- Only Caddy publishes public ports `80` and `443`.
- `web`, `api`, and `postgres` are internal Docker services.
- Rate limits are enabled for auth endpoints, asset uploads, PDF exports and report creation. Current limits are defined in `api/app/Providers/AppServiceProvider.php`.
- Assets are still stored in Laravel `storage` via the `api_storage` Docker volume. Public uploads use MIME and extension allowlists, server-generated paths, and stricter `/storage/*` response headers.
- Object storage, queue workers, and real SMTP are future production hardening tasks.
- Mail is logged by default in `.env.prod.example`; configure a real SMTP provider before enabling password reset emails.
