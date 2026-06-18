import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { EntityLibraryActionSection, EntityLibraryContext } from './types';

export interface EntityLibraryContextMenuProps {
  context: EntityLibraryContext | null;
  sections: EntityLibraryActionSection[];
  onClose: () => void;
  accentColor?: string;
  className?: string;
}

export const EntityLibraryContextMenu: React.FC<EntityLibraryContextMenuProps> = ({
  context,
  sections,
  onClose,
  accentColor = 'var(--col-red)',
  className = ''
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!context) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [context, onClose]);

  useEffect(() => {
    if (!context) return;
    setPosition({ left: context.x, top: context.y });
  }, [context]);

  useLayoutEffect(() => {
    if (!context || !menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const margin = 12;
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);

    setPosition({
      left: Math.min(Math.max(context.x, margin), maxLeft),
      top: Math.min(Math.max(context.y, margin), maxTop)
    });
  }, [context, sections]);

  if (!context) return null;

  const visibleSections = sections
    .map((section) => ({ ...section, actions: section.actions.filter((action) => !action.hidden) }))
    .filter((section) => section.actions.length > 0);

  if (visibleSections.length === 0) return null;

  const menuStyle = {
    left: position.left,
    top: position.top,
    '--entity-library-menu-accent': accentColor
  } as React.CSSProperties;

  return (
    <div
      ref={menuRef}
      data-testid="entity-library-context-menu"
      className={[
        'fixed z-[500] w-56 border border-[var(--border-color)] bg-[#050505] text-[var(--text-main)] shadow-2xl',
        className
      ].filter(Boolean).join(' ')}
      style={menuStyle}
      onContextMenu={(event) => event.preventDefault()}
    >
      {visibleSections.map((section, sectionIndex) => (
        <div key={section.id ?? sectionIndex}>
          {section.label && (
            <div className="border-b border-[var(--border-color)] px-3 py-2 mono text-[9px] uppercase font-black text-[var(--text-muted)]">
              {section.label}
            </div>
          )}
          {sectionIndex > 0 && !section.label && <div className="border-t border-[var(--border-color)]" />}
          <div>
            {section.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                data-testid={`entity-library-action-${action.id}`}
                data-action-id={action.id}
                disabled={action.disabled}
                onClick={() => {
                  if (action.disabled) return;
                  action.onSelect(context);
                  onClose();
                }}
                className={[
                  'flex w-full items-center gap-2 px-3 py-2 text-left mono text-[10px] uppercase font-black transition-colors',
                  action.disabled ? 'cursor-not-allowed opacity-40' : '',
                  action.destructive && !action.disabled
                    ? 'text-[var(--text-main)] hover:bg-[var(--col-red)]/10 hover:text-[var(--col-red)]'
                    : 'text-[var(--text-main)] hover:bg-[var(--entity-library-menu-accent)]/10 hover:text-[var(--entity-library-menu-accent)]'
                ].filter(Boolean).join(' ')}
              >
                {action.icon && <span className="shrink-0">{action.icon}</span>}
                <span className="truncate">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
