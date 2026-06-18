import React from 'react';
import { Loader2 } from 'lucide-react';
import { BaseCard } from '../BaseCard';

export interface EntityLibraryCardProps {
  title?: React.ReactNode;
  accentColor?: string;
  children: React.ReactNode;
  className?: string;
  headerExtra?: React.ReactNode;
  selected?: boolean;
  cut?: boolean;
  dragging?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const EntityLibraryCard = React.memo<EntityLibraryCardProps>(({
  title,
  accentColor = 'var(--col-red)',
  children,
  className = '',
  headerExtra,
  selected = false,
  cut = false,
  dragging = false,
  disabled = false,
  loading = false,
  onClick,
  onDoubleClick,
  onContextMenu
}) => {
  return (
    <div
      role={onClick || onDoubleClick ? 'button' : undefined}
      tabIndex={disabled || (!onClick && !onDoubleClick) ? undefined : 0}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      onDoubleClick={disabled ? undefined : onDoubleClick}
      onContextMenu={disabled ? undefined : onContextMenu}
      onKeyDown={(event) => {
        if (disabled || !onDoubleClick) return;
        if (event.key === 'Enter') {
          event.preventDefault();
          onDoubleClick(event as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }}
      className={[
        'relative h-[420px] min-h-[420px] max-h-[420px] min-w-0 overflow-visible outline-none',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        cut ? 'opacity-55 grayscale' : '',
        dragging ? 'opacity-40' : '',
        selected ? 'ring-2 ring-[var(--text-main)] ring-offset-2 ring-offset-[var(--bg-main)]' : '',
        className
      ].filter(Boolean).join(' ')}
    >
      <BaseCard title={title} accentColor={accentColor} headerExtra={headerExtra} className="h-full">
        {children}
      </BaseCard>
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-main)]/70 border-2 border-[var(--border-color-hover)]">
          <Loader2 size={18} className="animate-spin text-[var(--text-main)]" />
        </div>
      )}
    </div>
  );
});
