
import React from 'react';

interface BaseCardProps {
  title?: string;
  accentColor?: string;
  children: React.ReactNode;
  className?: string;
  headerExtra?: React.ReactNode;
}

export const BaseCard = React.memo<BaseCardProps>(({ 
  title, 
  accentColor = 'var(--col-blue)', 
  children, 
  className = '',
  headerExtra
}) => {
  return (
    <div 
      className={`
        bauhaus-card bg-[var(--bg-surface)] border-2 border-[var(--border-color)] relative overflow-hidden flex flex-col h-full 
        transition-all duration-300 ease-out group/card
        hover:-translate-y-1.5 hover:-translate-x-1.5 hover:border-[var(--border-color-hover)]
        ${className}
      `}
      style={{ 
        ['--card-accent' as any]: accentColor 
      }}
    >
      <style>{`
        .bauhaus-card:hover {
          /* Use color-mix to add opacity to CSS variables */
          box-shadow: 8px 8px 0px 0px color-mix(in srgb, var(--card-accent) 20%, transparent);
        }
      `}</style>

      {/* Левая акцентная полоса с анимацией толщины */}
      <div 
        className="absolute top-0 left-0 w-1.5 h-full z-10 transition-all duration-300 group-hover/card:w-2" 
        style={{ backgroundColor: 'var(--card-accent)' }} 
      />
      
      {/* Заголовок карточки с эффектом подсветки при наведении */}
      {title && (
        <div className="pl-6 pr-4 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]/20 transition-colors group-hover/card:bg-[var(--bg-main)]/40">
          <h3 className="mono text-[10px] uppercase font-black tracking-[0.2em] text-[var(--text-main)]/70 group-hover/card:text-[var(--text-main)] truncate transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-3">
            {headerExtra}
            {/* Декоративный квадрат — вращается при наведении на карточку */}
            <div 
              className="w-3 h-3 transition-transform duration-500 group-hover/card:rotate-90" 
              style={{ backgroundColor: 'var(--card-accent)' }} 
            />
          </div>
        </div>
      )}

      {/* Основной контент */}
      <div className={`px-6 py-5 flex-1 flex flex-col`}>
        {children}
      </div>
    </div>
  );
});
