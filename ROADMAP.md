# Story Forge Roadmap

Рабочая дорожная карта проекта. Этот файл фиксирует фактически выполненные шаги и ближайшие задачи разработки. README и `docs/project-baseline.md` остаются справочными документами, а этот файл используется как оперативный трекер.

## Текущий baseline

- Frontend: Next.js 16.2.4, React 19.2, TypeScript, Tailwind CSS.
- Backend: Laravel 12, PHP 8.2+, PostgreSQL, Laravel Sanctum.
- Инфраструктура: Docker Compose, PostgreSQL 16, Mailpit.
- База данных пересобирается через чистый baseline миграций и `migrate:fresh`.
- Backend legacy-сценарии `scenarios -> chapters -> blocks` удалены; сценарный модуль работает graph-first.
- Frontend сценарного редактора переведен в graph-first режим без legacy-вкладки глав/блоков.

## Выполнено

- [x] Проведен технический аудит проекта и дополнительных материалов.
- [x] Обновлен frontend stack до Next.js 16 / React 19.
- [x] Добавлен ESLint Flat Config и заменен `next lint` на прямой ESLint CLI.
- [x] Обновлены Docker-настройки frontend под Node 24 и `.next`.
- [x] Пересобрана схема БД в чистый baseline миграций.
- [x] Удалены исторические `add_*`, `fix_*`, `migrate_*` и data-fix миграции.
- [x] Добавлены baseline-таблицы для graph, world, assets, publications, exports, notifications и idempotency.
- [x] Добавлен backend Graph Scenario API v1 для `scenario_nodes` и `scenario_transitions`.
- [x] Добавлены backend-тесты для graph API и baseline-схемы.
- [x] Выполнен `migrate:fresh --seed` в Docker PostgreSQL dev-базе.
- [x] Frontend `ScenarioEditor` разделен на локальные компоненты сценарного модуля.
- [x] Добавлен graph-first сценарный editor с CRUD UI для узлов и переходов.
- [x] Добавлен `web/src/lib/scenarioApi.ts` для graph API и PDF export.
- [x] Добавлены frontend-типы и мапперы для graph API.
- [x] Добавлены demo graph seed-данные для существующих сценариев.
- [x] README и `docs/project-baseline.md` синхронизированы после Graph API/UI v1.
- [x] Зафиксирован typed graph contract v2 для типов узлов, переходов, `config` и `condition`.
- [x] Добавлен Typed Node Editors v1: config graph-узлов редактируется через доменные поля по типам узлов.
- [x] Добавлен Graph Entity Links v1 для связей graph-узлов с картами, персонажами и предметами.
- [x] Добавлен Graph Canvas v1: визуальные узлы, SVG-переходы и drag-position через `position`.
- [x] Добавлен Graph Canvas Navigation v2: pan, wheel zoom, кнопки масштаба и fit-to-view без изменений backend/API.
- [x] Добавлен Graph Edge Editing v1: создание `linear` transition drag-to-connect от handle узла к другому узлу.
- [x] Добавлен Graph Edge Editing v2: выбор transition на canvas, quick edit `type`/`label` и удаление перехода.
- [x] Добавлен Graph Canvas Readability v1: edge anchors по границам узлов, side handles, label background и semantic node type styling.
- [x] Добавлен Graph Canvas Node Presentation v2: resizable nodes через `position.width/height`, content preview, selected-only compact handles и уменьшенные arrowheads.
- [x] Добавлен Graph Canvas Auto Layout v1: ручная команда упорядочивания узлов по уровням переходов с сохранением `position`.
- [x] Добавлен Graph Auto Layout v2: layout учитывает размеры карточек, ветвления, типы переходов и best-effort уменьшение пересечений.
- [x] Добавлен Scenario Play/Preview Mode v1: read-only прохождение graph-сценария по узлам и переходам.
- [x] Добавлен Scenario Preview UX v2 / Play Mode v2: preview стал полноценным read-only play mode с typed-блоками, outcomes, маршрутом и связанными материалами.
- [x] Добавлен Graph Canvas Minimap v1: обзор узлов, viewport frame и click/drag навигация по canvas.
- [x] Добавлен Graph Canvas Navigation Panel v2: minimap и controls вынесены в единый UI overlay, auto-layout получил направления слева направо и сверху вниз.
- [x] Переработан Graph Workspace Layout v2: canvas стал основной областью, список узлов и inspector вынесены в overlay, параметры сценария открываются в modal.
- [x] Добавлены Quick Links From Graph Nodes v1/v2: переходы из связанного узла к связанным материалам с возвратом к сценарию.
- [x] Добавлен Graph Canvas Edge Labels v1: inline-редактирование label перехода прямо на canvas.
- [x] Добавлен Graph Edge Routing v1: вычисляемые direct routes для переходов без изменений backend/API.
- [x] Добавлен Graph Edge Ports v1: separated input/output ports для входящих и исходящих переходов.
- [x] Добавлен Graph Canvas Selection UX v1: clear selection, Escape/Delete/Backspace shortcuts и удаление выбранных node/transition с canvas.
- [x] Добавлен Graph Canvas Undo/Redo v1: frontend-only history для move/resize/layout и transition create/update/delete.
- [x] Добавлен Graph Rules / Validation v1: frontend-only предупреждения по структуре graph-сценария без блокировки сохранения.
- [x] Добавлен Graph Validation v2: frontend-only preflight с errors/warnings, typed-field warnings и проверками check-outcomes.
- [x] Добавлен Export Graph Scenario v1: PDF export использует graph-узлы/переходы как runbook.
- [x] Graph Scenario MVP smoke пройден: graph editor, preview/play mode, validation и PDF export проверены вручную.
- [x] Добавлен Assets module v1: загрузка, хранение, фильтрация, редактирование и удаление ассетов через public disk.
- [x] Добавлен Asset Integration v1: ассеты назначаются как портреты/токены персонажей, изображения предметов, фон карты и token palette карты через `entity_links.metadata.role`.
- [x] Добавлен World module v1: CRUD/API/UI для локаций, фракций и событий с фильтрацией по кампании.
- [x] Добавлен Tags module v1: пользовательские теги, polymorphic assignment и фильтры в основных редакторах.
- [x] Добавлен Universal Entity Links v2: `entity_links` стали общим слоем связей между сценариями, картами, персонажами, предметами, ассетами и world-сущностями.
- [x] Добавлен Graph Node Links Upgrade v2: graph-узлы теперь связываются с картами, персонажами, предметами, ассетами, локациями, фракциями и событиями.
- [x] Выполнен Scenario Frontend Legacy Deprecation + Refactor v1: frontend legacy-редактор глав/блоков удален, сценарный UX стал graph-first.
- [x] Выполнен Project Cleanup Audit + Safe Cleanup v1: актуальные документы синхронизированы с graph-only baseline, сгенерированный tsbuildinfo удален, frontend lint warnings закрыты.

## Ближайший фокус

Следующий крупный фокус: публикационный workflow, comments/collaboration либо более глубокая работа с asset layers/tokens.

## Фокус до MVP сценарного редактора

Эти пять задач считаются основным треком. Мелкая полировка canvas вынесена ниже в отдельный backlog и не должна перебивать этот список без явного решения.

1. [x] Graph Auto Layout v2: улучшить ручное упорядочивание графа с учетом размеров узлов, ветвлений, типов переходов и уменьшения пересечений.
2. [x] Typed Node Editors v1: заменить технические/JSON-поля основными typed forms для `description`, `dialog`, `location`, `check`, `loot`, `combat`.
3. [x] Scenario Play/Preview Mode v1: добавить режим прохождения graph-сценария по узлам и переходам без изменения редакторского canvas.
3.1. [x] Scenario Preview UX v2 / Play Mode v2: усилить preview до полноценного read-only play mode.
4. [x] Graph Validation v2: усилить проверки сценария до publish/export-ready уровня, не ломая текущую frontend-only validation v1.
5. [x] Export Graph Scenario v1: научить экспорт учитывать graph-структуру узлов/переходов.
6. [x] Graph Scenario MVP smoke: вручную проверить полный путь graph editor -> preview -> validation -> PDF export.

### 1. Стабилизировать Graph UI

- [x] Вручную пройти сценарий создания/редактирования/удаления узлов и переходов в браузере.
- [x] Проверить, что graph state корректно перезагружается после повторного входа в сценарий.
- [x] Вручную проверить Graph Canvas v1: выбор узла, drag-position, сохранение позиции после reload.
- [x] Проверить Graph Canvas Navigation v2: pan, wheel zoom, zoom controls, fit-to-view и drag узлов при масштабе.
- [x] Проверить Graph Edge Editing v1: drag от handle, drop на пустое место, drop на узел, создание перехода при zoom/pan.
- [x] Проверить Graph Edge Editing v2: выбор линии, quick edit, удаление transition и отсутствие конфликтов с pan/drag.
- [x] Проверить Graph Canvas Readability v1: направление стрелок, handles со всех сторон, labels и различимость типов узлов.
- [x] Проверить Graph Canvas Node Presentation v2: resize узлов, content preview, selected-only handles и уменьшенные arrowheads.
- [x] Проверить Graph Canvas Auto Layout v1: упорядочивание, сохранение позиций после reload и совместимость с resize/content preview.
- [x] Проверить Graph Canvas Minimap v1: отображение узлов, viewport frame, click/drag навигацию и обновление после pan/zoom/auto-layout.
- [x] Проверить Graph Canvas Navigation Panel v2: minimap справа сверху, controls под ним и оба направления auto-layout.
- [x] Проверить Graph Canvas Edge Labels v1: inline-редактирование label, сохранение по Enter/blur и отмена по Escape.
- [x] Проверить Graph Edge Routing v1: direct routes, labels/quick panel на routed path, parallel/reverse transitions и совместимость с pan/zoom/resize/drag-to-connect.
- [x] Проверить Graph Edge Ports v1: входящие переходы приходят в left/top, исходящие выходят из right/bottom, plus-handles доступны только справа и снизу.
- [x] Проверить Graph Canvas Selection UX v1: Escape/empty click clear selection, Delete/Backspace удаляют выбранный transition или node без конфликтов с input/textarea.
- [x] Проверить Graph Canvas Undo/Redo v1: Ctrl/Cmd+Z, Ctrl+Y/Cmd+Shift+Z и toolbar UNDO/REDO для позиций, layout и transitions.
- [x] Проверить Graph Rules / Validation v1: счетчик warnings, вкладку проверки, выбор issue и подсветку проблемных узлов/переходов.
- [x] Проверить Graph Validation v2: счетчики errors/warnings, группировку issues, canvas-подсветку и выбор проблемного узла/перехода.
- [x] Проверить Graph Scenario MVP end-to-end: demo seed, graph editor, preview/play mode, validation и graph-aware PDF export.
- [x] Удалить legacy-вкладку глав и блоков из frontend после перехода на graph-first UX.
- [x] Убрать постоянные боковые панели graph-вкладки, чтобы не сжимать canvas.
- [x] Добавить более явные UI-состояния ошибок для graph операций.
- [x] Уточнить UX для JSON-полей `config` и `condition`.
- [x] Проверить typed graph API smoke после `migrate:fresh --seed`: demo login, graph reload, typed node config, typed transitions, invalid `dc = 422`.

### 2. Привести demo seed к текущей модели

- [x] Добавить seed-данные для `scenario_nodes` и `scenario_transitions`.
- [x] Связать demo graph nodes с существующими demo-сценариями.
- [x] Удалить legacy chapters/blocks из seed после перехода на graph-first baseline.
- [x] Проверить сидирование после `migrate:fresh --seed`.

### 3. Доработать graph domain model

- [x] Зафиксировать список типов узлов и их обязательные/опциональные поля.
- [x] Зафиксировать структуру `config` по типам узлов.
- [x] Зафиксировать структуру `condition` для переходов.
- [x] Добавить валидацию graph payload глубже, чем текущая проверка JSON object.
- [x] Добавить frontend-only проверки graph-структуры и предупреждения по потенциально проблемным переходам.
- [ ] Добавить backend/publish/export-blocking проверки невозможных переходов, если они нужны по продуктовой логике.

### 4. Интегрировать graph с остальными сущностями

- [x] Связать узлы сценария с картами, персонажами, предметами, ассетами и world-сущностями.
- [x] Использовать `entity_links` для связей graph-узлов с материалами.
- [x] Добавить UI просмотра связанных сущностей внутри узла.
- [x] Добавить быстрые переходы из узла к связанным материалам.

## Следующие крупные задачи

- [x] Assets module v1: загрузка и реестр файлов/изображений/токенов.
- [x] Asset Integration v1: подключить ассеты к персонажам, предметам и картам.
- [x] World module v1: locations, factions, events.
- [x] Tags module v1: общие теги и polymorphic assignment.
- [x] Universal Entity Links v2: общий API/UI связей между материалами.
- [x] Publications module v1: backend/API публикаций и visibility/status workflow; frontend publication/community UI временно скрыт до переработки social layer.
- [ ] Comments/collaboration: комментарии и участники кампаний.
- [ ] Notifications API и frontend-индикаторы.
- [ ] Idempotency middleware для критичных POST/PATCH операций.
- [ ] Export jobs: очередь экспортов и история результатов.
- [ ] Экспорт карт и карточек персонажей/предметов.

## Отложенная мелкая полировка graph canvas

Эти задачи полезны, но не входят в основной фокус до MVP сценарного редактора.

- [ ] Full obstacle router/grid routing вместо текущего best-effort candidate routing.
- [ ] Persisted auto-route points для вычисленных маршрутов, если понадобится стабильная ручная правка после auto-layout.
- [ ] Manual edge anchors / сохранение выбранных port sides.
- [ ] Edge waypoints UX v2: отдельный режим редактирования маршрута, удаление/добавление точек через context actions.
- [ ] Inline edge type editing на canvas без quick panel.
- [ ] Minimap v2: transitions/viewport polish, если графы станут крупнее.
- [ ] Canvas hotkeys v2: copy/paste, duplicate, box-select, multi-select.
- [ ] Undo/Redo v2: покрыть создание/удаление узлов, entity links и scenario settings.
- [ ] Advanced visual polish: edge label collision handling, better arrow placement, hover hints.

## Технический долг

- [x] Обновить `docs/project-baseline.md` после Graph API и Graph UI v1, чтобы он не описывал graph как полностью отсутствующий.
- [x] Синхронизировать README с фактическим состоянием после последних задач.
- [ ] Уменьшить роль `App.tsx` как глобального переключателя `activeView`.
- [ ] Постепенно разделить крупные frontend-редакторы на feature-модули.
- [ ] Разделить крупный `GraphCanvas.tsx` на canvas layers/hooks и вынести graph orchestration из `ScenarioEditor.tsx` в более мелкие модули.
- [ ] Разгрузить `App.tsx`: вынести navigation wiring/return context в отдельный shell/router слой.
- [ ] Улучшить auth-модель: уйти от access token в `localStorage` к cookie-first Sanctum SPA flow.
- [x] Убрать старые lint warnings в `App.tsx`, `MapEditor.tsx`, `ProfileEditor.tsx`, `layout.tsx`.
- [ ] Добавить e2e smoke-тесты для ключевых пользовательских сценариев.

## Отложено намеренно

- [ ] Social backend: communities, friends, dialogs, messages.
- [ ] Community redesign: кружки интересов, роли, участники и связь публикаций с community-контекстом.
- [ ] Realtime collaboration.
- [ ] Полноценный VTT/боевой режим.
- [ ] Мобильные приложения.
- [ ] Платные подписки и монетизация.
- [ ] Генерация сценариев через AI.

## Проверки перед закрытием крупных задач

Backend:

```bash
cd api
php artisan test
```

Frontend:

```bash
cd web
npm run typecheck
npm run lint
npm run build
```

Docker/dev DB reset:

```bash
docker compose exec -T api php artisan migrate:fresh --seed
```
## Graph Visual Metadata Contract v1

- [x] `scenario_transitions.metadata` добавлен в baseline-схему и API как отдельное место для visual data.
- [x] `condition` остается gameplay-контрактом перехода; `_visual` и другие чужие ключи в `condition` отклоняются.
- [x] Поддержана форма `metadata.visual.waypoints[]` для manual edge waypoints.

## Graph Canvas Manual Waypoints v1

- [x] Добавлено построение перехода через `metadata.visual.waypoints`.
- [x] Добавлено создание waypoint по double click на edge, drag waypoint, удаление waypoint и сброс маршрута.
- [x] Quick edit и inline label edit сохраняют visual metadata перехода.

## Graph Canvas Waypoint Smoothing v1

- [x] Manual waypoint routes рендерятся сглаженными cubic Bezier-кривыми вместо ломаных polyline.
- [x] Сохраненные `metadata.visual.waypoints` не меняют форму; сглаживание влияет только на SVG path.

## Graph Canvas Obstacle-Aware Routing v1

- [x] Auto-routes без manual waypoints строятся через best-effort candidate routing вокруг карточек промежуточных узлов.
- [x] Manual `metadata.visual.waypoints` остаются приоритетным маршрутом и не перезаписываются computed route.
- [x] Computed route не сохраняется в backend и не смешивается с gameplay `condition`.
