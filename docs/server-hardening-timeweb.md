# Timeweb Server Hardening Runbook

This runbook is for the single-server Docker production deploy on Timeweb Cloud.

## Safety Rules

- Keep the current SSH session open until a second SSH login works.
- Do not close port `22` before key-based SSH is confirmed.
- Do not run `docker compose down -v` in production unless you intentionally want to delete database/storage volumes.

## 1. Confirm Production Compose Isolation

Run on the server:

```bash
cd /opt/story-forge
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
ss -tulpn
```

Expected public ports:

- `80` and `443` from Caddy;
- `22` from SSH.

`web:3000`, `api:8000`, `postgres:5432` and `mailpit:8025` must not be published by production compose.

If old dev containers are still present:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --remove-orphans
```

## 2. Firewall

Enable UFW after confirming SSH works:

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status verbose
```

If Timeweb monitoring requires the local Zabbix agent on `10050`, allow only Timeweb monitoring source IPs. Do not expose `10050` to the whole internet unless the provider explicitly requires it.

## 3. SSH Key-Only Login

First, confirm login from a second terminal:

```powershell
ssh -i $env:USERPROFILE\.ssh\story_forge_timeweb root@91.135.156.113
```

Then create a hardening drop-in on the server:

```bash
cat >/etc/ssh/sshd_config.d/99-story-forge-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
PermitRootLogin prohibit-password
X11Forwarding no
EOF

sshd -t
systemctl reload ssh
```

Open a new terminal and verify key login again before closing the old session.

## 4. Update Flow

Use `--remove-orphans` so dev-only containers such as `mailpit` are removed if they were previously started under the same Compose project:

```bash
cd /opt/story-forge
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --remove-orphans
docker image prune -f
```

## 5. Backup

Create a backup directory:

```bash
mkdir -p /opt/story-forge-backups
chmod 700 /opt/story-forge-backups
```

Database dump:

```bash
cd /opt/story-forge
set -a
. ./.env.prod
set +a
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres \
  pg_dump -U "$DB_USERNAME" "$DB_DATABASE" \
  > "/opt/story-forge-backups/storyforge_db_$(date +%F_%H%M%S).sql"
```

Laravel storage volume:

```bash
docker run --rm \
  -v story-forge_api_storage:/data:ro \
  -v /opt/story-forge-backups:/backup \
  alpine tar -czf "/backup/storyforge_storage_$(date +%F_%H%M%S).tar.gz" -C /data .
```

Check backup files:

```bash
ls -lh /opt/story-forge-backups
```

## 6. Restore Notes

Restore database into an empty database:

```bash
cd /opt/story-forge
set -a
. ./.env.prod
set +a
cat /opt/story-forge-backups/storyforge_db_YYYY-MM-DD_HHMMSS.sql | \
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres \
  psql -U "$DB_USERNAME" "$DB_DATABASE"
```

Restore storage volume:

```bash
docker run --rm \
  -v story-forge_api_storage:/data \
  -v /opt/story-forge-backups:/backup \
  alpine sh -c 'cd /data && tar -xzf /backup/storyforge_storage_YYYY-MM-DD_HHMMSS.tar.gz'
```

## 7. Health Checks

```bash
curl -I https://mystoryforge.ru
curl -i -X OPTIONS https://mystoryforge.ru/api/auth/login \
  -H "Origin: https://mystoryforge.ru" \
  -H "Access-Control-Request-Method: POST"
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=100 api
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=100 web
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=100 caddy
```

Expected:

- site returns `200`;
- CORS preflight returns only the production origin;
- security headers are present;
- API container is healthy;
- only Caddy is publicly reachable for HTTP/HTTPS.

