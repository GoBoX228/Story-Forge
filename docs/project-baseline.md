# Project Baseline

Документ фиксирует фактическое состояние проекта перед дальнейшей доработкой. Он нужен, чтобы отделить реализованное ядро от планируемых модулей из ТЗ и дополнительных материалов.

## Назначение

`Story Forge / Кузница историй` — web-платформа для подготовки материалов настольных RPG. Основной фокус проекта — рабочее пространство ведущего: кампании, сценарии, карты, персонажи, предметы и экспорт материалов.

Проект не является полноценным VTT, социальной сетью или системой проведения онлайн-сессий. Социальные функции рассматриваются как дополнительный слой после стабилизации ядра.

## Технологический baseline

- Frontend: Next.js 16.2.4, React 19.2, TypeScript 5.9, Tailwind CSS, lucide-react.
- Backend: Laravel 12, PHP 8.2+, Laravel Sanctum, PostgreSQL.
- Export: Spatie Browsershot/Puppeteer для PDF.
- Infrastructure: Docker Compose, PostgreSQL 16, Mailpit.

## Реализовано

- Регистрация, вход, выход, refresh flow, восстановление пароля.
- Двухфакторная аутентификация.
- Профиль пользователя, смена пароля, avatar/banner upload.
- Роли и статусы пользователей.
- CRUD кампаний.
- CRUD сценариев.
- Backend legacy-слой глав и блоков сценария удален; сценарии работают graph-only на `scenario_nodes` и `scenario_transitions`.
- Backend Graph Scenario API v1 для `scenario_nodes` и `scenario_transitions`.
- Graph-first сценарный frontend для CRUD узлов и переходов сценария.
- Graph Canvas Navigation v2 + Edge Editing v2 + Edge Routing v1 + Edge Ports v1 + Selection UX v1 + Undo/Redo v1 + Readability v2 + Node Presentation v2 + Auto Layout v2 + Minimap v1 + Navigation Panel v2 + Manual Waypoints v1 + Waypoint Smoothing v1 + Obstacle-Aware Routing v1 + Typed Node Editors v1 + Scenario Play/Preview Mode v2 + Graph Validation v2 + Export Graph Scenario v1 + workspace layout v2: визуальные узлы, SVG-переходы от границ узлов с computed obstacle-aware auto-routes и separated input/output ports, typed forms для `config` узлов, read-only play mode с typed-блоками, outcomes, маршрутом и связанными материалами, frontend-only preflight validation с errors/warnings, graph-aware PDF runbook export, сохранение `position` при drag/resize/manual auto-layout, frontend-only undo/redo history для canvas-действий, pan, wheel zoom, fit-to-view, minimap-навигация в UI overlay, auto-layout v2 слева направо или сверху вниз с учетом размеров карточек, ветвлений и типов переходов, создание `linear` переходов drag-to-connect, выбор transition на canvas, quick edit `type`/`label`, inline-редактирование label на canvas, manual edge waypoints со сглаженными кривыми, удаление transition, keyboard shortcuts `Escape`/`Delete`/`Backspace`, selected-only compact output handles, label backgrounds, semantic node type border styling, resizable nodes через `position.width/height`, content preview на карточках узлов, canvas-first рабочая область, overlay-список узлов и inspector.
- Typed graph contract v2 для типов узлов, переходов, `config` и `condition`.
- Graph Node Links Upgrade v2: связи graph-узлов с картами, персонажами, предметами, ассетами, локациями, фракциями и событиями через `entity_links`, включая быстрые переходы к связанным материалам.
- Demo graph seed-данные для существующих демонстрационных сценариев.
- CRUD карт с canvas/grid-редактором.
- CRUD персонажей.
- CRUD предметов.
- Assets module v1 + Asset Integration v1: загрузка, реестр, фильтрация, preview, редактирование и удаление файлов/изображений/токенов через public storage; ассеты назначаются персонажам, предметам и картам через role-based `entity_links.metadata`.
- World module v1: CRUD/API/UI для локаций, фракций и событий с ownership scope, поиском и фильтрацией по кампании.
- Tags module v1: пользовательские теги, `taggables` assignment и фильтры по тегам для сценариев, карт, персонажей, предметов, ассетов и world-сущностей.
- Universal Entity Links v2: общий API/UI для направленных связей между сценариями, картами, персонажами, предметами, ассетами, локациями, фракциями и событиями.
- Базовые связи кампании со сценариями, картами и персонажами.
- Базовые связи сценария с картами и персонажами.
- PDF-экспорт сценария: graph-aware runbook по узлам/переходам с typed-полями и связанными материалами.
- Жалобы, системные объявления, админские маршруты и audit logs.
- Docker Compose окружение.
- Чистый baseline миграций без исторических `add_*`, `fix_*`, `migrate_*` и data-fix миграций.

## Частично реализовано

- Сценарный редактор: legacy-редактор и backend слой `chapters/blocks` удалены; основной UX состоит из graph canvas и read-only preview.
- Graph-модель: есть узлы, переходы, visual canvas с pan/zoom/fit-to-view, minimap-навигацией, manual auto-layout v2 по уровням переходов в двух направлениях, читаемыми directional edges, computed obstacle-aware auto-routing и separated input/output ports, keyboard clear/delete shortcuts, frontend-only undo/redo для move/resize/layout и transition create/update/delete, resizable node cards с content preview, drag-to-connect созданием переходов, quick edit и inline label edit переходов, canvas-first layout v2, typed forms для `config` узлов, read-only play mode, типизированный контракт `condition`, исходы `success`/`failure`, frontend-only warnings проверки graph-структуры и связи узлов с картами/персонажами/предметами/ассетами/world-сущностями.
- Связи между сущностями: `entity_links` используется и для graph-node связей с картами/персонажами/предметами/ассетами/локациями/фракциями/событиями, и как универсальный directed layer между основными материалами. UI показывает блок "Связанные материалы", поддерживает relation-типы, label, удаление и quick open target-а; обратные связи и canvas-визуализация universal links пока не реализованы.
- Социальные разделы: сообщества, друзья и сообщения временно скрыты из интерфейса; backend-моделей и API для них нет.
- Приватность и публикации: реализован базовый backend workflow публикаций материалов через `published_contents`, но publication/community UI временно скрыт до переработки социальной модели.
- Экспорт: реализован PDF сценария для graph-модели, но нет экспорта карт, карточек персонажей/предметов и очереди экспортов.
- Комментарии, export jobs, notifications и idempotency keys подготовлены как schema-only baseline.

## Не реализовано

- Следующие graph UX-задачи: publish/export enforcement и более полный graph layout/router.
- Backend/publish/export-blocking валидация невозможных переходов поверх frontend-only graph warnings.
- Comments/collaboration/invitations.
- Advanced publications/community features beyond v1 feed: comments, reactions, moderation workflow and public anonymous pages.
- Friends/messages backend.
- Notifications API.
- Search/filter/pagination по всем основным спискам.
- Cookie-only Sanctum SPA auth с CSRF без access token в `localStorage`.
- Route-based frontend architecture поверх Next.js routes.

## Database baseline

Миграции схлопнуты в доменные baseline-файлы:

- `create_auth_and_user_tables`;
- `create_laravel_runtime_tables`;
- `create_core_content_tables`;
- `create_scenario_graph_tables`;
- `create_world_and_relation_tables`;
- `create_collaboration_publication_export_tables`;
- `create_admin_moderation_tables`.

Новая схема создается с нуля через `migrate:fresh`. Production migration path для старых данных не поддерживается, потому что проект находится в dev/VKR-стадии и данные считаются неценными.

Таблицы `scenario_nodes` и `scenario_transitions` уже используются Graph Scenario API v1 и Graph UI v1.

Подготовленные schema-only таблицы для следующих этапов: `campaign_members`, `comments`, `export_jobs`, `idempotency_keys`, `notifications`.

`published_contents` поддерживает Publications module v1 на backend/API уровне: материалы `scenario`, `map`, `character`, `item`, `asset`, `location`, `faction`, `event` можно переводить между `draft/published/archived`, настраивать `private/unlisted/public`. Frontend publication/community UI временно скрыт; публикация graph-сценария с backend graph errors блокируется, warnings не блокируют публикацию.

`assets` уже используется Assets module v1 и Asset Integration v1: файлы сохраняются в Laravel `public` disk, записи привязаны к владельцу и опционально к кампании. Персонажи используют роли `portrait`/`token`, предметы `item_image`, карты `map_background`/`map_token`; map canvas хранит выбранный фон и token objects в `map.data`.

`locations`, `factions` и `events` уже используются World module v1: записи доступны через отдельный API/UI, привязаны к владельцу и опционально к кампании.

`tags` и `taggables` уже используются Tags module v1: теги пользовательские, assignment поддерживает `scenario`, `map`, `character`, `item`, `asset`, `location`, `faction`, `event`. Legacy `campaigns.tags` остается отдельным JSON-полем кампаний.

`entity_links` уже используется Graph Node Links Upgrade v2 для связей `scenario_node -> map/character/item/asset/location/faction/event`, Universal Entity Links v2 для материалов `scenario`, `map`, `character`, `item`, `asset`, `location`, `faction`, `event`, а также Asset Integration v1 для visual asset roles в `metadata.role`. Graph-node endpoints сохранены совместимыми, универсальные связи доступны отдельными `/api/entity-links/{sourceType}/{sourceId}` routes.

Социальный слой намеренно не включен в baseline: `communities`, `friend_requests`, `friendships`, `dialogs`, `messages`.

## Известные риски

- Документация и UI местами описывают перспективные функции как уже существующие.
- Frontend построен вокруг `App.tsx` и `activeView`, что усложнит рост маршрутов и модулей.
- Текущая auth-модель использует access token в `localStorage`; это расходится с целевой моделью безопасности из ТЗ.
- Социальная модель требует отдельной переработки: community должен стать слоем кружков/интересов, а не простой лентой публикаций.
- Frontend build/typecheck зависят от установленного `node_modules`; при чистом checkout их нужно воспроизводить через `npm ci`.

## Проверки baseline

Backend:

```bash
cd api
php artisan migrate:fresh
php artisan test
```

Frontend:

```bash
cd web
npm ci
npm run typecheck
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
```

На момент выполнения baseline-задачи подтверждены:

- `npm ci`;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`;
- `npm audit --omit=dev --audit-level=high`;
- `docker compose --progress=plain build web`;
- `docker compose exec -T api php artisan migrate:fresh --seed`;
- SQLite `php artisan migrate:fresh` для чистой схемы;
- `php artisan test`.

После Graph API/UI задач подтверждены backend feature-тесты для graph endpoints, seeder-тесты для demo graph data, frontend `typecheck`, `lint`, `build` и API smoke под demo user. Typed graph contract v2 дополнительно покрывает допустимые node/transition types, type-specific `config`, transition `condition` и outcomes. Graph Rules / Validation v1 работает на frontend как warning-layer и не блокирует сохранение.

После миграции на Next.js 16.2.4 проверка `npm audit --omit=dev --audit-level=high` не показывает runtime high/critical уязвимости. Полный `npm audit --omit=dev` все еще сообщает о moderate advisory во вложенном `next/node_modules/postcss`; автоматический fix предлагает breaking downgrade и не применяется.

## Текущий ближайший фокус

Baseline frontend/backend, чистая схема БД, Graph API v1, Graph UI v1, typed graph contract v2 и demo graph seed подтверждены. Перед разработкой новых модулей нужно сохранить это состояние как обязательную проверку:

1. Установить frontend-зависимости через `npm ci`.
2. Подтвердить `npm run typecheck`.
3. Подтвердить `npm run build`.
4. Подтвердить `php artisan test`.
5. Оставить README и этот документ в состоянии, где реализованное и планируемое явно разделены.

Следующий ближайший фокус: Graph Scenario MVP, начиная с publish/export enforcement и завершающей полировки.
## Graph visual metadata contract

`scenario_transitions.metadata` используется как отдельный canvas-only контракт для визуальных данных переходов. `metadata.visual.waypoints` хранит manual edge waypoints, которые рендерятся сглаженными SVG-кривыми; `condition` остается строгим gameplay-контрактом для `linear/choice/success/failure`.
