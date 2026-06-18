import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Images,
  Library,
  Link2,
  Map as MapIcon,
  Package,
  PenTool,
  Search,
  Shield,
  Tags,
  Terminal,
  Users,
} from 'lucide-react';
import { BaseCard } from './BaseCard';
import { Modal } from './Modal';
import { Button, SectionHeader } from './UI';
import { COLORS } from '../constants';

type ButtonColor = NonNullable<React.ComponentProps<typeof Button>['color']>;

interface GuideSection {
  title: string;
  points: string[];
}

interface GuideModule {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  buttonColor: ButtonColor;
  summary: string;
  quickPoints: string[];
  sections: GuideSection[];
}

const guideModules: GuideModule[] = [
  {
    id: 'scenarios',
    title: 'Сценарии',
    subtitle: 'Граф сцен, переходов и связанных материалов',
    icon: <PenTool size={24} />,
    accentColor: 'var(--col-red)',
    buttonColor: 'red',
    summary:
      'Сценарий строится как граф игровых сцен. Узлы описывают содержание эпизодов, а переходы задают маршрут прохождения, условия и развилки.',
    quickPoints: [
      'создание и редактирование узлов прямо на canvas',
      'переходы между сценами с типами, подписями и условиями',
      'режим предпросмотра для проверки прохождения',
    ],
    sections: [
      {
        title: 'Работа с графом',
        points: [
          'Используйте canvas как основную рабочую область: перетаскивайте узлы, масштабируйте карту сценария и связывайте сцены через точки переходов.',
          'Для узлов доступны типизированные формы: описание, диалог, место, проверка, лут и бой.',
          'Переходы можно подписывать, редактировать и визуально разводить вручную, если авто-маршрут мешает читаемости.',
        ],
      },
      {
        title: 'Связанные материалы',
        points: [
          'К сценарию и отдельным узлам можно привязывать карты, персонажей, предметы, ассеты и другие материалы через универсальные связи.',
          'Связанные материалы используются в предпросмотре и при экспорте сценария.',
        ],
      },
      {
        title: 'Проверка',
        points: [
          'Валидация показывает ошибки и предупреждения по структуре графа перед публикацией или экспортом.',
          'Сохранение не блокируется предупреждениями, но их лучше исправлять до печати материалов.',
        ],
      },
    ],
  },
  {
    id: 'maps',
    title: 'Карты',
    subtitle: 'Тактическая сетка, слои, тайлы и PDF',
    icon: <MapIcon size={24} />,
    accentColor: COLORS.accentWhite,
    buttonColor: 'white',
    summary:
      'Редактор карт позволяет собирать игровые локации на клеточной сетке, работать со слоями, тайлами, токенами и экспортировать карту в PDF.',
    quickPoints: [
      'тайлы и токены берутся из ассетов подходящего kind',
      'наборы ассетов карты ограничивают палитру',
      'экспорт поддерживает размер листа и ориентацию',
    ],
    sections: [
      {
        title: 'Слои и палитра',
        points: [
          'Карта хранит размеры, сетку, слои и размещенные объекты в собственных данных.',
          'Палитра тайлов использует ассеты типа tile, а токены — ассеты типа token.',
          'Если к карте подключены наборы ассетов, палитра показывает только подходящие ассеты из этих наборов. Если наборы не выбраны, доступны все подходящие ассеты.',
        ],
      },
      {
        title: 'Печать',
        points: [
          'Карту можно экспортировать отдельным PDF с выбором формата листа и ориентации.',
          'Экспорт учитывает видимые слои, сетку, текстуры тайлов и токены.',
        ],
      },
    ],
  },
  {
    id: 'characters',
    title: 'Персонажи',
    subtitle: 'Реестр существ, группы, портреты, токены и теги',
    icon: <Users size={24} />,
    accentColor: 'var(--col-yellow)',
    buttonColor: 'yellow',
    summary:
      'Персонажи хранятся как переиспользуемые карточки: NPC, герои и монстры могут входить в группы, получать теги, портреты, токены и инвентарь.',
    quickPoints: [
      'портреты, токены и теги доступны уже при создании',
      'группа может подключать набор ассетов',
      'инвентарь влияет на эффективные характеристики',
    ],
    sections: [
      {
        title: 'Создание и редактирование',
        points: [
          'В форме персонажа задаются имя, роль, группа, базовые характеристики, описание и инвентарь.',
          'Портрет, токен и теги можно выбрать сразу при первичном создании. Система применит их после сохранения карточки.',
          'У существ есть роли: герой, NPC и монстр. Роль влияет на визуальное оформление и фильтры.',
        ],
      },
      {
        title: 'Группы и ассеты',
        points: [
          'Персонаж может входить максимум в одну группу.',
          'Внутри открытой группы есть селектор набора ассетов. Он ограничивает доступные портреты и токены для карточек этой группы.',
          'Если набор ассетов у группы не выбран, picker показывает все подходящие ассеты. Прямой выбор конкретного портрета или токена на карточке остается приоритетным.',
        ],
      },
      {
        title: 'Теги и поиск',
        points: [
          'Теги помогают быстро фильтровать персонажей по назначению, фракции, сцене или настроению.',
          'Фильтры по тегам работают вместе с поиском, ролью и текущей группой.',
        ],
      },
    ],
  },
  {
    id: 'items',
    title: 'Предметы',
    subtitle: 'Склад снаряжения, группы, изображения и модификаторы',
    icon: <Package size={24} />,
    accentColor: 'var(--col-blue)',
    buttonColor: 'blue',
    summary:
      'Предметы описывают оружие, броню, расходники, артефакты и сюжетные объекты. Их можно группировать, тегировать и связывать со сценариями.',
    quickPoints: [
      'изображение и теги доступны при создании',
      'группа предметов ограничивает пул item image',
      'модификаторы предметов применяются в инвентаре персонажа',
    ],
    sections: [
      {
        title: 'Карточка предмета',
        points: [
          'У предмета есть название, группа, тип, редкость, описание, вес, цена и список модификаторов.',
          'Изображение предмета и теги можно выбрать сразу в create-модалке.',
          'Редкость окрашивает карточку и помогает визуально отличать обычные, редкие, эпические и легендарные предметы.',
        ],
      },
      {
        title: 'Группы и наборы ассетов',
        points: [
          'Предмет может входить максимум в одну группу.',
          'Открытая группа предметов имеет селектор набора ассетов. Этот набор ограничивает изображения, доступные предметам внутри группы.',
          'Прямой выбор изображения на карточке сохраняется как manual override.',
        ],
      },
    ],
  },
  {
    id: 'assets',
    title: 'Ассеты',
    subtitle: 'Файлы, папки, наборы и назначение материалов',
    icon: <Images size={24} />,
    accentColor: 'var(--col-teal)',
    buttonColor: 'teal',
    summary:
      'Ассеты — это библиотека изображений, документов и других файлов. Папки отвечают за хранение, а наборы — за переиспользуемые пулы материалов.',
    quickPoints: [
      'папки не равны наборам ассетов',
      'один ассет может входить в несколько наборов',
      'kind ассета определяет, где его можно выбрать',
    ],
    sections: [
      {
        title: 'Файлы и папки',
        points: [
          'Файл имеет media type: image, document или other.',
          'Назначение kind определяет доменную роль: tile, token, portrait, background, item_image, handout, document, icon или other.',
          'Папка — это место хранения файла в личной библиотеке. Файл находится максимум в одной папке.',
        ],
      },
      {
        title: 'Наборы ассетов',
        points: [
          'Набор — это переиспользуемая коллекция ассетов. Один ассет может входить сразу в несколько наборов.',
          'Наборы подключаются к картам, группам персонажей и группам предметов, чтобы ограничить доступный пул в picker/palette.',
          'В режиме наборов можно переименовывать наборы inline, открывать их, добавлять выбранные ассеты или перетаскивать файлы внутрь.',
        ],
      },
    ],
  },
  {
    id: 'campaigns',
    title: 'Кампании',
    subtitle: 'Рабочая область приключения и состав материалов',
    icon: <Library size={24} />,
    accentColor: 'var(--col-purple)',
    buttonColor: 'purple',
    summary:
      'Кампания — это отдельная рабочая область, где сценарии принадлежат кампании напрямую, а карты, персонажи и предметы подключаются как переиспользуемые материалы.',
    quickPoints: [
      'сценарии создаются внутри кампании',
      'карты, персонажи и предметы подключаются связями uses',
      'доступен ZIP-экспорт всей кампании',
    ],
    sections: [
      {
        title: 'Структура кампании',
        points: [
          'Кампания содержит название, описание и набор вкладок: обзор, сценарии, карты, персонажи, предметы и экспорт ZIP.',
          'Сценарии имеют явную принадлежность кампании.',
          'Карты, персонажи и предметы остаются общими материалами библиотеки и подключаются к кампании через связи. Это позволяет переиспользовать один материал в разных кампаниях.',
        ],
      },
      {
        title: 'Рабочий процесс',
        points: [
          'Сначала создайте кампанию, затем добавьте или подключите сценарии и материалы.',
          'Во вкладках материалов можно видеть, что уже входит в кампанию, и быстро добавлять нужные элементы из библиотеки.',
        ],
      },
    ],
  },
  {
    id: 'export',
    title: 'Экспорт',
    subtitle: 'PDF сценариев, карт, карточек и ZIP кампании',
    icon: <Download size={24} />,
    accentColor: 'var(--col-pink)',
    buttonColor: 'pink',
    summary:
      'Экспорт превращает подготовленные материалы в печатные PDF. Для кампаний доступна асинхронная сборка ZIP с отдельными файлами внутри архива.',
    quickPoints: [
      'сценарии экспортируются как graph-aware runbook',
      'карты экспортируются отдельными PDF',
      'ZIP кампании собирается через очередь',
    ],
    sections: [
      {
        title: 'Отдельные PDF',
        points: [
          'Сценарий экспортируется в PDF с учетом структуры графа и связанных материалов.',
          'Карта экспортируется в PDF с выбранным форматом листа, ориентацией, слоями, сеткой и текстурами.',
          'Карточки персонажей и предметов экспортируются листами A4 3×3 с режимами двусторонней печати.',
        ],
      },
      {
        title: 'ZIP кампании',
        points: [
          'Во вкладке экспорта кампании можно собрать ZIP-архив всей кампании.',
          'Архив содержит отдельные PDF сценариев, карт и карточек материалов.',
          'Материалы дедуплицируются по type:id, чтобы один и тот же персонаж, предмет или карта не экспортировались лишний раз.',
        ],
      },
    ],
  },
  {
    id: 'admin',
    title: 'Админ-панель',
    subtitle: 'Пользователи, жалобы, объявления, контент и журнал',
    icon: <Shield size={24} />,
    accentColor: 'var(--col-red)',
    buttonColor: 'red',
    summary:
      'Админ-панель предназначена для контроля пользователей, просмотра жалоб, управления объявлениями, проверки контента и аудита действий.',
    quickPoints: [
      'быстрые действия скрыты из обзора',
      'доступны вкладки пользователей, вещания и реестра',
      'системный терминал показывает журнал действий',
    ],
    sections: [
      {
        title: 'Обзор',
        points: [
          'На главной вкладке отображаются статус сервера, количество пользователей, размер рабочей базы материалов и системный журнал.',
          'Блок быстрых действий скрыт, чтобы не показывать демонстрационные кнопки без полноценной серверной логики.',
        ],
      },
      {
        title: 'Модерация',
        points: [
          'Администратор может управлять пользователями, ролями, статусами, объявлениями, жалобами и опубликованным контентом.',
          'Критичные действия фиксируются в журнале аудита.',
        ],
      },
    ],
  },
];

const workflowSteps = [
  {
    icon: <FileText size={16} />,
    title: '1. Сценарий',
    text: 'Соберите граф сцен и развилки прохождения.',
  },
  {
    icon: <MapIcon size={16} />,
    title: '2. Карты',
    text: 'Подготовьте локации, слои, тайлы и токены.',
  },
  {
    icon: <Users size={16} />,
    title: '3. Материалы',
    text: 'Создайте персонажей, предметы, ассеты и теги.',
  },
  {
    icon: <Library size={16} />,
    title: '4. Кампания',
    text: 'Объедините сценарии и переиспользуемые материалы.',
  },
  {
    icon: <Download size={16} />,
    title: '5. Экспорт',
    text: 'Соберите PDF или ZIP для подготовки игровой сессии.',
  },
];

export const GuideView: React.FC = () => {
  const [activeModule, setActiveModule] = useState<GuideModule | null>(null);

  return (
    <div className="h-full overflow-auto bauhaus-bg p-8 lg:p-12">
      <div className="mx-auto max-w-7xl space-y-10">
        <SectionHeader
          title="ПРОТОКОЛ: РУКОВОДСТВО"
          subtitle="АКТУАЛЬНАЯ СПРАВКА ПО МОДУЛЯМ STORY FORGE"
          accentColor={COLORS.accentWhite}
        />

        <section className="border-l-4 border-[var(--col-white)] bg-[var(--bg-surface)] p-6 shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--col-white)] bg-[var(--col-white)]/10 text-[var(--col-white)]">
              <BookOpen size={24} />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-black uppercase text-[var(--text-main)]">Как устроена Кузница</h2>
              <p className="mono max-w-5xl text-sm leading-relaxed text-[var(--text-muted)]">
                Story Forge — это рабочая среда для подготовки настольных RPG: сценарии строятся как графы,
                карты собираются на сетке, персонажи и предметы живут в библиотеках, ассеты подключаются через
                папки и наборы, а кампания объединяет всё в один печатный пакет.
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                {workflowSteps.map((step) => (
                  <div key={step.title} className="border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
                    <div className="mb-2 flex items-center gap-2 mono text-[10px] font-black uppercase text-[var(--text-main)]">
                      {step.icon}
                      {step.title}
                    </div>
                    <p className="text-[9px] leading-relaxed text-[var(--text-muted)]">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {guideModules.map((module) => (
            <BaseCard key={module.id} title={module.title.toUpperCase()} accentColor={module.accentColor}>
              <div className="flex h-full flex-col gap-5">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center border"
                    style={{
                      borderColor: module.accentColor,
                      color: module.accentColor,
                      backgroundColor: `color-mix(in srgb, ${module.accentColor} 10%, transparent)`,
                    }}
                  >
                    {module.icon}
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="mono text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {module.subtitle}
                    </div>
                    <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">{module.summary}</p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {module.quickPoints.map((point) => (
                    <li key={point} className="flex items-start gap-2 mono text-[9px] uppercase leading-relaxed text-[var(--text-main)]">
                      <CheckCircle2 size={12} className="mt-0.5 shrink-0" style={{ color: module.accentColor }} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex-1" />

                <Button className="w-full group" inverted color={module.buttonColor} onClick={() => setActiveModule(module)}>
                  Подробнее
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </BaseCard>
          ))}

          <BaseCard title="ПОЛЕЗНЫЕ ПРИНЦИПЫ" accentColor={COLORS.accentTeal}>
            <div className="space-y-4">
              {[
                {
                  icon: <Search size={16} />,
                  title: 'Поиск и фильтры',
                  text: 'Используйте поиск, теги, группы и типы, чтобы не превращать библиотеку в свалку.',
                },
                {
                  icon: <Tags size={16} />,
                  title: 'Теги',
                  text: 'Теги — это пользовательская классификация. Они не заменяют kind ассета и не влияют на технический picker.',
                },
                {
                  icon: <Link2 size={16} />,
                  title: 'Связи',
                  text: 'Материалы лучше связывать, а не дублировать: один персонаж или предмет может использоваться в нескольких сценариях и кампаниях.',
                },
                {
                  icon: <Terminal size={16} />,
                  title: 'Экспорт',
                  text: 'Перед экспортом проверьте граф сценария, видимость слоев карты и состав кампании.',
                },
              ].map((item) => (
                <div key={item.title} className="border border-[var(--border-color)] bg-[var(--bg-main)] p-3">
                  <div className="mb-1 flex items-center gap-2 mono text-[10px] font-black uppercase text-[var(--col-teal)]">
                    {item.icon}
                    {item.title}
                  </div>
                  <p className="text-[9px] leading-relaxed text-[var(--text-muted)]">{item.text}</p>
                </div>
              ))}
            </div>
          </BaseCard>
        </section>

        <Modal
          isOpen={Boolean(activeModule)}
          onClose={() => setActiveModule(null)}
          title={activeModule ? `РУКОВОДСТВО: ${activeModule.title.toUpperCase()}` : undefined}
          accentColor={activeModule?.accentColor}
          maxWidth="max-w-3xl"
        >
          {activeModule && (
            <div className="animate-appear space-y-6">
              <div className="border-l-4 bg-[var(--bg-main)] p-4" style={{ borderColor: activeModule.accentColor }}>
                <div className="mb-2 flex items-center gap-3 mono text-xs font-black uppercase" style={{ color: activeModule.accentColor }}>
                  {activeModule.icon}
                  {activeModule.subtitle}
                </div>
                <p className="mono text-xs leading-relaxed text-[var(--text-main)]">{activeModule.summary}</p>
              </div>

              {activeModule.sections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h3
                    className="border-b border-[var(--border-color)] pb-2 mono text-sm font-black uppercase"
                    style={{ color: activeModule.accentColor }}
                  >
                    {section.title}
                  </h3>
                  <ul className="space-y-2">
                    {section.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 border border-[var(--border-color)] bg-[var(--bg-main)] p-3 text-[10px] leading-relaxed text-[var(--text-muted)]">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: activeModule.accentColor }} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              <div className="flex justify-end border-t border-[var(--border-color)] pt-5">
                <Button color="white" inverted onClick={() => setActiveModule(null)}>
                  Закрыть справку
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};
