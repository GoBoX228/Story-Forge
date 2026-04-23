
import React, { useState } from 'react';
import { SearchInput, Button } from './UI';
import { Send, Phone, Video, MoreVertical, Paperclip, Smile } from 'lucide-react';

const ACCENT = 'var(--col-blue)';

export const MessagesView: React.FC = () => {
  const [activeChat, setActiveChat] = useState<number | null>(1);
  const [inputText, setInputText] = useState('');

  const chats = [
    { id: 1, user: 'SILAS_THE_WISE', lastMsg: 'Ты подготовил статы для босса?', time: '14:20', unread: 2, status: 'online' },
    { id: 2, user: 'DUNGEON_GROUP_A', lastMsg: 'В пятницу в 19:00 все в силе?', time: 'ВЧЕРА', unread: 0, status: 'offline', group: true },
    { id: 3, user: 'ELF_QUEEN_88', lastMsg: 'Спасибо за игру!', time: '12.01', unread: 0, status: 'idle' },
  ];

  const messages = [
    { id: 1, sender: 'me', text: 'Привет! Как продвигается карта подземелья?', time: '14:15' },
    { id: 2, sender: 'SILAS_THE_WISE', text: 'Почти готово. Осталось расставить ловушки.', time: '14:18' },
    { id: 3, sender: 'SILAS_THE_WISE', text: 'Ты подготовил статы для босса?', time: '14:20' },
  ];

  return (
    <div className="h-full w-full flex bg-[var(--bg-main)] overflow-hidden">
      {/* Sidebar List */}
      <div className="w-80 bg-[var(--bg-surface)] border-r border-[var(--border-color)] flex flex-col">
          <div className="p-4 border-b border-[var(--border-color)]">
              <h2 className="mono text-xs uppercase font-black text-[var(--col-blue)] tracking-widest mb-4">КАНАЛЫ СВЯЗИ</h2>
              <SearchInput placeholder="ПОИСК..." accentColor={ACCENT} />
          </div>
          
          <div className="flex-1 overflow-y-auto">
              {chats.map(chat => (
                  <div 
                    key={chat.id} 
                    onClick={() => setActiveChat(chat.id)}
                    className={`p-4 border-b border-[var(--border-color)] cursor-pointer transition-all hover:bg-[var(--bg-main)] relative ${activeChat === chat.id ? 'bg-[var(--bg-main)]' : ''}`}
                  >
                      {activeChat === chat.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--col-blue)]" />}
                      
                      <div className="flex justify-between items-baseline mb-1">
                          <span className={`mono text-[10px] font-black uppercase truncate pr-2 ${activeChat === chat.id ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{chat.user}</span>
                          <span className="mono text-[8px] text-[var(--text-muted)] shrink-0 opacity-60">{chat.time}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                          <p className="text-[10px] text-[var(--text-muted)] truncate mono flex-1 min-w-0 pr-2">{chat.lastMsg}</p>
                          
                          {chat.unread > 0 && (
                              <div className="shrink-0 w-4 h-4 bg-[var(--col-blue)] text-white text-[8px] font-black flex items-center justify-center">
                                  {chat.unread}
                              </div>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[var(--bg-surface)] relative pattern-grid">
          {/* Header */}
          <div className="h-16 border-b border-[var(--border-color)] flex justify-between items-center px-6 bg-[var(--bg-surface)] shrink-0">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--col-blue)] flex items-center justify-center font-black text-white">S</div>
                  <div>
                      <div className="mono text-sm font-black uppercase text-[var(--text-main)]">SILAS_THE_WISE</div>
                      <div className="flex items-center gap-2 mono text-[8px] text-[var(--col-teal)] uppercase font-bold">
                          <span className="w-1.5 h-1.5 bg-[var(--col-teal)] animate-pulse"/> В СЕТИ
                      </div>
                  </div>
              </div>
              
              <div className="flex items-center gap-4 text-[var(--text-muted)]">
                  <button className="hover:text-[var(--text-main)] transition-colors"><Phone size={18}/></button>
                  <button className="hover:text-[var(--text-main)] transition-colors"><Video size={18}/></button>
                  <div className="w-[1px] h-6 bg-[var(--border-color)]" />
                  <button className="hover:text-[var(--text-main)] transition-colors"><MoreVertical size={18}/></button>
              </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[70%] p-4 border ${msg.sender === 'me' ? 'bg-[var(--col-blue)]/10 border-[var(--col-blue)] text-[var(--text-main)]' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-main)]'}`}>
                          <p className="mono text-xs leading-relaxed">{msg.text}</p>
                      </div>
                      <span className="mono text-[8px] text-[var(--text-muted)] mt-1 uppercase">{msg.time}</span>
                  </div>
              ))}
          </div>

          {/* Input */}
          <div className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border-color)] shrink-0">
              <div className="flex items-end gap-2 bg-[var(--input-bg)] border border-[var(--border-color)] p-2 focus-within:border-[var(--col-blue)] transition-colors">
                  <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"><Paperclip size={18}/></button>
                  <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="ВВЕДИТЕ СООБЩЕНИЕ..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-[var(--text-main)] mono text-xs py-2 resize-none max-h-32 placeholder:text-[var(--text-muted)]"
                    rows={1}
                  />
                  <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"><Smile size={18}/></button>
                  <button 
                    className="p-2 bg-[var(--col-blue)] text-white hover:bg-[var(--text-main)] hover:text-[var(--bg-main)] transition-colors"
                    onClick={() => setInputText('')}
                  >
                      <Send size={18}/>
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};
