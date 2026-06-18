import { useMemo, useState } from 'react';
import type React from 'react';
import type { EntityLibraryItemId, EntityLibrarySelectionState } from './types';

export type EntityLibrarySelectionMode = 'single' | 'multi';

export interface UseEntityLibrarySelectionOptions {
  initialSelectedIds?: EntityLibraryItemId[];
  mode?: EntityLibrarySelectionMode;
}

export interface UseEntityLibrarySelectionResult extends EntityLibrarySelectionState {
  setSelectedIds: React.Dispatch<React.SetStateAction<EntityLibraryItemId[]>>;
  clearSelection: () => void;
  replaceSelection: (itemId: EntityLibraryItemId | EntityLibraryItemId[]) => void;
  toggleSelection: (itemId: EntityLibraryItemId) => void;
  selectRange: (itemId: EntityLibraryItemId, orderedItemIds: readonly EntityLibraryItemId[]) => void;
  selectFromEvent: (
    itemId: EntityLibraryItemId,
    event: Pick<React.MouseEvent, 'ctrlKey' | 'metaKey' | 'shiftKey'>,
    orderedItemIds?: readonly EntityLibraryItemId[]
  ) => void;
  pruneSelection: (validItemIds: readonly EntityLibraryItemId[]) => void;
  getActionTargetIds: (itemId?: EntityLibraryItemId | null) => EntityLibraryItemId[];
}

const uniqueIds = (itemIds: readonly EntityLibraryItemId[]): EntityLibraryItemId[] =>
  Array.from(new Set(itemIds));

export function useEntityLibrarySelection({
  initialSelectedIds = [],
  mode = 'multi'
}: UseEntityLibrarySelectionOptions = {}): UseEntityLibrarySelectionResult {
  const [selectedIds, setSelectedIds] = useState<EntityLibraryItemId[]>(initialSelectedIds);
  const [anchorId, setAnchorId] = useState<EntityLibraryItemId | null>(initialSelectedIds[0] ?? null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const isSelected = (itemId: EntityLibraryItemId) => selectedSet.has(itemId);

  const clearSelection = () => {
    setSelectedIds([]);
    setAnchorId(null);
  };

  const replaceSelection = (itemId: EntityLibraryItemId | EntityLibraryItemId[]) => {
    const nextIds = uniqueIds(Array.isArray(itemId) ? itemId : [itemId]);
    setSelectedIds(nextIds);
    setAnchorId(nextIds[0] ?? null);
  };

  const toggleSelection = (itemId: EntityLibraryItemId) => {
    setSelectedIds((current) => {
      if (mode === 'single') {
        const next = current.includes(itemId) ? [] : [itemId];
        setAnchorId(next[0] ?? null);
        return next;
      }

      const next = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];
      setAnchorId(itemId);
      return next;
    });
  };

  const selectRange = (itemId: EntityLibraryItemId, orderedItemIds: readonly EntityLibraryItemId[]) => {
    if (mode === 'single') {
      replaceSelection(itemId);
      return;
    }

    const fallbackAnchor = selectedIds[selectedIds.length - 1] ?? itemId;
    const startId = anchorId ?? fallbackAnchor;
    const startIndex = orderedItemIds.indexOf(startId);
    const endIndex = orderedItemIds.indexOf(itemId);

    if (startIndex < 0 || endIndex < 0) {
      replaceSelection(itemId);
      return;
    }

    const from = Math.min(startIndex, endIndex);
    const to = Math.max(startIndex, endIndex);
    setSelectedIds(uniqueIds(orderedItemIds.slice(from, to + 1)));
    setAnchorId(startId);
  };

  const selectFromEvent = (
    itemId: EntityLibraryItemId,
    event: Pick<React.MouseEvent, 'ctrlKey' | 'metaKey' | 'shiftKey'>,
    orderedItemIds: readonly EntityLibraryItemId[] = []
  ) => {
    if (mode === 'multi' && event.shiftKey && orderedItemIds.length > 0) {
      selectRange(itemId, orderedItemIds);
      return;
    }

    if (mode === 'multi' && (event.ctrlKey || event.metaKey)) {
      toggleSelection(itemId);
      return;
    }

    replaceSelection(itemId);
  };

  const pruneSelection = (validItemIds: readonly EntityLibraryItemId[]) => {
    const validSet = new Set(validItemIds);
    setSelectedIds((current) => {
      const next = current.filter((id) => validSet.has(id));
      if (next.length === current.length) return current;
      if (anchorId && !next.includes(anchorId)) setAnchorId(next[0] ?? null);
      return next;
    });
  };

  const getActionTargetIds = (itemId?: EntityLibraryItemId | null) => {
    if (itemId && selectedSet.has(itemId) && selectedIds.length > 0) return selectedIds;
    if (itemId) return [itemId];
    return selectedIds;
  };

  return {
    selectedIds,
    selectedSet,
    isSelected,
    setSelectedIds,
    clearSelection,
    replaceSelection,
    toggleSelection,
    selectRange,
    selectFromEvent,
    pruneSelection,
    getActionTargetIds
  };
}
