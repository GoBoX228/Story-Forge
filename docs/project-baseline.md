# Project Baseline

## Latest Update

- Character/Item Groups v1 + Inherited Asset Sets is implemented: character and item cards can belong to one group, groups can own asset-set assignments, card pickers inherit those pools, and direct single-asset overrides remain supported.
- Standalone World UI is temporarily hidden from the sidebar and quick navigation. Backend/API/data for `locations`, `factions` and `events` remain available for existing links and future Atlas/World redesign.
- Asset Sets Explorer UX Alignment v1 is implemented: reusable asset sets now follow the same explorer-style interaction model as folders, with double click open, inline rename, context menus and drag/drop membership management instead of persistent card action buttons.
- Asset Sets UX v2 is implemented: the Assets section separates the file explorer from reusable asset sets, supports default set creation, inline rename, description editing, set composition management, adding selected assets to sets and drag/drop onto set cards without moving assets between folders.
- Map Layers UX Stabilization v2 is implemented: the map editor resource panel now presents layers as a simplified Photoshop-like list, keeps selected-layer properties in a compact block, hides irrelevant tile/token/background controls by active layer type, and preserves asset collection filtering.
- Asset Collection Integration v1 + Asset Sets Integration into Map Layers v1 are implemented: asset collections are reusable asset sets that can be attached to maps, characters and items; map layer palettes filter by connected sets, expose connected set counts for the active layer, show asset source set labels, and fall back to all matching asset kinds when no sets are connected.
- Asset Folders vs Asset Sets Domain Split v1 is implemented: assets now use separate single-location `asset_folders` for library organization, while `asset_collections` remain multi-asset sets for material usage and future sharing.
- Map Asset Layers v1 is implemented: maps now use `map.data.layers` for background/tile/token layers, keep flattened `map.data.objects` as a compatibility mirror, support visibility, lock, opacity, rename/reorder controls, background opacity and token width/height/rotation/opacity. Old maps with only `data.objects` are converted into runtime layers on read and are saved in the new format on the next map update.

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
- Assets module v1 + Asset Integration v1 + Asset Taxonomy/Collections v1 + Asset Collection Integration v1 + Asset Sets UX v2 + Character/Item Groups v1: загрузка, реестр, фильтрация, preview, редактирование и удаление файлов через public storage; ассеты имеют media `type` (`image/document/other`), semantic `kind` (`tile/token/portrait/background/item_image/handout/document/icon/other`), находятся в одной папке или прямо в библиотеке без папки, могут входить в несколько наборов ассетов, а сами ассеты назначаются материалам через role-based `entity_links.metadata`. Наборы ограничивают доступный пул ассетов на уровне карты, группы персонажей или группы предметов; карточка персонажа/предмета может хранить прямой выбор конкретного ассета как manual override; при отсутствии подключенных наборов доступны все подходящие ассеты нужного `kind`.
- World module v1 backend/API для локаций, фракций и событий с ownership scope. Standalone UI временно скрыт из sidebar до полноценного Atlas/World UX; данные остаются доступны для существующих связей.
- Tags module v1: приватные пользовательские теги, `taggables` assignment и фильтры по тегам для сценариев, карт, персонажей, предметов, ассетов и world-сущностей. Эти теги не должны автоматически публиковаться или попадать в export/community payload.
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
- Связи между сущностями: `entity_links` используется и для graph-node связей с картами/персонажами/предметами/ассетами/локациями/фракциями/событиями, и как универсальный directed layer между основными материалами. UI показывает блок "Связанные материалы", поддерживает relation-типы, label, удаление и quick open для активных редакторов; quick open для world-сущностей временно отключен вместе со standalone World UI.
- Социальные разделы: сообщества, друзья и сообщения временно скрыты из интерфейса; backend-моделей и API для них нет.
- Приватность и публикации: реализован базовый backend workflow публикаций материалов через `published_contents`, но publication/community UI временно скрыт до переработки социальной модели.
- Public tags для публикаций не реализованы: текущие `tags/taggables` являются личными library tags пользователя и не должны автоматически утекать в публикации, community feed или PDF export.
- Экспорт: реализован PDF сценария для graph-модели, но нет экспорта карт, карточек персонажей/предметов и очереди экспортов.
- Комментарии, export jobs, notifications и idempotency keys подготовлены как schema-only baseline.

## Не реализовано

- Следующие graph UX-задачи: publish/export enforcement и более полный graph layout/router.
- Backend/publish/export-blocking валидация невозможных переходов поверх frontend-only graph warnings.
- Tile Metadata / Autotile Rules v1 не реализован: специальные технические метки тайлов вроде `wall_top_left`, `wall_top_right`, `wall_vertical`, `floor`, `door`, `water_edge` и правила автоподбора тайлов оставлены как отдельный будущий слой. Текущий Tags module v1 остается пользовательским tagging/search-слоем и не должен смешиваться с autotile-метаданными.
- Comments/collaboration/invitations.
- Advanced publications/community features beyond v1 feed: public hashtags/publication tags, comments, reactions, moderation workflow and public anonymous pages.
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

`assets`, `asset_folders`, `asset_collections`, `asset_collection_items` и `asset_collection_targets` уже используются Assets module v1, Asset Integration v1, Asset Taxonomy + Collections v1, Asset Collection Integration v1, Asset Sets Integration into Map Layers v1, Asset Folders vs Asset Sets Domain Split v1 и Asset Sets UX v2: файлы сохраняются в Laravel `public` disk, записи привязаны к владельцу, имеют media `type` и semantic `kind`, находятся в одной папке или прямо в библиотеке без папки. Наборы ассетов управляются в отдельном режиме библиотеки, имеют описание, inline rename и состав, могут наполняться выделенными ассетами или drag/drop без изменения `asset_folder_id`. Наборы ассетов можно подключать к картам, персонажам и предметам; подключенные наборы фильтруют фон/тайлы/токены карты, portrait/token персонажа и item image предмета. В карте активный слой показывает контекст подключенных наборов и source labels у ассетов в палитрах; при отсутствии наборов остается fallback на все подходящие ассеты нужного `kind`. Campaign binding для assets удален из публичного UI/API. Персонажи используют роли `portrait`/`token`, предметы `item_image`, карты `map_background`/`map_token`; map canvas хранит выбранный фон и token objects в `map.data`.

`character_groups` и `item_groups` используются Character/Item Groups v1: карточка персонажа или предмета может принадлежать максимум одной группе, группы имеют собственные `asset_collection_targets`, а pickers наследуют пул наборов группы. Прямые role-based asset overrides на карточке сохраняются и имеют приоритет над наследованным пулом.

`locations`, `factions` и `events` уже поддерживаются World module v1 на backend/API уровне: записи привязаны к владельцу и опционально к кампании. Standalone World UI временно скрыт из интерфейса; возвращение раздела планируется как отдельный Atlas/World UX v2 после уточнения домена локаций, фракций, событий и их связей с картами/персонажами/сценариями.

`tags` и `taggables` уже используются Tags module v1: теги пользовательские и приватные, assignment поддерживает `scenario`, `map`, `character`, `item`, `asset`, `location`, `faction`, `event`. Они предназначены для личной организации библиотеки и фильтрации, а не для публичных хэштегов. Publication/community слой должен использовать отдельную модель публичных тегов и явный whitelist экспортируемых metadata. Legacy `campaigns.tags` остается отдельным JSON-полем кампаний.

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
