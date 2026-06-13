# Кузница историй Roadmap

## Назначение документа

`ROADMAP.md` фиксирует текущее состояние проекта, ближайший технический фокус и отложенные задачи. README и `docs/project-baseline.md` остаются справочными документами, а roadmap используется как рабочий трекер по статусам.

Технические названия файлов, классов, маршрутов, библиотек и команд не переводятся. UI-термины проекта используются на русском: `Атлас`, `Места`, `Организации`, `Хроника`, `События хроники`.

## Легенда статусов

- `Реализовано` - функциональность есть в коде и покрыта тестами, сборкой или ручной проверкой.
- `Реализовано частично` - есть схема, API, UI-заготовка или часть workflow, но пользовательский сценарий еще не полный.
- `В работе` - актуальный ближайший фокус.
- `Запланировано` - принято к реализации позже.
- `Отложено` - намеренно не входит в ближайший MVP.
- `Устарело` - запись больше не соответствует архитектуре проекта.
- `Отменено` - направление удалено из продукта или заменено другим подходом.

## Текущий baseline

- Frontend: Next.js 16.2.7, React 19.2, TypeScript, Tailwind CSS, ESLint Flat Config.
- Backend: Laravel 12, PHP 8.2+, PostgreSQL 16, Laravel Sanctum.
- Docker/dev: `docker-compose.yml`, PostgreSQL 16, Mailpit, frontend на `node:22-alpine`.
- Docker/prod: `docker-compose.prod.yml`, Caddy reverse proxy, Next production build, Laravel production env, внутренние сервисы без публичных портов.
- Auth: cookie-first API auth через HttpOnly refresh cookie, CSRF handshake `GET /api/auth/csrf` и `X-CSRF-TOKEN`.
- Сценарии: legacy-модель `scenarios -> chapters -> blocks` удалена из активного UX; сценарный модуль работает graph-first через `scenario_nodes` и `scenario_transitions`.
- Атлас: `Chronicle`, `WorldEvent`, `Location`, `Faction` остаются backend-терминами; в UI используются `Хроники`, `События хроники`, `Места`, `Организации`.

Основание: `web/package.json`, `web/Dockerfile`, `web/Dockerfile.prod`, `docker-compose.yml`, `docker-compose.prod.yml`, `api/routes/api.php`, `api/database/migrations`, `web/src/components/Sidebar.tsx`, `web/src/components/WorldEditor.tsx`.

## Реализованные возможности

### Инфраструктура и безопасность

- `Реализовано` Production Docker Deployment v1 для Timeweb Cloud: Caddy, HTTPS, production-сборки web/api, закрытые внутренние сервисы.
  Основание: `docker-compose.prod.yml`, `deploy/Caddyfile`, `api/Dockerfile.prod`, `web/Dockerfile.prod`, `api/docker-entrypoint.prod.sh`, `docs/deployment-timeweb.md`.
- `Реализовано` Server/Deploy Hardening v1: SSH key-only, UFW, cleanup dev-контейнеров, backup/restore и production health checks.
  Основание: `docs/server-hardening-timeweb.md`.
- `Реализовано` Dependency Security Patch v1: обновлены frontend/backend зависимости, проверки `npm audit` и `composer audit` используются как security baseline.
  Основание: `web/package.json`, `api/composer.lock`, `docs/project-baseline.md`.
- `Реализовано` Security Headers + CSP v2 и File Storage Security v1: Caddy отдает security headers, `/storage/*` получает строгую CSP, загрузки проходят MIME/extension allowlist.
  Основание: `deploy/Caddyfile`, upload requests/services, `SecurityAuthorizationTest`.
- `Реализовано` Rate Limits + Abuse Guardrails v1: endpoint-specific throttles для auth, asset upload, PDF export, reports и admin.
  Основание: `AppServiceProvider::RateLimiter`, `api/routes/api.php`, `AuthTest`, `SecurityAuthorizationTest`.
- `Реализовано` CSRF Token Handshake v1: cookie-authenticated write requests требуют CSRF header.
  Основание: `IssueCsrfTokenAction`, `ValidateCsrfHeader`, `GET /api/auth/csrf`, `AuthTest`, `SecurityAuthorizationTest`.

### Auth, Admin и профиль

- `Реализовано` Cookie-First Auth v1: frontend bearer access tokens убраны, protected API работает через HttpOnly refresh cookie.
  Основание: `api/routes/api.php`, `web/src/lib/api.ts`, `AuthTest`.
- `Реализовано` 2FA, password reset и профиль пользователя.
  Основание: `TwoFactorChallenge`, `TwoFactorRecoveryCode`, auth controllers/services, `AuthTest`.
- `Реализовано` Admin Surface Hardening v1: admin throttle, audit coverage, redaction sensitive context keys.
  Основание: `/api/admin/*`, `AdminAccessTest`, `AdminModuleTest`.

### Базовые Материалы

- `Реализовано` CRUD кампаний, сценариев, карт, персонажей, предметов, тегов и универсальных связей.
  Основание: `api/routes/api.php`, `CoreCrudTest`, `CampaignTest`, `TagModuleTest`, `UniversalEntityLinkTest`.
- `Реализовано` Tags module v1: приватные пользовательские теги через polymorphic assignment и фильтры в редакторах.
  Основание: `TagController`, `TagPicker.tsx`, `TagModuleTest`.
- `Реализовано` Universal Entity Links v2: общий слой связей `entity_links` между материалами.
  Основание: `EntityLinkController`, `EntityLinksPanel.tsx`, `UniversalEntityLinkTest`.

### Сценарный Graph-Редактор

- `Реализовано` Graph Scenario API v1: CRUD `scenario_nodes` и `scenario_transitions`.
  Основание: `ScenarioNodeController`, `ScenarioTransitionController`, `ScenarioGraphTest`.
- `Реализовано` graph-first frontend editor: canvas, drag/resize узлов, edge editing, quick edit, inline labels, minimap, pan/zoom/fit, undo/redo, validation и preview/play mode.
  Основание: `ScenarioEditor.tsx`, `GraphCanvas.tsx`, `graphValidation.ts`, `ScenarioPreviewPanel.tsx`.
- `Реализовано` Graph Canvas Free-Side Ports v1: стороны входа/выхода переходов выбираются геометрически, а не фиксируются как `input = left/top` и `output = right/bottom`.
  Основание: `GraphCanvas.tsx::choosePortSides`.
- `Реализовано` Graph Visual Metadata Contract v1 и manual waypoints: visual routes хранятся в `scenario_transitions.metadata.visual`, а gameplay `condition` не смешивается с visual data.
  Основание: `ScenarioTransitionStoreRequest`, `ScenarioTransitionUpdateRequest`, `GraphCanvas.tsx`, `ScenarioGraphTest`.
- `Реализовано` Scenario Composition Links v1: состав сценария управляется через поля `Персонажи`, `Карты`, `Предметы` поверх `entity_links` с `relationType='uses'`.
  Основание: `ScenarioSettingsPanel.tsx`, `ScenarioEditor.tsx`.
- `Реализовано` Graph Node Typed Material Links v1: `dialog` выбирает говорящего из привязанных персонажей, `loot` выбирает награды из привязанных предметов.
  Основание: `GraphNodeEntityLinks.tsx`, `GraphNodeDetails.tsx`, `ScenarioGraphContract.php`, `ScenarioExportService.php`.
- `Реализовано` Export Graph Scenario v1: PDF export строится по graph-узлам и переходам.
  Основание: `ExportController`, `ScenarioExportService`, `ReportBroadcastExportTest`.

### Карты

- `Реализовано` Map editor с canvas-инструментами, слоями, undo/redo, zoom, ресурсной панелью и asset-set фильтрацией.
  Основание: `MapEditor.tsx`, `MapStoreRequest`, `MapUpdateRequest`, `CoreCrudTest`.
- `Реализовано` Map Asset Layers v1 и Map Layers UX Stabilization v2: `data.layers`, совместимый `data.objects`, visibility/lock/opacity/reorder, ресурсы по типу слоя.
  Основание: `MapEditor.tsx`, `web/src/lib/mappers.ts`.
- `Реализовано` Asset Sets Integration into Map Layers v1: слои карт учитывают подключенные наборы ассетов и fallback на все подходящие ассеты.
  Основание: `MapEditor.tsx`, `AssetCollectionTargetPicker.tsx`.

### Ассеты и наборы

- `Реализовано` Assets module v1: загрузка, хранение, фильтрация, редактирование и удаление ассетов.
  Основание: `AssetController`, `AssetService`, `AssetModuleTest`, `AssetsEditor.tsx`.
- `Реализовано` Asset Folders vs Asset Sets Domain Split v1: папки отвечают за расположение файла, наборы остаются переиспользуемыми пакетами.
  Основание: `AssetFolderController`, `AssetCollectionController`, `AssetService`, `AssetsEditor.tsx`.
- `Реализовано` Asset Sets UX v2 и Asset Sets Explorer UX Alignment v1: режимы `Файлы`/`Наборы`, double click, inline rename, context menu и drag/drop membership.
  Основание: `AssetsEditor.tsx`, `AssetModuleTest`.
- `Реализовано` Asset Taxonomy + Collections v1 и Asset Collection Integration v1: `type`, `kind`, `asset_collections`, `asset_collection_items`, `asset_collection_targets`.
  Основание: `AssetCollectionService`, `AssetCollectionTargetService`, `AssetModuleTest`, `SchemaBaselineTest`.

### Персонажи, предметы и группы

- `Реализовано` Character/Item Groups v1: карточка принадлежит максимум одной группе, удаление группы не удаляет карточки.
  Основание: `CharacterGroupController`, `ItemGroupController`, `CharacterItemGroupTest`.
- `Реализовано` Inherited Asset Sets: группы персонажей/предметов подключают наборы ассетов, карточки наследуют пул, direct asset override остается приоритетным.
  Основание: `AssetCollectionTargetService`, `CharactersEditor.tsx`, `ItemsEditor.tsx`, `CharacterItemGroupTest`.
- `Реализовано` Asset Usage Picker: portrait/token/item image выбираются из подходящих ассетов и наследованных наборов.
  Основание: `AssetUsagePicker.tsx`, `CharactersEditor.tsx`, `ItemsEditor.tsx`.

### Атлас и хроники

- `Реализовано` Atlas Revival + Domain Rename v1: раздел `Мир` возвращен как `Атлас`; `locations`, `factions`, `events` отображаются как `Места`, `Организации`, `Хроника`.
  Основание: `Sidebar.tsx`, `WorldEditor.tsx`.
- `Реализовано` Atlas Typed Links UX v1: связи Атласа редактируются typed-полями, generic `EntityLinksPanel` остается для других материалов.
  Основание: `WorldEditor.tsx`, `EntityLinksPanel.tsx`.
- `Реализовано` Atlas Chronicle-Centered Model v1: `Хроника` - событийный слой, `Места` - контейнер карт, `Организации` - контейнер участников.
  Основание: `WorldEditor.tsx`.
- `Реализовано` Atlas Chronicles Timeline v1: `chronicles` стали отдельными временными линиями, `events` стали событиями точки/диапазона через `position/end_position`.
  Основание: `2026_06_12_000001_add_chronicles_timeline.php`, `ChronicleController`, `WorldEventController`, `WorldModuleTest`.
- `Реализовано` Chronicle Editor UX v1 + Event Campaign Cleanup: открытая хроника вынесена в отдельный экран, кампания редактируется на уровне хроники, `events.campaign_id` оставлен legacy-only.
  Основание: `WorldEditor.tsx`, `ChronicleEditor.tsx`, `WorldModuleTest`.
- `Реализовано` Chronicle Timeline Editor Stabilization v1: timeline canvas, ticks, lanes, drag/drop событий, minimap, zoom/fit.
  Основание: `ChronicleEditor.tsx`, `EditorViewportControls.tsx`.

### Публикация, жалобы, объявления и PDF

- `Реализовано` Publications module v1: backend/API публикаций и visibility/status workflow.
  Основание: `PublicationController`, `PublicationService`, `PublicationModuleTest`.
- `Реализовано` Reports и admin broadcasts.
  Основание: `ReportController`, `BroadcastController`, `AdminBroadcastsController`, `ReportBroadcastExportTest`.
- `Реализовано` Scenario PDF export.
  Основание: `ExportController`, `ScenarioExportService`, `GenerateScenarioPdfAction`, `ReportBroadcastExportTest`.

### Общие Editor-Компоненты

- `Реализовано` Shared Editor Viewport Controls v1: общий `EditorViewportControls` для minimap, viewport rectangle, zoom in/out, fit view и minimap navigation.
  Основание: `EditorViewportControls.tsx`, `GraphCanvas.tsx`, `ChronicleEditor.tsx`.
- `Реализовано` Map Viewport Controls v1: редактор карт использует общий `EditorViewportControls` для minimap, zoom in/out, fit view и навигации по minimap.
  Основание: `EditorViewportControls.tsx`, `MapEditor.tsx`.
- `Реализовано` Shared Editor Toolbar v1: общий `EditorToolbar` извлечен из карты и подключен обратно к карте.
  Основание: `EditorToolbar.tsx`, `MapEditor.tsx`.
- `Реализовано` Chronicle Toolbar Alignment v1 и Chronicle Toolbar Utility Delete v1.
  Основание: `ChronicleEditor.tsx`, `createEditorToolbarUtilityGroup`.
- `Реализовано` Scenario Toolbar Alignment v1.
  Основание: `GraphCanvas.tsx`, `EditorToolbar.tsx`.
- `Реализовано` Editor Toolbar Utility Group v1: общий helper для delete/position utility actions.
  Основание: `EditorToolbar.tsx`, `MapEditor.tsx`, `ChronicleEditor.tsx`.

## Реализовано частично

- `Реализовано частично` Collaboration/comments: таблицы `campaign_members` и `comments` есть, но полноценные модели, controllers, routes и UI еще не реализованы.
  Основание: `0002_01_01_000003_create_collaboration_publication_export_tables.php`; отсутствие `Comment` и `CampaignMember` в `api/app/Models`.
- `Реализовано частично` Export jobs, notifications и idempotency: таблицы есть, но feature-flow, queue UI и middleware не завершены.
  Основание: `export_jobs`, `notifications`, `idempotency_keys` в migration и `SchemaBaselineTest`.
- `Реализовано частично` Social/community: UI-заготовки существуют, но sidebar/routes их не подключают, backend social schema намеренно отсутствует.
  Основание: `CommunityView.tsx`, `FriendsView.tsx`, `MessagesView.tsx`, `Sidebar.tsx`, `App.tsx`, `SchemaBaselineTest::test_social_layer_tables_are_deferred`.
- `Реализовано частично` Общий editor shell: есть `EditorToolbar` и `EditorViewportControls`, но общего shell для header/sidebar/canvas/inspector еще нет.
  Основание: отдельные реализации `MapEditor.tsx`, `GraphCanvas.tsx`, `ChronicleEditor.tsx`.

## Активный фокус

- `В работе` Editor Shell v1: выделить общий каркас редакторов - верхняя шапка, toolbar-зона, центральный canvas, overlay viewport controls и optional right panel.
- `В работе` Scenario Toolbar Follow-up v1: решить, какие scenario actions остаются в header (`Preview`, `Validation`, `Reload`, `Settings`), а какие можно перенести в toolbar/utility groups.
- `В работе` Shared Viewport Hook v1: вынести pan/zoom/fit math в `useEditorViewport`, если дублирование между картами, сценариями и хрониками стабилизируется.
- `В работе` Постепенно разделять крупные редакторы на feature-модули без изменения backend/API.

## Запланировано

### Editor Platform

- `Запланировано` Editor Toolbar Positioning v1: единая модель смены положения toolbar для map/chronicle/scenario editors.
- `Запланировано` Разделить `GraphCanvas.tsx` на canvas layers/hooks и вынести graph orchestration из `ScenarioEditor.tsx`.
- `Запланировано` Разгрузить `App.tsx`: вынести navigation wiring/return context в отдельный shell/router слой.
- `Запланировано` Добавить e2e smoke-тесты для ключевых пользовательских сценариев.

### Graph vNext

- `Запланировано` Backend/publish/export-blocking проверки невозможных переходов, если они нужны по продуктовой логике.
- `Запланировано` Full obstacle router/grid routing вместо best-effort candidate routing.
- `Запланировано` Persisted auto-route points, если понадобится стабильная ручная правка после auto-layout.
- `Запланировано` Manual edge anchors и сохранение выбранных port sides.
- `Запланировано` Edge waypoints UX v2: отдельный режим редактирования маршрута, context actions для точек.
- `Запланировано` Canvas hotkeys v2: copy/paste, duplicate, box-select, multi-select.
- `Запланировано` Undo/Redo v2: создание/удаление узлов, entity links и scenario settings.
- `Запланировано` Advanced visual polish: label collision handling, arrow placement, hover hints.

### Map vNext

- `Запланировано` Экспорт карт.
- `Запланировано` Tile Metadata / Autotile Rules v1: технические метки tile-ассетов и правила автоподбора, не смешанные с пользовательскими тегами.
- `Запланировано` Более глубокая работа с asset layers/tokens после стабилизации общего editor shell.

### Atlas vNext

- `Запланировано` Atlas Nested Arcs / Calendar Systems v2: вложенные арки хроники и календарные системы.
- `Запланировано` Drag-to-position / resize ranges на timeline как отдельный UX-слой.
- `Запланировано` Более точные relation-типы Атласа вместо общего `relationType='related'`.
- `Запланировано` Основные/приоритетные связи: основное место, основная организация, главный сценарий события.
- `Запланировано` Более глубокая интеграция хроник с кампаниями.

### Publication и Collaboration vNext

- `Запланировано` Public Tags / Publication Metadata v1: отдельные публичные хэштеги, whitelist metadata и запрет утечки приватных `taggables`.
- `Запланировано` Comments API/UI.
- `Запланировано` Campaign members и права совместной работы.
- `Запланировано` Notifications API и frontend-индикаторы.
- `Запланировано` Idempotency middleware для критичных POST/PATCH операций.
- `Запланировано` Export jobs: очередь экспортов и история результатов.
- `Запланировано` Экспорт карточек персонажей/предметов.

## Отложено

- `Отложено` Полноценное social/community ядро: communities, friends, dialogs, messages.
- `Отложено` Community redesign: кружки интересов, роли, участники и связь публикаций с community-контекстом.
- `Отложено` Realtime collaboration.
- `Отложено` Полноценный VTT/боевой runtime.
- `Отложено` Мобильные приложения.
- `Отложено` Платные подписки и монетизация.
- `Отложено` Генерация сценариев через AI.
- `Отложено` Object storage/S3 для ассетов.
- `Отложено` Импорт чужих asset sets/community sets.
- `Отложено` Mobile-first редакторы.

## Устарело и удаляется из roadmap

- `Устарело` `Graph Edge Ports v1` с правилом `input = left/top`, `output = right/bottom`.
  Заменено free-side выбором сторон в `GraphCanvas.tsx::choosePortSides`.
- `Устарело` Утверждение, что раздел `Мир` скрыт.
  Раздел возвращен в sidebar как `Атлас`.
- `Устарело` Формулировка про Docker frontend на `Node 24`.
  Фактически используются `web/Dockerfile` и `web/Dockerfile.prod` на `node:22-alpine`.
- `Устарело` Формулировка про полностью чистый baseline без `add_*`/compatibility migrations.
  В проекте есть compatibility migrations `2026_05_07_*`, `2026_05_08_*`, `2026_06_12_*`.
- `Устарело` Старый фокус “publication/comments/asset layers” как ближайший общий фокус.
  Текущий фокус: editor componentization, Chronicle/Atlas polish и стабилизация общих editor-компонентов.
- `Отменено` Legacy frontend-редактор глав/блоков сценария.
  Сценарный UX стал graph-first.

## Проверки перед закрытием задач

Backend:

```bash
cd api
php artisan test
```

Frontend:

```bash
cd web
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Docker/dev DB reset:

```bash
docker compose exec -T api php artisan migrate:fresh --seed
```

Production sanity:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
curl -I https://mystoryforge.ru
```
