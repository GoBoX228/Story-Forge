# Кузница историй Roadmap

## Назначение документа

`ROADMAP.md` фиксирует подтвержденный baseline, незавершенные направления и ближайший технический фокус. README и `docs/project-baseline.md` остаются справочными документами, а roadmap используется как рабочий трекер, а не как журнал всех прошлых решений.

Технические названия файлов, классов, маршрутов, библиотек и команд не переводятся. UI-термины проекта используются на русском; раздел `Атлас` и связанные термины `Места`, `Организации`, `Хроника`, `События хроники` временно скрыты из интерфейса и отложены до лучших времен.

## Легенда статусов

- `Реализовано` - функциональность есть в коде и покрыта тестами, сборкой или ручной проверкой.
- `Реализовано частично` - есть схема, API, UI-заготовка или часть workflow, но пользовательский сценарий еще не полный.
- `В работе` - актуальный ближайший фокус.
- `Запланировано` - принято к реализации позже.
- `Отложено` - намеренно не входит в ближайший MVP.

## Текущий baseline

- Frontend: Next.js 16.2.7, React 19.2, TypeScript, Tailwind CSS, ESLint Flat Config.
- Backend: Laravel 12, PHP 8.2+, PostgreSQL 16, Laravel Sanctum.
- Docker/dev: `docker-compose.yml`, PostgreSQL 16, Mailpit, frontend на `node:22-alpine`.
- Docker/prod: `docker-compose.prod.yml`, Caddy reverse proxy, Next production build, Laravel production env, внутренние сервисы без публичных портов.
- Auth: cookie-first API auth через HttpOnly refresh cookie, CSRF handshake `GET /api/auth/csrf` и `X-CSRF-TOKEN`.
- Сценарии: legacy-модель `scenarios -> chapters -> blocks` удалена из активного UX; сценарный модуль работает graph-first через `scenario_nodes` и `scenario_transitions`.
- Атлас: `Chronicle`, `WorldEvent`, `Location`, `Faction` остаются backend-терминами и спящим заделом, но раздел `Атлас` скрыт из sidebar/router/лендинга и не входит в ближайший пользовательский фокус.

Основание: `web/package.json`, `web/Dockerfile`, `web/Dockerfile.prod`, `docker-compose.yml`, `docker-compose.prod.yml`, `api/routes/api.php`, `api/database/migrations`, `web/src/components/Sidebar.tsx`, `web/src/components/app/AppViewRouter.tsx`, `web/src/hooks/useAppNavigation.ts`.

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
- `Реализовано` Campaign Workspace + Campaign Composition v2: кампании переведены с legacy-модалки на отдельную рабочую область; `scenarios.campaign_id` остается явной принадлежностью сценариев, а карты, персонажи и предметы подключаются как переиспользуемые `campaign -> uses -> material` связи через `entity_links`. Legacy `campaigns.tags/resources/progress/last_played`, `maps.campaign_id`, `characters.campaign_id` мигрируются и убираются из активного API/UI.
  Основание: `CampaignsView.tsx`, `CampaignService`, `CampaignResource`, `EntityLinkService`, `TagService`, `2026_06_18_000002_modernize_campaign_composition.php`, `CampaignTest`.
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
- `Реализовано` Map Material Inheritance v1 по модели вычисляемого наследования: карта объединяет локальные `map -> character/item` материалы с глобальным составом всех связанных через `scenario -> uses -> map` сценариев, дедуплицирует их по `character:{id}` / `item:{id}` и хранит provenance без создания производных связей в БД. Отключение одного сценария пересчитывает палитру, локальные материалы и материалы из других сценариев сохраняются.
  Основание: `web/src/lib/mapMaterials.ts`, `MapEditor.tsx`, `MapSettingsPanel.tsx`, `mapMaterials.test.ts`.
- `Реализовано` Map Card Tokens v1: персонажи и предметы эффективного контекста карты доступны в палитре токенов; персонаж использует fallback `token -> portrait -> инициалы`, предмет использует `item_image -> инициалы`. Настройки карты разделены на редактируемые связанные сценарии, локальные материалы и read-only унаследованные материалы с переходами к сценариям-источникам.
  Основание: `MapEditor.tsx`, `MapSettingsPanel.tsx`, `assetUsage.ts`, `mapMaterials.ts`.
- `Реализовано` Live Map Token Source + Snapshot v1: `MapObject` хранит `sourceType/sourceId` и snapshot `assetId/label/color`. Пока карточка существует, canvas, миниатюры и PDF используют актуальные имя и изображение; после удаления карточки размещенный токен остается, использует snapshot и помечается отсоединенным в export contract.
  Основание: `web/src/types.ts`, `web/src/lib/mapRendering.ts`, `MapThumbnail.tsx`, `MapExportService.php`, `map.blade.php`, `ReportBroadcastExportTest`.
- `Реализовано` Frontend Map Resolver Unit Tests v1: добавлен Vitest-контур для чистой доменной логики карты и покрыты несколько сценариев-источников, local+inherited merge, отключение источника, приоритет изображений и detached snapshot.
  Основание: `web/vitest.config.ts`, `web/src/lib/mapMaterials.test.ts`, `web/package.json`.

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

### Публикация, жалобы, объявления и PDF

- `Реализовано` Publications module v1: backend/API публикаций и visibility/status workflow.
  Основание: `PublicationController`, `PublicationService`, `PublicationModuleTest`.
- `Реализовано` Reports и admin broadcasts.
  Основание: `ReportController`, `BroadcastController`, `AdminBroadcastsController`, `ReportBroadcastExportTest`.
- `Реализовано` Scenario PDF export.
  Основание: `ExportController`, `ScenarioExportService`, `GenerateScenarioPdfAction`, `ReportBroadcastExportTest`.
- `Реализовано` Map PDF Export v1: отдельный PDF-экспорт одной карты из редактора карт, размеры листа A4-A0, альбомная/книжная ориентация, видимые слои и сетка.
  Основание: `ExportController`, `MapExportService`, `GenerateMapPdfAction`, `map.blade.php`, `MapEditor.tsx`, `ReportBroadcastExportTest`.
- `Реализовано` Character Cards PDF Export v1: отдельный экспорт карточек персонажей сценария для A4 3×3, двусторонней печати по длинному/короткому краю и вырезания.
  Основание: `ExportController`, `ScenarioExportService`, `GenerateCharacterCardsPdfAction`, `scenario-character-cards.blade.php`, `ScenarioSettingsPanel.tsx`, `ReportBroadcastExportTest`.
- `Реализовано` Item Cards PDF Export v1: отдельный экспорт карточек предметов сценария для A4 3×3, двусторонней печати по длинному/короткому краю и вырезания.
  Основание: `ExportController`, `ScenarioExportService`, `GenerateItemCardsPdfAction`, `scenario-item-cards.blade.php`, `ScenarioSettingsPanel.tsx`, `ReportBroadcastExportTest`.
- `Реализовано` Campaign ZIP Export v1: асинхронная сборка ZIP кампании через `export_jobs` и queue worker; архив содержит отдельные PDF сценариев, карт и карточек материалов с дедупликацией материалов по `type:id`.
  Основание: `CampaignExportService`, `GenerateCampaignZipExport`, `ExportController`, `ExportJobResource`, `docker-compose.yml`, `docker-compose.prod.yml`, `CampaignExportTest`, `ReportBroadcastExportTest`.

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
- `Реализовано` Scenario Toolbar Follow-up v1: сценарный graph editor использует одну левую `EditorToolbar`-панель для узлов, инспектора, layout, undo/redo и удаления выбранного.
  Основание: `GraphCanvas.tsx`, `ScenarioGraphWorkspace.tsx`.
- `Реализовано` Scenario Toolbar Direction Actions v1: кнопки направления layout сразу упорядочивают граф, отдельная кнопка `Упорядочить граф` удалена.
  Основание: `GraphCanvas.tsx`.
- `Реализовано` Scenario Shell Migration v1: сценарный graph editor использует `EditorShell` для toolbar, списка узлов, canvas и инспектора; панели больше не накладываются на toolbar при смене положения.
  Основание: `ScenarioGraphWorkspace.tsx`, `GraphCanvas.tsx`, `GraphInspector.tsx`, `GraphNodeList.tsx`, `EditorShell.tsx`.
- `Реализовано` GraphCanvas Layout Cleanup v1: `GraphCanvas` больше не получает toolbar-related props; undo/redo callbacks в нем используются только как keyboard shortcuts, а layout/delete вызываются через canvas ref.
  Основание: `GraphCanvas.tsx`, `ScenarioGraphWorkspace.tsx`.
- `Реализовано` GraphCanvas Canvas Utilities Extraction v1: чистая canvas-математика, bounds helpers, routing helpers, waypoint metadata helpers и visual edge builder вынесены из `GraphCanvas.tsx` в отдельный utility-модуль без изменения поведения.
  Основание: `GraphCanvas.tsx`, `graphCanvasUtils.ts`.
- `Реализовано` GraphCanvas Layers Extraction v1: SVG-переходы, quick panel перехода, карточки узлов, validation badges, handles и resize controls вынесены из `GraphCanvas.tsx` в отдельные scenario-слои без переноса state ownership.
  Основание: `GraphCanvas.tsx`, `GraphEdgesLayer.tsx`, `GraphNodesLayer.tsx`, `GraphEdgeQuickPanel.tsx`, `graphCanvasStyles.ts`.
- `Реализовано` Scenario Graph Orchestration Split v1: canvas-local state wiring, drag/resize/pan, edge creation, waypoint editing, inline labels, auto-layout orchestration и hotkeys вынесены из `GraphCanvas.tsx` в scenario-domain hook без изменения публичного поведения.
  Основание: `GraphCanvas.tsx`, `useGraphCanvasController.ts`, `graphCanvasTypes.ts`.
- `Реализовано` Editor Toolbar Utility Group v1: общий helper для delete/position utility actions.
  Основание: `EditorToolbar.tsx`, `MapEditor.tsx`, `ChronicleEditor.tsx`.
- `Реализовано` Editor Toolbar Positioning v1: карта, хроника и сценарный graph editor используют общую runtime-смену положения toolbar.
  Основание: `EditorToolbar.tsx`, `MapEditor.tsx`, `ChronicleEditor.tsx`, `GraphCanvas.tsx`, `ScenarioGraphWorkspace.tsx`.
- `Реализовано` Editor Shell v1: общий slot-based каркас для header, toolbar, canvas, error banner и optional right panel в canvas-редакторах; это базовый слой, а не финальная система layout-областей.
  Основание: `EditorShell.tsx`, `MapEditor.tsx`, `ChronicleEditor.tsx`, `ScenarioGraphWorkspace.tsx`.
- `Реализовано` Editor Shell Layout v2: `EditorShell` поддерживает `subHeader`, `leftPanel`, `rightPanel` body/shell placement и `overlayLayer`, чтобы редакторы могли размещать toolbar и панели без локальных overlay-костылей.
  Основание: `EditorShell.tsx`.
- `Реализовано` Map Shell Alignment v1: редактор карт явно использует `EditorShell` slots для header, toolbar, canvas и shell-level resource panel; четыре положения toolbar остаются эталоном поведения.
  Основание: `MapEditor.tsx`, `EditorShell.tsx`.
- `Реализовано` Chronicle Shell Alignment v1: редактор хроник использует тот же `EditorShell` sizing contract для header, toolbar и timeline canvas без page-sized layout.
  Основание: `ChronicleEditor.tsx`, `EditorShell.tsx`.
- `Реализовано` Shared Viewport Hook v1: сценарии, хроники и карты используют общий `useEditorViewport` для `viewport`, resize, pan/zoom/fit и minimap navigation.
  Основание: `useEditorViewport.ts`, `GraphCanvas.tsx`, `ChronicleEditor.tsx`, `MapEditor.tsx`.
- `Реализовано` Editor Panel System v1: `EditorShell` получил `EditorPanel` и `EditorPanelConfig` для единых left/right panel containers, placement, width, borders и scroll; сценарии и карты используют новый panel contract.
  Основание: `EditorShell.tsx`, `ScenarioGraphWorkspace.tsx`, `GraphNodeList.tsx`, `GraphInspector.tsx`, `MapEditor.tsx`.
- `Реализовано` App Shell Decomposition v1: `App.tsx` больше не владеет shell layout и route-switch; навигационное состояние вынесено в `useAppNavigation`, frame/sidebar/notifications — в `AppFrame`, view routing — в `AppViewRouter`, campaigns list — в `CampaignsView`.
  Основание: `App.tsx`, `useAppNavigation.ts`, `AppFrame.tsx`, `AppViewRouter.tsx`, `CampaignsView.tsx`, `appTypes.ts`.
- `Реализовано` App Data Loading Hook v1: состояние загружаемых материалов, assignment maps, broadcasts и `loadAllData` вынесены из `App.tsx` в `useAppDataLoading`; `App.tsx` временно продолжает получать setters для существующих CRUD/optimistic updates.
  Основание: `App.tsx`, `useAppDataLoading.ts`, `useStickyState.ts`.
- `Реализовано` App Domain Actions Hooks v1: API/CRUD handlers вынесены из `App.tsx` в `useAppDomainActions` и доменные action-блоки без изменения `AppViewActions` contract; `App.tsx` остался владельцем auth/bootstrap, frame и campaign modal state.
  Основание: `App.tsx`, `useAppDomainActions.ts`, `useAppDataLoading.ts`.
- `Реализовано` App Optimistic Updates Cleanup v1: повторяемые optimistic updates и каскадные state-transformers вынесены в чистый `appOptimisticUpdates.ts`; `useAppDomainActions` оставлен владельцем API calls, navigation и modal callbacks.
  Основание: `useAppDomainActions.ts`, `appOptimisticUpdates.ts`.
- `Реализовано` App Data Store Context v1: `AppViewData` и `AppViewActions` вынесены в `AppDataStoreContext`, а `AppViewRouter` получает data/actions через context hooks вместо props от `App.tsx`.
  Основание: `App.tsx`, `AppDataStoreContext.tsx`, `AppViewRouter.tsx`, `useAppDomainActions.ts`.
- `Реализовано` Editor Context Adoption v1: `AppViewRouter` больше не раскладывает `data/actions` по конкретным редакторам; app-bound route adapters читают `AppDataStoreContext`, а core-редакторы остаются prop-driven.
  Основание: `AppViewRouter.tsx`, `AppRouteViews.tsx`, `AppDataStoreContext.tsx`.
- `Реализовано` Entity Library Platform v1: добавлен общий frontend foundation для библиотечных рабочих областей материалов - workspace, cards, group cards, context menu, selection, navigation и declarative actions без привязки к ассетам, сценариям или другим доменам.
  Основание: `web/src/components/entityLibrary`.
- `Реализовано` Scenario Groups Backend v1: добавлены `ScenarioGroup`, `scenario_groups`, `scenarios.scenario_group_id`, CRUD API групп сценариев, owner-scoped проверки, фильтр сценариев по группе и сброс группы при удалении.
  Основание: `ScenarioGroupController`, `ScenarioGroupService`, `ScenarioGroupTest`, `2026_06_17_000001_add_scenario_groups.php`.
- `Реализовано` Scenario Groups Frontend Data v1: добавлены frontend types, mappers, API helpers, data loading/actions и context wiring для групп сценариев.
  Основание: `types.ts`, `cardGroupApi.ts`, `mappers.ts`, `useAppDataLoading.ts`, `useAppDomainActions.ts`, `AppDataStoreContext.tsx`.
- `Реализовано` Scenario Library Workspace v1: сценарии и группы перенесены из right-sidebar списка в центральную рабочую область на `EntityLibraryWorkspace`, с карточками, навигацией по группам, поиском/тегами и созданием сценариев в текущей группе.
  Основание: `ScenarioEditor.tsx`, `AppRouteViews.tsx`, `web/src/components/entityLibrary`.
- `Реализовано` Scenario Library Context Actions v1: добавлены context menu для свободной области, сценариев и групп, создание сценариев/групп, inline-переименование групп, удаление и перемещение сценариев по модели “вырезать → вставить сюда”.
  Основание: `ScenarioEditor.tsx`, `AppRouteViews.tsx`, `web/src/components/entityLibrary`.
- `Реализовано` Scenario Library Polish v1: доведены empty states, move-buffer banner, визуальное состояние `ВЫРЕЗАНО`, keyboard polish, responsive grid и clamp context menu для библиотеки сценариев.
  Основание: `ScenarioEditor.tsx`, `EntityLibraryWorkspace.tsx`, `EntityLibraryContextMenu.tsx`, `EntityLibraryGroupCard.tsx`.
- `Реализовано` Entity Library Interactions v1: общий library foundation получил multi-selection, shift-range, action targets, move-buffer, drag/drop между группами, drop-target state и keyboard handling; сценарная библиотека подключена как первый потребитель.
  Основание: `web/src/components/entityLibrary`, `ScenarioEditor.tsx`.
- `Реализовано` Map Library Workspace v1: стартовый экран раздела карт переведен с правого списка `Архив карт` на центральную `EntityLibraryWorkspace` с карточками карт, выбором, context menu, keyboard open/delete и сохранением открытого `MapEditor` без изменений.
  Основание: `MapEditor.tsx`, `web/src/components/entityLibrary`.
- `Реализовано` Character/Item Library Alignment v1: разделы персонажей и предметов переведены с правых групповых архивов на общий `EntityLibraryWorkspace` с группами, карточками, selection, context menu, move-buffer, drag/drop и keyboard actions без изменения модалок, API и доменной логики.
  Основание: `CharactersEditor.tsx`, `ItemsEditor.tsx`, `web/src/components/entityLibrary`.
- `Реализовано` Assets Library Platform Migration v1: рабочие области файлов и наборов ассетов переведены на общий `EntityLibraryWorkspace`, `EntityLibraryCard`, `EntityLibraryGroupCard`, `EntityLibraryContextMenu` и shared hooks для selection, move-buffer, drag/drop и keyboard actions; upload, folders, sets, membership, edit modal, tags, links и publication остались asset-specific.
  Основание: `AssetsEditor.tsx`, `web/src/components/entityLibrary`.

## Реализовано частично

- `Реализовано частично` Library E2E Smoke Tests v1: Playwright-инфраструктура, мокированные `/api/*` ответы и smoke-сценарии для библиотек добавлены, но полный e2e-прогон не стабилизирован из-за auth/dev-server bootstrap. До зелёного прогона продуктовый smoke выполняется вручную.
  Основание: `web/playwright.config.ts`, `web/e2e/library-smoke.spec.ts`, `web/e2e/helpers/mockApi.ts`.
- `Реализовано частично` Collaboration/comments: таблицы `campaign_members` и `comments` есть, но полноценные модели, controllers, routes и UI еще не реализованы.
  Основание: `0002_01_01_000003_create_collaboration_publication_export_tables.php`; отсутствие `Comment` и `CampaignMember` в `api/app/Models`.
- `Реализовано частично` Export jobs, notifications и idempotency: `export_jobs` уже используется Campaign ZIP Export, но общий экран истории экспортов, frontend notifications и idempotency middleware остаются незавершенными.
  Основание: `CampaignExportService`, `ExportJobResource`, `export_jobs`, `notifications`, `idempotency_keys` в migration и `SchemaBaselineTest`.

## Активный фокус

- `В работе` Продолжить декомпозицию крупных редакторов на feature-модули без изменения общих editor contracts.
- `В работе` Стабилизировать Library E2E Smoke Tests v1 и расширить smoke-контур на ключевые пользовательские сценарии редакторов.

Заметка: локальные CSS-фиксы сценарного toolbar нежелательны. Сценарии и карты должны оставаться на общем editor layout, иначе `toolbarPosition`, боковые панели и canvas sizing будут снова расходиться.

Заметка: asset-specific upload/filter/file logic не переносится в общий library foundation. Ассеты остаются источником функционального паттерна, а не готовым дизайном или доменной моделью для сценариев.

## Запланировано

### Editor Platform

- `Запланировано` Стабилизировать Library E2E Smoke Tests v1: исправить auth/dev-server bootstrap и получить зелёный воспроизводимый прогон.
- `Запланировано` После стабилизации расширить E2E smoke-контур с библиотек на ключевые пользовательские сценарии редакторов.
- `Запланировано` Editor Direct Context Migration v2 — только если редакторам потребуется прямой `AppDataStoreContext` вместо prop-driven public props.

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

- `Запланировано` Tile Metadata / Autotile Rules v1: технические метки tile-ассетов и правила автоподбора, не смешанные с пользовательскими тегами.
- `Запланировано` Advanced Token Presentation v2: форма, рамка, crop/anchor, сохранение пропорций и отдельный drag-and-drop placement UX. В v1 токены размещаются существующим brush-инструментом и растягиваются в размеры объекта.

### Publication и Collaboration vNext

- `Запланировано` Public Tags / Publication Metadata v1: отдельные публичные хэштеги, whitelist metadata и запрет утечки приватных `taggables`.
- `Запланировано` Comments API/UI.
- `Запланировано` Campaign members и права совместной работы.
- `Запланировано` Notifications API и frontend-индикаторы.
- `Запланировано` Idempotency middleware для критичных POST/PATCH операций.
- `Запланировано` Export jobs v2: общий экран истории экспортов и переиспользуемый frontend-status UI поверх уже работающего campaign ZIP pipeline.

## Отложено

- `Отложено` Атлас и хроники: раздел скрыт из пользовательского интерфейса; backend/API и компоненты оставлены как технический задел. Вложенные арки, календарные системы, timeline drag/resize, точные relation-типы и глубокая интеграция с кампаниями не входят в ближайший фокус.
  Основание: `Sidebar.tsx`, `AppViewRouter.tsx`, `useAppNavigation.ts`, `LandingPage.tsx`, `layout.tsx`, `WorldEditor.tsx`, `ChronicleEditor.tsx`.
- `Отложено` Полноценное social/community ядро: communities, friends, dialogs и messages. Существующие UI-заготовки не подключены к sidebar/routes, backend social schema намеренно отсутствует.
  Основание: `CommunityView.tsx`, `FriendsView.tsx`, `MessagesView.tsx`, `Sidebar.tsx`, `App.tsx`, `SchemaBaselineTest::test_social_layer_tables_are_deferred`.
- `Отложено` Community redesign: кружки интересов, роли, участники и связь публикаций с community-контекстом.
- `Отложено` Realtime collaboration.
- `Отложено` Полноценный VTT/боевой runtime.
- `Отложено` Мобильные приложения.
- `Отложено` Платные подписки и монетизация.
- `Отложено` Генерация сценариев через AI.
- `Отложено` Object storage/S3 для ассетов.
- `Отложено` Импорт чужих asset sets/community sets.
- `Отложено` Mobile-first редакторы.

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
