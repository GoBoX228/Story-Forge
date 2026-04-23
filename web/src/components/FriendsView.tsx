
import React from 'react';
import { SectionHeader, Button, SearchInput } from './UI';
import { BaseCard } from './BaseCard';
import { UserPlus, MessageCircle, MoreVertical, Wifi, Clock } from 'lucide-react';

const ACCENT = 'var(--col-pink)';

export const FriendsView: React.FC = () => {
  const friends = [
    { id: 1, name: 'SILAS_THE_WISE', status: 'online', activity: 'Редактирует: Башня Мага', avatar: 'S' },
    { id: 2, name: 'CRITICAL_MISS', status: 'idle', activity: 'Отошел на 15м', avatar: 'C' },
    { id: 3, name: 'BARBARIAN_DAVE', status: 'offline', activity: 'Был в сети 2ч назад', avatar: 'B' },
    { id: 4, name: 'ELF_QUEEN_88', status: 'online', activity: 'В игре: Закат Пылающих Песков', avatar: 'E' },
  ];

  const requests = [
    { id: 5, name: 'NEW_PLAYER_01', avatar: 'N' }
  ];

  return (
    <div className="h-full overflow-auto bauhaus-bg p-12">
      <div className="max-w-6xl mx-auto">
        <SectionHeader 
            title="СОЮЗНИКИ" 
            subtitle="СПИСОК ДРУЗЕЙ И ЗАПРОСЫ" 
            accentColor={ACCENT} 
            actions={
                <div className="flex gap-4">
                    <SearchInput placeholder="ПОИСК ПО ID..." accentColor={ACCENT} />
                    <Button color="pink" size="lg">
                        <UserPlus size={18} /> ДОБАВИТЬ
                    </Button>
                </div>
            }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-4 border-b border-[var(--border-color)] pb-4">
                    <span className="mono text-[10px] uppercase font-black text-[var(--col-pink)]">В СЕТИ ({friends.filter(f => f.status !== 'offline').length})</span>
                    <span className="mono text-[10px] uppercase font-black text-[var(--text-muted)]">ВСЕ ({friends.length})</span>
                    <span className="mono text-[10px] uppercase font-black text-[var(--text-muted)]">ЗАБЛОКИРОВАННЫЕ (0)</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {friends.map(friend => (
                        <div key={friend.id} className="group bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 flex items-center justify-between hover:border-[var(--col-pink)] transition-all">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 bg-[var(--input-bg)] flex items-center justify-center font-black text-xl text-[var(--text-main)] border border-[var(--border-color)]">
                                        {friend.avatar}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-[var(--bg-surface)] ${
                                        friend.status === 'online' ? 'bg-[var(--col-teal)]' : 
                                        friend.status === 'idle' ? 'bg-[var(--col-yellow)]' : 'bg-[var(--col-grey)]'
                                    }`} />
                                </div>
                                <div>
                                    <div className="mono text-sm font-black uppercase text-[var(--text-main)] group-hover:text-[var(--col-pink)] transition-colors">
                                        {friend.name}
                                    </div>
                                    <div className="flex items-center gap-2 mono text-[9px] font-bold text-[var(--text-muted)] uppercase mt-1">
                                        {friend.status === 'online' ? <Wifi size={10}/> : <Clock size={10}/>}
                                        {friend.activity}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="w-8 h-8 flex items-center justify-center border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-main)] hover:bg-[var(--bg-main)] transition-all">
                                    <MessageCircle size={14} />
                                </button>
                                <button className="w-8 h-8 flex items-center justify-center border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-main)] hover:bg-[var(--bg-main)] transition-all">
                                    <MoreVertical size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                <BaseCard title="ВХОДЯЩИЕ ЗАПРОСЫ" accentColor="var(--col-yellow)">
                    <div className="space-y-4">
                        {requests.length > 0 ? requests.map(req => (
                            <div key={req.id} className="flex flex-col gap-3 p-3 bg-[var(--bg-main)] border border-dashed border-[var(--border-color)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-[var(--col-yellow)] text-black flex items-center justify-center font-bold text-sm">
                                        {req.avatar}
                                    </div>
                                    <span className="mono text-[10px] font-bold text-[var(--text-main)]">{req.name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button className="flex-1 py-1 bg-[var(--col-pink)] text-white mono text-[8px] font-black uppercase hover:bg-[var(--text-main)] hover:text-[var(--text-inverted)] transition-colors">ПРИНЯТЬ</button>
                                    <button className="flex-1 py-1 border border-[var(--border-color)] text-[var(--text-main)] mono text-[8px] font-black uppercase hover:bg-[var(--bg-surface)]">ОТКЛОНИТЬ</button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 mono text-[9px] text-[var(--text-muted)] uppercase">НЕТ НОВЫХ ЗАПРОСОВ</div>
                        )}
                    </div>
                </BaseCard>

                <div className="p-6 bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <h4 className="mono text-[10px] uppercase font-black text-[var(--text-muted)] mb-4">ВАША ССЫЛКА ПРИГЛАШЕНИЯ</h4>
                    <div className="flex">
                        <input readOnly value="forge.net/u/gm_master" className="bg-[var(--input-bg)] border border-[var(--border-color)] px-3 py-2 text-[9px] mono text-[var(--text-muted)] w-full focus:outline-none" />
                        <button className="px-3 border border-l-0 border-[var(--border-color)] hover:bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">КОПИРОВАТЬ</button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
