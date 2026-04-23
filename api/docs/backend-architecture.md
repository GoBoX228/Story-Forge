# Backend Architecture — Story Forge API

## 1) Целевая архитектурная схема

Единый pipeline для backend endpoint-ов:

`FormRequest -> Controller -> Policy -> DTO -> Service -> Actions -> Resource/Response`

Смысл слоев:
- `FormRequest`: валидация/нормализация входа.
- `Controller`: thin entrypoint, orchestration HTTP-ответа.
- `Policy`: проверка прав доступа на уровне сценария.
- `DTO`: неизменяемый контракт входных данных use-case.
- `Service`: orchestration бизнес-сценария.
- `Actions`: атомарные операции (DB/query/model side effects).
- `Resource/Response`: финальная сериализация ответа.

## 2) Модульная карта доменов

- `App\Domain\Auth` — сессии, пароль, 2FA, профиль.
- `App\Domain\Admin` — обзор/пользователи/жалобы/контент/рассылки/логи админа.
- `App\Domain\Core` — кампании/сценарии/главы/блоки/карты/персонажи/предметы.
- `App\Domain\Report` — пользовательские жалобы.
- `App\Domain\Broadcast` — пользовательский список объявлений.
- `App\Domain\Export` — экспорт сценария в PDF.

Правило: междоменные вызовы только через явные dependency-injected сервисы/actions, без “толстых” контроллеров и без дублирования HTTP-валидации.

## 3) Правила зависимостей и границы ответственности

### Controller
- Не содержит бизнес-логику и SQL.
- Не вызывает напрямую Eloquent для сценария, кроме тривиальных случаев инфраструктуры.
- Делегирует в service и собирает HTTP status/body.

### Service
- Координирует use-case, но не разрастается в “god class”.
- Использует actions как атомарные шаги.
- Не занимается форматированием HTTP-ответа.

### Action
- Одна ответственность: выборка, запись, синхронизация, audit, генерация и т.п.
- Может работать с Eloquent/DB напрямую.
- Минимально зависит от других actions.

### Resource
- Только сериализация output-модели/DTO в контракт API.
- Без бизнес-ветвлений.

## 4) Семантика доступа: `404` vs `403`

В проекте используется смешанная стратегия:
- `Policy` проверяет “можно ли выполнять этот тип операции” в целом.
- ownership и изоляция чужих сущностей обеспечиваются scoped queries (`where user_id = ...`, `whereHas ...`), что возвращает `404` для чужих записей.

Это фиксированное поведение для совместимости с текущим фронтом и тестами.

## 5) Как добавлять новый endpoint (шаблон)

1. Определить use-case и контракт ответа.
2. Добавить `FormRequest` + `DTO`.
3. Добавить/обновить `Policy` (если нужен доступ-контроль).
4. Реализовать `Service` (оркестрация use-case).
5. Разбить операции на `Actions`.
6. Добавить `Resource` (или бинарный/кастомный response).
7. Сделать thin контроллер:
   - `authorize(...)`
   - `$request->toDto()`
   - вызов сервиса
   - `response()->json(...)` / бинарный ответ
8. Добавить feature-тесты:
   - happy path
   - ownership/access boundaries
   - контракт ключей ответа
   - edge cases

## 6) Тестовая стратегия

Основные feature-наборы:
- `AuthTest`
- `AdminModuleTest`, `AdminAccessTest`
- `CoreCrudTest`
- `ReportBroadcastExportTest`

Требования:
- контрактные проверки ключей JSON для критичных endpoint-ов;
- проверки ownership-semantic (ожидаемые `404`);
- проверки статус-кодов/сообщений там, где это часть публичного контракта.

## 7) Совместимость API

Стабильные ограничения:
- не менять URI/HTTP methods/middleware без отдельной миграции контракта;
- не менять коды ответа и shape payload без обновления frontend-контракта;
- при конфликте “чистота vs совместимость” — приоритет у совместимости.

## 8) Changelog рефакторинга

- **Phase 1 (Auth)**: перенос auth-логики в domain services/actions + thin controllers.
- **Phase 2 (Admin)**: декомпозиция admin-монолита на модульные контроллеры/сервисы/actions.
- **Phase 3 (Core CRUD)**: полный переход CRUD-ресурсов в `Domain/Core`.
- **Phase 4 (Export + Report/Broadcast)**: отдельные домены `Export`, `Report`, `Broadcast`.
- **Phase 5 (Legacy cleanup)**:
  - удален deprecated `AuthBaseController`;
  - auth-контроллеры переведены на прямое наследование `Controller`;
  - исправлены битые fallback/default значения item type/rarity (`Прочее`, `Обычный`);
  - добавлена data-fix миграция для backfill и обновления DB defaults.

**Текущий статус:** `legacy cleanup completed`.

