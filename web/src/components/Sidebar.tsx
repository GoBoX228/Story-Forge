
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  onLogout?: () => void;
  isAdmin?: boolean;
}

const Sidebar = React.memo<SidebarProps>(({ 
  activeView, 
  setActiveView, 
  showNotifications, 
  setShowNotifications,
  onLogout,
  isAdmin = false
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Определение цвета для каждого раздела
  const getSectionColor = (id: string) => {
    switch (id) {
      case 'scenarios': return '#E63946'; // Red
      case 'maps': return '#FFFFFF';      // White
      case 'characters': return '#FFC300'; // Yellow
      case 'items': return '#4361EE';     // Blue
      case 'assets': return '#2EC4B6';    // Teal
      case 'world': return '#8338EC';     // Purple
      case 'campaigns': return '#8338EC'; // Purple
      case 'dashboard': return '#E63946'; // Brand Red
      case 'settings': return '#6C757D';  // Grey
      case 'guide': return '#FFFFFF';     // White
      case 'admin': return '#E63946';     // Admin
      default: return '#E63946';
    }
  };

  const mainItems = [
    { id: 'dashboard', label: 'Дашборд', icon: ICONS.Dashboard },
    { id: 'scenarios', label: 'Сценарии', icon: ICONS.Scenario },
    { id: 'characters', label: 'Персонажи', icon: ICONS.Characters },
    { id: 'maps', label: 'Карты', icon: ICONS.Map },
    { id: 'items', label: 'Предметы', icon: ICONS.Items },
    { id: 'assets', label: 'Ассеты', icon: ICONS.Assets },
    { id: 'world', label: 'Мир', icon: ICONS.World },
    { id: 'campaigns', label: 'Кампании', icon: ICONS.Campaigns },
  ];

  const accountItems = [
    { id: 'profile', label: 'Профиль', icon: ICONS.Profile },
  ];

  const systemItems = [
    { id: 'settings', label: 'Настройки', icon: ICONS.Settings },
    { id: 'guide', label: 'Руководство', icon: ICONS.Guide },
  ];

  const renderItem = (item: { id: string; label: string; icon: React.ReactNode }) => {
    const isActive = activeView === item.id;
    const isHovered = hoveredItem === item.id;
    const accentColor = getSectionColor(item.id);

    return (
      <button
        key={item.id}
        onClick={() => setActiveView(item.id)}
        onMouseEnter={() => setHoveredItem(item.id)}
        onMouseLeave={() => setHoveredItem(null)}
        title={isCollapsed ? item.label : undefined}
        className={`w-full py-4 flex items-center transition-all duration-200 group relative
          ${isActive ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}
          ${isCollapsed ? 'justify-center px-0' : 'px-8 gap-4'}
        `}
      >
        {isActive && (
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 transition-colors duration-300" 
            style={{ backgroundColor: accentColor }}
          />
        )}
        
        <span 
          className="transition-colors duration-200"
          style={{ 
            color: isActive ? accentColor : (isHovered ? accentColor : undefined) 
          }}
        >
          {item.icon}
        </span>
        
        {!isCollapsed && (
          <span 
            className="mono text-xs uppercase tracking-widest font-medium transition-colors duration-200 whitespace-nowrap overflow-hidden"
            style={{ 
              color: isActive || isHovered ? 'var(--text-main)' : undefined 
            }}
          >
            {item.label}
          </span>
        )}
      </button>
    );
  };

  return (
    <div 
      className={`bg-[var(--bg-main)] border-r border-[var(--border-color)] flex flex-col h-full z-[60] transition-all duration-300 ease-in-out shrink-0
      ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      <div className={`p-6 border-b border-[var(--border-color)] flex items-center transition-all duration-300 ${isCollapsed ? 'flex-col gap-4 justify-center px-2' : 'justify-between'}`}>
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveView('dashboard')}
          title="Дашборд"
        >
          <div className="w-8 h-8 shrink-0 bg-[#E63946] flex items-center justify-center font-bold mono group-hover:bg-[#FFC300] transition-colors text-white">К</div>
          {!isCollapsed && (
            <span className="font-bold tracking-[0.1em] uppercase text-[10px] group-hover:text-[#FFC300] transition-colors hidden xl:block leading-none text-left text-[var(--text-main)]">
              КУЗНИЦА<br/>ИСТОРИЙ
            </span>
          )}
        </div>

        {/* Tech Style Notification Button */}
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className={`
            relative w-10 h-10 shrink-0 flex items-center justify-center transition-all duration-200 group
            ${showNotifications 
              ? 'bg-[var(--text-main)] text-[var(--bg-main)]' 
              : 'bg-transparent text-[var(--text-muted)] hover:text-[#E63946]'}
          `}
          title="Уведомления"
        >
          {ICONS.Notifications}
          {!showNotifications && (
            <div className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-[#E63946] shadow-[0_0_8px_#E63946]" />
          )}
        </button>
      </div>
      
      <nav className="flex-1 py-8 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide">
        {mainItems.map(renderItem)}
        
        {/* Separator Line */}
        <div className={`my-4 transition-all duration-300 ${isCollapsed ? 'px-4' : 'px-8'}`}>
          <div className="h-[1px] w-full bg-[var(--border-color)]" />
        </div>

        {accountItems.map(renderItem)}

        <div className={`my-4 transition-all duration-300 ${isCollapsed ? 'px-4' : 'px-8'}`}>
          <div className="h-[1px] w-full bg-[var(--border-color)]" />
        </div>
        
        {systemItems.map(renderItem)}

        {isAdmin && (
          <button
            onClick={() => setActiveView('admin')}
            className={`w-full py-3 flex items-center transition-all duration-200 group border border-[var(--border-color)] mt-4
              ${activeView === 'admin'
                ? 'text-[var(--col-red)] border-[var(--col-red)] bg-[var(--col-red)]/10'
                : 'text-[var(--text-muted)] hover:text-[var(--col-red)] hover:border-[var(--col-red)] hover:bg-[var(--col-red)]/5'}
              ${isCollapsed ? 'justify-center px-0' : 'px-8 gap-4'}
            `}
            title="Админ"
          >
            {ICONS.Admin}
            {!isCollapsed && (
              <span className="mono text-xs uppercase tracking-widest font-medium whitespace-nowrap">
                АДМИН
              </span>
            )}
          </button>
        )}

        {/* LOGOUT BUTTON */}
        <button
          onClick={onLogout}
          className={`w-full py-4 flex items-center transition-all duration-200 group text-[var(--text-muted)] hover:text-[var(--col-red)] hover:bg-[var(--col-red)]/5
            ${isCollapsed ? 'justify-center px-0' : 'px-8 gap-4'}
          `}
          title="Выйти"
        >
          <LogOut size={20} />
          {!isCollapsed && (
            <span className="mono text-xs uppercase tracking-widest font-medium whitespace-nowrap">
              ВЫЙТИ
            </span>
          )}
        </button>
      </nav>
      
      <div className={`p-4 border-t border-[var(--border-color)] flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="text-[10px] mono text-[var(--text-muted)] uppercase tracking-tighter whitespace-nowrap">
            Версия 1.0.0
          </div>
        )}
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-2"
          title={isCollapsed ? "Развернуть" : "Свернуть"}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
    </div>
  );
});

export default Sidebar;
