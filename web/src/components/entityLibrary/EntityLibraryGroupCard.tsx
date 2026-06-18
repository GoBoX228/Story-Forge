import React from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';

export interface EntityLibraryGroupCardProps {
  name: string;
  nameContent?: React.ReactNode;
  typeLabel?: React.ReactNode;
  count?: number;
  countLabel?: React.ReactNode;
  accentColor?: string;
  className?: string;
  selected?: boolean;
  dragOver?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const EntityLibraryGroupCard = React.memo<EntityLibraryGroupCardProps>(({
  name,
  nameContent,
  typeLabel,
  count,
  countLabel,
  accentColor = 'var(--col-red)',
  className = '',
  selected = false,
  dragOver = false,
  disabled = false,
  loading = false,
  onClick,
  onDoubleClick,
  onContextMenu
}) => {
  const style = {
    '--entity-library-accent': accentColor,
    ...(selected || dragOver ? { borderColor: accentColor } : {})
  } as React.CSSProperties;

  return (
    <div
      role="button"
      tabIndex={disabled ? undefined : 0}
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
        'relative flex h-full min-h-[180px] max-h-[420px] min-w-0 flex-col gap-6 overflow-visible border-2 border-[var(--border-color)] bg-[var(--bg-card)] p-5 outline-none transition-colors hover:border-[var(--entity-library-accent)]',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        dragOver ? 'bg-[var(--entity-library-accent)]/10' : '',
        selected ? 'ring-2 ring-[var(--entity-library-accent)] ring-offset-2 ring-offset-[var(--bg-main)]' : '',
        className
      ].filter(Boolean).join(' ')}
      style={style}
    >
      <div className="flex items-start justify-between gap-3">
        <FolderOpen size={36} style={{ color: accentColor }} />
        {typeof count === 'number' && (
          <span className="mono text-[9px] uppercase text-[var(--text-muted)]">{count}</span>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        {nameContent ?? (
          <div className="mono truncate text-[14px] font-black uppercase text-[var(--text-main)]">
            {name}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-color)] pt-3">
          {typeLabel && <span className="mono text-[8px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{typeLabel}</span>}
          {countLabel && <span className="mono ml-auto text-[8px] font-black uppercase tracking-[0.16em] text-[var(--text-main)]">{countLabel}</span>}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center border-2 border-[var(--border-color-hover)] bg-[var(--bg-main)]/70">
          <Loader2 size={18} className="animate-spin text-[var(--text-main)]" />
        </div>
      )}
    </div>
  );
});
