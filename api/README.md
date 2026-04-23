# Story Forge API (Backend)

Backend сервиса `Story Forge` на Laravel 12 + PostgreSQL.

## Назначение

API обеспечивает:
- аутентификацию и профиль пользователя;
- core CRUD (кампании, сценарии, главы, блоки, карты, персонажи, предметы);
- модерацию и админ-инструменты;
- жалобы (`reports`) и пользовательские объявления (`broadcasts`);
- экспорт сценариев в PDF.

Frontend и realtime-часть находятся в соседних сервисах/модулях.

## Технологии

- PHP `8.2+`
- Laravel `12`
- Laravel Sanctum (access/refresh + cookie refresh flow)
- PostgreSQL (production), SQLite in-memory (tests)
- Spatie Browsershot (PDF export)

## Быстрый запуск

### Локально

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --force
php artisan serve
```

### Через Docker (рекомендуется для полного стенда)

Запуск из корня проекта:

```bash
docker compose up -d --build
```

## Тестирование

```bash
php artisan test
```

Таргетные прогоны:

```bash
php artisan test --filter=Auth
php artisan test --filter=CoreCrud
php artisan test --filter=ReportBroadcastExport
php artisan test --filter=AdminModule
```

## Архитектура

Текущая целевая архитектура — модульная domain-структура с thin controllers:

`FormRequest -> Controller -> Policy -> DTO -> Service -> Actions -> Resource/Response`

Модули:
- `App\Domain\Auth`
- `App\Domain\Admin`
- `App\Domain\Core`
- `App\Domain\Report`
- `App\Domain\Broadcast`
- `App\Domain\Export`

Контроллеры в `app/Http/Controllers` выполняют только orchestration HTTP-слоя.

Подробная архитектурная документация:  
`docs/backend-architecture.md`

## Контракт и совместимость

- Публичный API сохраняется стабильным (URI/method/status/payload keys).
- Ownership-контроль по ресурсам реализован scoped-запросами; для чужих сущностей целевой ответ обычно `404`.
- Policy-слой применяется для авторизованных сценариев доступа/ограничений.

## Структура проекта (основное)

- `app/Domain/*` — бизнес-логика по модулям.
- `app/Http/Controllers/*` — thin HTTP entrypoints.
- `routes/api.php` — контракт API.
- `database/migrations/*` — схема и data-fix миграции.
- `tests/Feature/*` — контрактные и feature-тесты.

## Примечания по PDF export

- Используется Browsershot + Chromium.
- Для контейнера используется `CHROME_PATH` (см. env-конфигурацию).
- Тесты export мокируют генерацию PDF и не требуют реального Chromium.

