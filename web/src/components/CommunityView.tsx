
import React, { useState } from 'react';
import { SectionHeader, Button, Badge, SearchInput } from './UI';
import { BaseCard } from './BaseCard';
import { COLORS } from '../constants';
import { MessageSquare, ThumbsUp, Eye, Share2, Plus, Hash } from 'lucide-react';

const ACCENT = 'var(--col-teal)';

export const CommunityView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('ВСЕ');

  const threads = [
    {
      id: 1,
      title: 'КАК БАЛАНСИРОВАТЬ ЭКОНОМИКУ В МРАЧНОМ ФЭНТЕЗИ?',
      author: 'Dungeon_Master_99',
      replies: 42,
      likes: 128,
      views: '1.2K',
      tags: ['СОВЕТЫ', 'МЕХАНИКИ'],
      preview: 'Столкнулся с проблемой инфляции золота к 5 уровню. Игроки скупают все артефакты...',
      hot: true
    },
    {
      id: 2,
      title: 'ИЩУ ПАТИ: D&D 5E, МОДУЛЬ "ПРОКЛЯТИЕ СТРАДА"',
      author: 'Rogue_One',
      replies: 15,
      likes: 8,
      views: '450',
      tags: ['ПОИСК ИГРЫ', 'ОНЛАЙН'],
      preview: 'Нужен клерик и танк. Играем по пятницам в 20:00 МСК. Опыт не важен, главное отыгрыш.',
      hot: false
    },
    {
      id: 3,
      title: 'РЕЛИЗ: ПАК КАРТ "ЗАБРОШЕННЫЕ ШАХТЫ" (20x20)',
      author: 'MapMaker_X',
      replies: 89,
      likes: 560,
      views: '5K',
      tags: ['РЕСУРСЫ', 'КАРТЫ'],
      preview: 'Собрал пак из 10 карт для подземелий. Все ассеты нарисованы вручную. Ссылка внутри.',
      hot: true
    }
  ];

  return (
    <div className="h-full overflow-auto bauhaus-bg p-12">
      <div className="max-w-7xl mx-auto">
        <SectionHeader 
            title="ГЛОБАЛЬНАЯ СЕТЬ" 
            subtitle="ФОРУМ МАСТЕРОВ И ИГРОКОВ" 
            accentColor={ACCENT} 
            actions={
                <Button color="teal" size="lg">
                    <Plus size={18} /> СОЗДАТЬ ТЕМУ
                </Button>
            }
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Filters */}
            <div className="space-y-8">
                <BaseCard title="КАНАЛЫ СВЯЗИ" accentColor={ACCENT}>
                    <div className="space-y-1">
                        {['ВСЕ', 'ОБСУЖДЕНИЕ', 'ПОИСК ГРУППЫ', 'РЕСУРСЫ', 'ОФФТОП'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`w-full text-left px-4 py-3 mono text-[10px] uppercase font-black transition-all border-l-2 ${activeTab === tab ? 'border-[var(--col-teal)] bg-[var(--col-teal)]/10 text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]'}`}
                            >
                                {tab === 'ВСЕ' ? 'ВСЕ ПОТОКИ' : tab}
                            </button>
                        ))}
                    </div>
                </BaseCard>

                <div className="p-6 bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <h4 className="mono text-[10px] uppercase font-black text-[var(--col-teal)] mb-4 flex items-center gap-2">
                        <Hash size={12}/> Популярные теги
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {['DND5E', 'PATHFINDER', 'САМОПИС', 'КАРТЫ', 'ЛОР', 'КРИТ'].map(tag => (
                            <span key={tag} className="px-2 py-1 bg-[var(--bg-main)] border border-[var(--border-color)] hover:border-[var(--col-teal)] transition-colors mono text-[8px] uppercase font-bold text-[var(--text-muted)] cursor-pointer">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Feed */}
            <div className="lg:col-span-3 space-y-6">
                <div className="flex gap-4 mb-6">
                    <SearchInput placeholder="ПОИСК ПО ФОРУМУ..." accentColor={ACCENT} className="max-w-md" />
                </div>

                {threads.map(thread => (
                    <div key={thread.id} className="group relative bg-[var(--bg-surface)] border-2 border-[var(--border-color)] p-6 hover:border-[var(--col-teal)] transition-all cursor-pointer">
                         {thread.hot && (
                             <div className="absolute -top-3 -right-3 bg-[var(--col-red)] text-white px-2 py-1 mono text-[9px] font-black uppercase rotate-3 shadow-lg">
                                 ГОРЯЧАЯ ТЕМА
                             </div>
                         )}
                         <div className="flex justify-between items-start mb-2">
                             <div className="space-y-1">
                                 <div className="flex gap-2 mb-2">
                                     {thread.tags.map(t => <Badge key={t} color="var(--col-teal)">{t}</Badge>)}
                                 </div>
                                 <h3 className="text-xl font-bold uppercase text-[var(--text-main)] group-hover:text-[var(--col-teal)] transition-colors">{thread.title}</h3>
                             </div>
                         </div>
                         
                         <p className="text-[var(--text-main)] opacity-60 mono text-xs mb-6 line-clamp-2 max-w-3xl">
                             {thread.preview}
                         </p>

                         <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
                             <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 bg-[var(--col-teal)] flex items-center justify-center font-black text-black text-[10px] uppercase">
                                     {thread.author[0]}
                                 </div>
                                 <span className="mono text-[10px] font-bold text-[var(--text-muted)] uppercase">@{thread.author}</span>
                             </div>

                             <div className="flex items-center gap-6 mono text-[10px] font-bold text-[var(--text-muted)]">
                                 <span className="flex items-center gap-2 hover:text-[var(--text-main)]"><MessageSquare size={14}/> {thread.replies}</span>
                                 <span className="flex items-center gap-2 hover:text-[var(--col-teal)]"><ThumbsUp size={14}/> {thread.likes}</span>
                                 <span className="flex items-center gap-2"><Eye size={14}/> {thread.views}</span>
                                 <span className="flex items-center gap-2 hover:text-[var(--text-main)]"><Share2 size={14}/></span>
                             </div>
                         </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
