import React, { useEffect, useMemo, useState } from 'react';
import type {
  EntityLibraryGroupId,
  EntityLibraryGroupRenderState,
  EntityLibraryItemId,
  EntityLibraryItemRenderState,
  EntityLibraryWorkspaceContext
} from './types';

export interface EntityLibraryWorkspaceProps<TItem, TGroup = never> {
  items: readonly TItem[];
  groups?: readonly TGroup[];
  getItemId: (item: TItem) => EntityLibraryItemId;
  getGroupId?: (group: TGroup) => Exclude<EntityLibraryGroupId, null>;
  selectedIds?: readonly EntityLibraryItemId[];
  cutItemIds?: readonly EntityLibraryItemId[];
  draggingItemIds?: readonly EntityLibraryItemId[];
  dragOverGroupId?: EntityLibraryGroupId;
  currentGroupId?: EntityLibraryGroupId;
  draggableItems?: boolean;
  renderItem: (item: TItem, state: EntityLibraryItemRenderState) => React.ReactNode;
  renderGroup?: (group: TGroup, state: EntityLibraryGroupRenderState) => React.ReactNode;
  onSelectItem?: (itemId: EntityLibraryItemId, item: TItem, event: React.MouseEvent) => void;
  onOpenItem?: (itemId: EntityLibraryItemId, item: TItem, event: React.MouseEvent) => void;
  onOpenGroup?: (groupId: Exclude<EntityLibraryGroupId, null>, group: TGroup, event: React.MouseEvent) => void;
  onClearSelection?: () => void;
  onWorkspaceContextMenu?: (context: EntityLibraryWorkspaceContext, event: React.MouseEvent) => void;
  onItemContextMenu?: (itemId: EntityLibraryItemId, item: TItem, event: React.MouseEvent) => void;
  onGroupContextMenu?: (groupId: Exclude<EntityLibraryGroupId, null>, group: TGroup, event: React.MouseEvent) => void;
  onItemDragStart?: (itemId: EntityLibraryItemId, item: TItem, event: React.DragEvent) => void;
  onItemDragEnd?: (itemId: EntityLibraryItemId, item: TItem, event: React.DragEvent) => void;
  onWorkspaceDragOver?: (groupId: EntityLibraryGroupId, event: React.DragEvent) => void;
  onWorkspaceDragLeave?: (groupId: EntityLibraryGroupId, event: React.DragEvent) => void;
  onWorkspaceDrop?: (groupId: EntityLibraryGroupId, event: React.DragEvent) => void;
  onGroupDragOver?: (groupId: Exclude<EntityLibraryGroupId, null>, group: TGroup, event: React.DragEvent) => void;
  onGroupDragLeave?: (groupId: Exclude<EntityLibraryGroupId, null>, group: TGroup, event: React.DragEvent) => void;
  onGroupDrop?: (groupId: Exclude<EntityLibraryGroupId, null>, group: TGroup, event: React.DragEvent) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  surface?: 'solid' | 'transparent';
  framed?: boolean;
  pageSize?: number;
  className?: string;
  gridClassName?: string;
  emptyClassName?: string;
}

export function EntityLibraryWorkspace<TItem, TGroup = never>({
  items,
  groups = [],
  getItemId,
  getGroupId,
  selectedIds = [],
  cutItemIds = [],
  draggingItemIds = [],
  dragOverGroupId = null,
  currentGroupId = null,
  draggableItems = false,
  renderItem,
  renderGroup,
  onSelectItem,
  onOpenItem,
  onOpenGroup,
  onClearSelection,
  onWorkspaceContextMenu,
  onItemContextMenu,
  onGroupContextMenu,
  onItemDragStart,
  onItemDragEnd,
  onWorkspaceDragOver,
  onWorkspaceDragLeave,
  onWorkspaceDrop,
  onGroupDragOver,
  onGroupDragLeave,
  onGroupDrop,
  emptyTitle = 'Материалов пока нет',
  emptyDescription = 'Нажмите правой кнопкой мыши по этой области, чтобы открыть доступные действия.',
  emptyAction,
  surface = 'solid',
  framed = false,
  pageSize = 12,
  className = '',
  gridClassName = '',
  emptyClassName = ''
}: EntityLibraryWorkspaceProps<TItem, TGroup>) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const cutSet = useMemo(() => new Set(cutItemIds), [cutItemIds]);
  const draggingSet = useMemo(() => new Set(draggingItemIds), [draggingItemIds]);
  const hasContent = groups.length > 0 || items.length > 0;
  const [page, setPage] = useState(1);
  const resolvedEmptyTitle = emptyTitle.startsWith('Р') ? 'Материалов пока нет' : emptyTitle;
  const resolvedEmptyDescription = emptyDescription.startsWith('Р')
    ? 'Нажмите правой кнопкой мыши по этой области, чтобы открыть доступные действия.'
    : emptyDescription;

  const entries = useMemo(() => {
    const groupEntries = groups.map((group) => ({
      kind: 'group' as const,
      group
    }));
    const itemEntries = items.map((item) => ({
      kind: 'item' as const,
      item
    }));

    return [...groupEntries, ...itemEntries];
  }, [groups, items]);

  const paginationKey = useMemo(() => {
    const groupKey = getGroupId
      ? groups.map((group) => getGroupId(group)).join('|')
      : groups.length.toString();
    const itemKey = items.map((item) => getItemId(item)).join('|');

    return `${groupKey}::${itemKey}`;
  }, [getGroupId, getItemId, groups, items]);

  useEffect(() => {
    setPage(1);
  }, [paginationKey]);

  const effectivePageSize = pageSize > 0 ? pageSize : entries.length || 1;
  const pageCount = Math.max(1, Math.ceil(entries.length / effectivePageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * effectivePageSize;
  const pagedEntries = entries.slice(pageStart, pageStart + effectivePageSize);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const handleWorkspaceContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onWorkspaceContextMenu) return;
    event.preventDefault();
    onWorkspaceContextMenu({ kind: 'workspace', x: event.clientX, y: event.clientY, groupId: currentGroupId }, event);
  };

  const handleWorkspaceClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClearSelection?.();
  };

  const handleWorkspaceDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    onWorkspaceDragOver?.(currentGroupId, event);
  };

  const handleWorkspaceDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    onWorkspaceDragLeave?.(currentGroupId, event);
  };

  const handleWorkspaceDrop = (event: React.DragEvent<HTMLDivElement>) => {
    onWorkspaceDrop?.(currentGroupId, event);
  };

  return (
    <section
      data-testid="entity-library-workspace"
      className={[
        'relative flex h-full min-h-0 w-full flex-col overflow-hidden text-[var(--text-main)]',
        surface === 'solid' ? 'bg-[var(--bg-main)]' : 'bg-transparent',
        framed ? 'min-h-[420px] border border-dashed border-[var(--border-color)]' : '',
        className
      ].filter(Boolean).join(' ')}
      onClick={handleWorkspaceClick}
      onContextMenu={handleWorkspaceContextMenu}
      onDragOver={handleWorkspaceDragOver}
      onDragLeave={handleWorkspaceDragLeave}
      onDrop={handleWorkspaceDrop}
    >
      {hasContent ? (
        <>
          <div
            className={[
              'grid flex-1 auto-rows-auto content-start items-stretch grid-cols-1 gap-x-5 gap-y-10 overflow-y-auto p-8 md:grid-cols-2 xl:grid-cols-3',
              gridClassName
            ].filter(Boolean).join(' ')}
            onClick={handleWorkspaceClick}
            onContextMenu={handleWorkspaceContextMenu}
            onDragOver={handleWorkspaceDragOver}
            onDragLeave={handleWorkspaceDragLeave}
            onDrop={handleWorkspaceDrop}
          >
            {pagedEntries.map((entry) => {
              if (entry.kind === 'group') {
                if (!getGroupId || !renderGroup) return null;
                const group = entry.group;
                const groupId = getGroupId(group);
                return (
                  <div
                    key={`group:${groupId}`}
                    data-testid={`entity-library-group-${groupId}`}
                    data-drag-over={dragOverGroupId === groupId ? 'true' : undefined}
                    className="min-w-0 self-stretch"
                    onDoubleClick={(event) => onOpenGroup?.(groupId, group, event)}
                    onContextMenu={(event) => {
                      if (!onGroupContextMenu) return;
                      event.preventDefault();
                      event.stopPropagation();
                      onGroupContextMenu(groupId, group, event);
                    }}
                    onDragOver={(event) => {
                      if (!onGroupDragOver) return;
                      event.stopPropagation();
                      onGroupDragOver(groupId, group, event);
                    }}
                    onDragLeave={(event) => {
                      if (!onGroupDragLeave) return;
                      event.stopPropagation();
                      onGroupDragLeave(groupId, group, event);
                    }}
                    onDrop={(event) => {
                      if (!onGroupDrop) return;
                      event.stopPropagation();
                      onGroupDrop(groupId, group, event);
                    }}
                  >
                    {renderGroup(group, { id: groupId, dragOver: dragOverGroupId === groupId })}
                  </div>
                );
              }

              const item = entry.item;
              const itemId = getItemId(item);
              const selected = selectedSet.has(itemId);
              const cut = cutSet.has(itemId);
              const dragging = draggingSet.has(itemId);

              return (
                <div
                  key={`item:${itemId}`}
                  data-testid={`entity-library-item-${itemId}`}
                  data-selected={selected ? 'true' : undefined}
                  data-cut={cut ? 'true' : undefined}
                  data-dragging={dragging ? 'true' : undefined}
                  className="min-w-0 self-stretch"
                  draggable={draggableItems}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectItem?.(itemId, item, event);
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    onOpenItem?.(itemId, item, event);
                  }}
                  onContextMenu={(event) => {
                    if (!onItemContextMenu) return;
                    event.preventDefault();
                    event.stopPropagation();
                    onItemContextMenu(itemId, item, event);
                  }}
                  onDragStart={(event) => {
                    if (!onItemDragStart) return;
                    onItemDragStart(itemId, item, event);
                  }}
                  onDragEnd={(event) => {
                    onItemDragEnd?.(itemId, item, event);
                  }}
                >
                  {renderItem(item, { id: itemId, selected, cut, dragging })}
                </div>
              );
            })}
          </div>
        {pageCount > 1 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] bg-[var(--bg-main)]/40 px-5 py-3">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-9 border border-[var(--border-color)] px-3 mono text-[0px] font-black uppercase text-[var(--text-muted)] transition-colors hover:border-[var(--text-main)] hover:text-[var(--text-main)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span className="text-[9px]">Назад</span>
              Назад
            </button>
            <div className="mono text-[0px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <span className="text-[9px]">Страница {currentPage} из {pageCount}</span>
              Страница {currentPage} из {pageCount}
            </div>
            <button
              type="button"
              disabled={currentPage >= pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              className="h-9 border border-[var(--border-color)] px-3 mono text-[0px] font-black uppercase text-[var(--text-muted)] transition-colors hover:border-[var(--text-main)] hover:text-[var(--text-main)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span className="text-[9px]">Вперед</span>
              Вперед
            </button>
          </div>
        )}
        </>
      ) : (
        <div
          className={[
            'flex h-full min-h-[360px] flex-1 items-center justify-center p-8 text-center',
            framed ? '' : 'border-2 border-dashed border-[var(--border-color)]',
            emptyClassName
          ].filter(Boolean).join(' ')}
          onContextMenu={handleWorkspaceContextMenu}
          onDragOver={handleWorkspaceDragOver}
          onDragLeave={handleWorkspaceDragLeave}
          onDrop={handleWorkspaceDrop}
        >
          <div className="max-w-lg space-y-4">
            <div className="mono text-[15px] uppercase font-black tracking-[0.12em] text-[var(--text-main)]">{resolvedEmptyTitle}</div>
            <p className="mono text-[10px] uppercase leading-relaxed text-[var(--text-muted)]">{resolvedEmptyDescription}</p>
            {emptyAction}
          </div>
        </div>
      )}
    </section>
  );
}
