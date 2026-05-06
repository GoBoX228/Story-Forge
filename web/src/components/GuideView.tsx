
import React, { useState } from 'react';
import { SectionHeader, Button } from './UI';
import { BaseCard } from './BaseCard';
import { Modal } from './Modal';
import { COLORS } from '../constants';
import { 
  PenTool, 
  Map as MapIcon, 
  Users, 
  Package, 
  Layers, 
  Cpu, 
  Terminal, 
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  MousePointer2,
  Move,
  Grid
} from 'lucide-react';

interface ModuleData {
  id: string;
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  shortContent: React.ReactNode;
  fullTitle: string;
  fullContent: React.ReactNode;
}

export const GuideView: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ModuleData | null>(null);

  const modules: ModuleData[] = [
    {
      id: 'scenarios',
      title: 'МОДУЛЬ 01: СЦЕНАРИИ',
      icon: <PenTool size={24} />,
      accentColor: 'var(--col-red)',
      shortContent: (
        <div>
          <h4 className="mono text-sm font-black uppercase text-[var(--text-main)] mb-2">Граф сценария</h4>
          <p className="text-[10px] mono text-[var(--text-muted)] leading-relaxed">
            Сценарии собираются из связанных узлов. Основные типы узлов:
          </p>
          <ul className="mt-2 space-y-1">
            <li className="flex items-center gap-2 mono text-[9px] uppercase font-bold text-[var(--text-main)]">
              <span className="w-1.5 h-1.5 bg-[var(--col-red)]"></span> Бой
            </li>
            <li className="flex items-center gap-2 mono text-[9px] uppercase font-bold text-[var(--text-main)]">
              <span className="w-1.5 h-1.5 bg-[var(--col-blue)]"></span> Диалог
            </li>
            <li className="flex items-center gap-2 mono text-[9px] uppercase font-bold text-[var(--text-main)]">
              <span className="w-1.5 h-1.5 bg-[var(--col-yellow)]"></span> Проверка
            </li>
          </ul>
        </div>
      ),
      fullTitle: 'ПРОТОКОЛ: СЦЕНАРИИ',
      fullContent: (
        <div className="space-y-6">
           <div className="p-4 border-l-4 border-[var(--col-red)] bg-[var(--bg-main)]">
              <p className="mono text-xs leading-relaxed text-[var(--text-main)]">
                 Сценарий — это граф игровых сцен. Узлы описывают содержание, а переходы задают маршрут прохождения и исходы.
              </p>
           </div>
           
           <div className="space-y-4">
              <h3 className="mono text-sm font-black uppercase text-[var(--col-red)] border-b border-[var(--border-color)] pb-2">ТИПЫ УЗЛОВ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="p-3 border border-[var(--border-color)] bg-[var(--bg-main)]">
                    <div className="mono text-[10px] font-black text-[var(--col-red)] mb-1">БОЙ</div>
                    <p className="text-[10px] text-[var(--text-muted)]">Используется для описания энкаунтеров и сражений.</p>
                 </div>
                 <div className="p-3 border border-[var(--border-color)] bg-[var(--bg-main)]">
                    <div className="mono text-[10px] font-black text-[var(--col-blue)] mb-1">ДИАЛОГ</div>
                    <p className="text-[10px] text-[var(--text-muted)]">Сцены общения с NPC или другими участниками сюжета.</p>
                 </div>
                 <div className="p-3 border border-[var(--border-color)] bg-[var(--bg-main)]">
                    <div className="mono text-[10px] font-black text-[var(--col-yellow)] mb-1">ПРОВЕРКА (CHECK)</div>
                    <p className="text-[10px] text-[var(--text-muted)]">Событие, требующее проверки. Имеет навык и <span className="text-[var(--text-main)]">DC</span>, а переходы успеха/провала задаются отдельно.</p>
                 </div>
                 <div className="p-3 border border-[var(--border-color)] bg-[var(--bg-main)]">
                    <div className="mono text-[10px] font-black text-[var(--text-muted)] mb-1">ОПИСАНИЕ</div>
                    <p className="text-[10px] text-[var(--text-muted)]">Стандартный нарративный текст и описание сцены.</p>
                 </div>
              </div>
           </div>

           <div className="space-y-2">
              <h3 className="mono text-sm font-black uppercase text-[var(--col-red)] border-b border-[var(--border-color)] pb-2">УПРАВЛЕНИЕ</h3>
              <ul className="space-y-2">
                 <li className="flex items-start gap-3 text-[10px] mono text-[var(--text-muted)]">
                    <Move size={14} className="text-[var(--text-main)] shrink-0"/>
                    <span><strong className="text-[var(--text-main)]">CANVAS:</strong> Перетаскивайте узлы, создавайте переходы через handles и используйте preview для проверки flow.</span>
                 </li>
                 <li className="flex items-start gap-3 text-[10px] mono text-[var(--text-muted)]">
                    <CheckCircle2 size={14} className="text-[var(--text-main)] shrink-0"/>
                    <span><strong className="text-[var(--text-main)]">СОХРАНЕНИЕ:</strong> Узлы, переходы, позиции и связи сохраняются через API сценарного графа.</span>
                 </li>
              </ul>
           </div>
        </div>
      )
    },
    {
      id: 'maps',
      title: 'МОДУЛЬ 02: КАРТОГРАФИЯ',
      icon: <MapIcon size={24} />,
      accentColor: 'var(--col-white)',
      shortContent: (
        <div>
          <h4 className="mono text-sm font-black uppercase text-[var(--text-main)] mb-2">Сетка и Инструменты</h4>
          <p className="text-[10px] mono text-[var(--text-muted)] leading-relaxed">
            Редактор карт работает в режиме пиксель-арт сетки. 
            Доступны инструменты рисования и управления камерой.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3">
             <div className="px-2 py-1 border border-[var(--border-color)] mono text-[9px] uppercase text-center text-[var(--text-muted)]">Кисть / Заливка</div>
             <div className="px-2 py-1 border border-[var(--border-color)] mono text-[9px] uppercase text-center text-[var(--text-muted)]">Панорама</div>
          </div>
        </div>
      ),
      fullTitle: 'ПРОТОКОЛ: ТОПОГРАФИЯ',
      fullContent: (
        <div className="space-y-6">
           <div className="p-4 border-l-4 border-[var(--col-white)] bg-[var(--bg-main)]">
              <p className="mono text-xs leading-relaxed text-[var(--text-main)]">
                 Редактор карт представляет собой растровый грид-конструктор. Каждая ячейка сетки соответствует 5 футам (1.5м) игрового пространства.
              </p>
           </div>

           <div className="space-y-4">
              <h3 className="mono text-sm font-black uppercase text-[var(--col-white)] border-b border-[var(--border-color)] pb-2">ПАНЕЛЬ ИНСТРУМЕНТОВ</h3>
              <div className="space-y-2">
                 <div className="flex items-center gap-4 p-2 bg-[var(--bg-main)] border border-[var(--border-color)]">
                    <MousePointer2 size={16} className="text-[var(--text-main)]"/>
                    <div className="flex-1">
                        <div className="mono text-[10px] font-black uppercase">ВЫДЕЛЕНИЕ</div>
                        <div className="text-[9px] text-[var(--text-muted)]">Выбор области для копирования или удаления.</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 p-2 bg-[var(--bg-main)] border border-[var(--border-color)]">
                    <Grid size={16} className="text-[var(--text-main)]"/>
                    <div className="flex-1">
                        <div className="mono text-[10px] font-black uppercase">КИСТЬ (BRUSH)</div>
                        <div className="text-[9px] text-[var(--text-muted)]">Рисование одиночными тайлами. Выберите тип тайла (Стена, Вода, Лава) в правой панели.</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 p-2 bg-[var(--bg-main)] border border-[var(--border-color)]">
                    <Move size={16} className="text-[var(--text-main)]"/>
                    <div className="flex-1">
                        <div className="mono text-[10px] font-black uppercase">ПАНОРАМА (PAN)</div>
                        <div className="text-[9px] text-[var(--text-muted)]">Перемещение холста. Альтернатива: зажать колесико мыши или Пробел.</div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="p-4 border border-dashed border-[var(--border-color)] bg-[var(--bg-main)]">
               <div className="mono text-[10px] font-black text-[var(--col-white)] mb-2 uppercase">ГОРЯЧИЕ КЛАВИШИ</div>
               <div className="grid grid-cols-2 gap-y-1 text-[9px] mono text-[var(--text-muted)]">
                   <span>КОЛЕСО МЫШИ</span> <span className="text-right">МАСШТАБ (ZOOM)</span>
                   <span>СРЕДНЯЯ КНОПКА</span> <span className="text-right">ПЕРЕМЕЩЕНИЕ</span>
                   <span>CTRL + Z</span> <span className="text-right">ОТМЕНА (UNDO)</span>
               </div>
           </div>
        </div>
      )
    },
    {
        id: 'characters',
        title: 'МОДУЛЬ 03: ПЕРСОНАЖИ',
        icon: <Users size={24} />,
        accentColor: 'var(--col-yellow)',
        shortContent: (
            <div>
                <h4 className="mono text-sm font-black uppercase text-[var(--text-main)] mb-2">Авторасчет</h4>
                <p className="text-[10px] mono text-[var(--text-muted)] leading-relaxed">
                Система автоматически суммирует базовые характеристики и бонусы от экипированных предметов.
                </p>
                <div className="mt-2 flex gap-2">
                    <span className="px-2 py-0.5 bg-[var(--col-yellow)]/10 text-[var(--col-yellow)] border border-[var(--col-yellow)] mono text-[8px] font-black">ГЕРОЙ</span>
                    <span className="px-2 py-0.5 bg-[var(--col-red)]/10 text-[var(--col-red)] border border-[var(--col-red)] mono text-[8px] font-black">МОНСТР</span>
                </div>
            </div>
        ),
        fullTitle: 'ПРОТОКОЛ: БИОЛОГИЯ',
        fullContent: (
            <div className="space-y-6">
                <div className="p-4 border-l-4 border-[var(--col-yellow)] bg-[var(--bg-main)]">
                    <p className="mono text-xs leading-relaxed text-[var(--text-main)]">
                        База данных NPC позволяет создавать динамические карточки персонажей с автоматическим расчетом веса инвентаря и боевых характеристик.
                    </p>
                </div>

                <div className="space-y-4">
                    <h3 className="mono text-sm font-black uppercase text-[var(--col-yellow)] border-b border-[var(--border-color)] pb-2">МЕХАНИКИ РАСЧЕТА</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-[var(--border-color)] border-dashed pb-1">
                            <span className="mono text-[10px] font-bold text-[var(--text-main)]">ЭФФЕКТИВНЫЙ СТАТ</span>
                            <span className="mono text-[10px] text-[var(--text-muted)]">БАЗА + МОДИФИКАТОРЫ ПРЕДМЕТОВ</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-[var(--border-color)] border-dashed pb-1">
                            <span className="mono text-[10px] font-bold text-[var(--text-main)]">МАКС. ВЕС</span>
                            <span className="mono text-[10px] text-[var(--text-muted)]">СИЛА × 5 (КГ)</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="mono text-sm font-black uppercase text-[var(--col-yellow)] border-b border-[var(--border-color)] pb-2">РОЛИ СУЩЕСТВ</h3>
                    <ul className="space-y-2">
                        <li className="p-2 border-l-2 border-[var(--col-yellow)] bg-[var(--bg-main)]">
                            <strong className="block mono text-[10px] uppercase text-[var(--col-yellow)]">ГЕРОЙ</strong>
                            <span className="text-[10px] text-[var(--text-muted)]">Игровые персонажи. Отображаются в начале списков.</span>
                        </li>
                        <li className="p-2 border-l-2 border-[var(--col-blue)] bg-[var(--bg-main)]">
                            <strong className="block mono text-[10px] uppercase text-[var(--col-blue)]">NPC</strong>
                            <span className="text-[10px] text-[var(--text-muted)]">Нейтральные персонажи, торговцы, квестодатели.</span>
                        </li>
                        <li className="p-2 border-l-2 border-[var(--col-red)] bg-[var(--bg-main)]">
                            <strong className="block mono text-[10px] uppercase text-[var(--col-red)]">МОНСТР</strong>
                            <span className="text-[10px] text-[var(--text-muted)]">Враги. Используются в боевых энкаунтерах.</span>
                        </li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: 'items',
        title: 'МОДУЛЬ 04: ПРЕДМЕТЫ',
        icon: <Package size={24} />,
        accentColor: 'var(--col-blue)',
        shortContent: (
            <div>
                <h4 className="mono text-sm font-black uppercase text-[var(--text-main)] mb-2">Реестр Лута</h4>
                <p className="text-[10px] mono text-[var(--text-muted)] leading-relaxed">
                    Централизованное хранилище всех предметов мира. Предметы имеют редкость и стат-модификаторы.
                </p>
            </div>
        ),
        fullTitle: 'ПРОТОКОЛ: РЕСУРСЫ',
        fullContent: (
            <div className="space-y-6">
                <div className="p-4 border-l-4 border-[var(--col-blue)] bg-[var(--bg-main)]">
                    <p className="mono text-xs leading-relaxed text-[var(--text-main)]">
                        Конструктор предметов позволяет создавать уникальные артефакты, которые влияют на характеристики владельца.
                    </p>
                </div>

                <div className="space-y-4">
                    <h3 className="mono text-sm font-black uppercase text-[var(--col-blue)] border-b border-[var(--border-color)] pb-2">ГРАДАЦИЯ РЕДКОСТИ</h3>
                    <div className="grid grid-cols-5 gap-1 text-center">
                        <div className="p-1 bg-[var(--col-grey)]/20 border border-[var(--col-grey)] text-[var(--col-grey)] mono text-[8px] font-black uppercase">ОБЫЧНЫЙ</div>
                        <div className="p-1 bg-[var(--col-blue)]/20 border border-[var(--col-blue)] text-[var(--col-blue)] mono text-[8px] font-black uppercase">НЕОБЫЧНЫЙ</div>
                        <div className="p-1 bg-[var(--col-red)]/20 border border-[var(--col-red)] text-[var(--col-red)] mono text-[8px] font-black uppercase">РЕДКИЙ</div>
                        <div className="p-1 bg-[var(--col-purple)]/20 border border-[var(--col-purple)] text-[var(--col-purple)] mono text-[8px] font-black uppercase">ЭПИК</div>
                        <div className="p-1 bg-[var(--col-yellow)]/20 border border-[var(--col-yellow)] text-[var(--col-yellow)] mono text-[8px] font-black uppercase">ЛЕГЕНДА</div>
                    </div>
                </div>

                <div className="p-4 bg-[var(--bg-main)] border border-[var(--border-color)]">
                    <h4 className="mono text-[10px] font-black uppercase text-[var(--text-main)] mb-2">МОДИФИКАТОРЫ</h4>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                        При добавлении предмета в инвентарь персонажа, все его модификаторы (например, <span className="text-[var(--col-blue)]">СИЛ +5</span>) автоматически применяются к эффективным характеристикам персонажа.
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'campaigns',
        title: 'МОДУЛЬ 05: КАМПАНИИ',
        icon: <Layers size={24} />,
        accentColor: 'var(--col-purple)',
        shortContent: (
            <div>
                <h4 className="mono text-sm font-black uppercase text-[var(--text-main)] mb-2">Структура Мира</h4>
                <p className="text-[10px] mono text-[var(--text-muted)] leading-relaxed">
                    Кампания объединяет разрозненные элементы (сценарии, карты, персонажей) в единый контекст.
                </p>
            </div>
        ),
        fullTitle: 'ПРОТОКОЛ: ОРГАНИЗАЦИЯ',
        fullContent: (
            <div className="space-y-6">
                <div className="p-4 border-l-4 border-[var(--col-purple)] bg-[var(--bg-main)]">
                    <p className="mono text-xs leading-relaxed text-[var(--text-main)]">
                        Кампания — это контейнер верхнего уровня. Она позволяет фильтровать контент в редакторах, показывая только те элементы, которые относятся к текущему приключению.
                    </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-main)]">
                        <div className="mono text-[10px] font-black uppercase text-[var(--col-purple)] mb-2">ТЕГИРОВАНИЕ</div>
                        <p className="text-[9px] text-[var(--text-muted)]">Используйте теги (например, #HORROR, #DND5E) для быстрой классификации и поиска кампаний в дашборде.</p>
                    </div>
                    <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-main)]">
                        <div className="mono text-[10px] font-black uppercase text-[var(--col-purple)] mb-2">ПРОГРЕСС</div>
                        <p className="text-[9px] text-[var(--text-muted)]">Отслеживайте прогресс прохождения сюжета с помощью визуального индикатора в карточке кампании.</p>
                    </div>
                </div>
            </div>
        )
    }
  ];

  return (
    <div className="h-full overflow-auto bauhaus-bg p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <SectionHeader 
          title="ПРОТОКОЛ: ОБУЧЕНИЕ" 
          subtitle="ТЕХНИЧЕСКАЯ ДОКУМЕНТАЦИЯ СИСТЕМЫ STORY FORGE" 
          accentColor={COLORS.accentWhite} 
        />

        {/* Introduction */}
        <div className="bg-[var(--bg-surface)] border-l-4 border-[var(--col-white)] p-8 shadow-lg">
          <h2 className="text-2xl font-black uppercase mb-4 text-[var(--text-main)] flex items-center gap-3">
            <Terminal size={24} /> Введение в систему
          </h2>
          <p className="mono text-sm text-[var(--text-muted)] leading-relaxed max-w-4xl">
            Story Forge — это интегрированная среда разработки для Мастеров Игры. 
            Система построена на принципах атомарного дизайна: каждый элемент вашего мира (персонаж, предмет, карта) 
            является независимым модулем, который можно переиспользовать в любых сценариях и кампаниях.
            <br/><br/>
            Ниже представлен обзор основных модулей системы.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {modules.map(module => (
            <BaseCard key={module.id} title={module.title} accentColor={module.accentColor}>
              <div className="space-y-4 flex flex-col h-full">
                <div className="flex items-start gap-4">
                  <div 
                    className="p-3 border flex items-center justify-center shrink-0" 
                    style={{ borderColor: module.accentColor, backgroundColor: `color-mix(in srgb, ${module.accentColor} 10%, transparent)`, color: module.accentColor }}
                  >
                    {module.icon}
                  </div>
                  <div>
                    {module.shortContent}
                  </div>
                </div>
                
                <div className="flex-1" />
                
                <Button 
                    className="w-full mt-4 group" 
                    inverted 
                    color={
                        module.id === 'scenarios' ? 'red' :
                        module.id === 'maps' ? 'white' :
                        module.id === 'characters' ? 'yellow' :
                        module.id === 'items' ? 'blue' :
                        module.id === 'campaigns' ? 'purple' : 'white'
                    }
                    onClick={() => setActiveModule(module)}
                >
                    ПОДРОБНЕЕ <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                </Button>
              </div>
            </BaseCard>
          ))}

           {/* System Info */}
           <BaseCard title="СИСТЕМНЫЕ ТРЕБОВАНИЯ" accentColor={COLORS.accentTeal}>
             <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[var(--col-teal)]/10 text-[var(--col-teal)] border border-[var(--col-teal)]">
                  <Cpu size={24} />
                </div>
                <div>
                  <h4 className="mono text-sm font-black uppercase text-[var(--text-main)] mb-2">Технические данные</h4>
                  <p className="text-[10px] mono text-[var(--text-muted)] leading-relaxed">
                    Приложение оптимизировано для работы в современных браузерах (Chrome 90+, Firefox 90+).
                    Поддерживаются OLED-дисплеи для режима "Глубокий черный".
                  </p>
                  <div className="mt-4 flex items-center gap-2 border border-[var(--col-teal)] p-2 bg-[var(--bg-main)]">
                      <AlertTriangle size={14} className="text-[var(--col-teal)]"/>
                      <span className="mono text-[9px] uppercase text-[var(--text-muted)]">
                          Локальное хранилище используется для сохранения черновиков.
                      </span>
                  </div>
                </div>
              </div>
            </div>
          </BaseCard>
        </div>

        {/* Detail Modal */}
        <Modal
            isOpen={!!activeModule}
            onClose={() => setActiveModule(null)}
            title={activeModule?.fullTitle}
            accentColor={activeModule?.accentColor}
            maxWidth="max-w-3xl"
        >
            {activeModule && (
                <div className="animate-appear">
                    {activeModule.fullContent}
                    
                    <div className="mt-8 pt-6 border-t border-[var(--border-color)] flex justify-end">
                        <Button onClick={() => setActiveModule(null)} color="white" inverted>ЗАКРЫТЬ СПРАВКУ</Button>
                    </div>
                </div>
            )}
        </Modal>
      </div>
    </div>
  );
};
