import Image from 'next/image';
import React from 'react';

export interface EntityLibraryMediaSlotProps {
  src?: string | null;
  alt?: string;
  emptyLabel: string;
  accentColor?: string;
  children?: React.ReactNode;
  className?: string;
}

export const EntityLibraryMediaSlot = React.memo<EntityLibraryMediaSlotProps>(({
  src,
  alt = '',
  emptyLabel,
  accentColor = 'var(--border-color-hover)',
  children,
  className = ''
}) => {
  return (
    <div
      className={[
        'relative h-28 shrink-0 overflow-hidden border bg-black/35',
        'flex items-center justify-center pattern-grid',
        className
      ].filter(Boolean).join(' ')}
      style={{ borderColor: accentColor }}
    >
      {children ?? (
        src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="320px"
            unoptimized
            className="object-cover"
          />
        ) : (
          <span className="mono px-3 text-center text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {emptyLabel}
          </span>
        )
      )}
    </div>
  );
});
