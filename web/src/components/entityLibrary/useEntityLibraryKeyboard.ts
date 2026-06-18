import { useEffect } from 'react';
import type { EntityLibraryItemId } from './types';

export interface UseEntityLibraryKeyboardOptions {
  enabled?: boolean;
  contextMenuOpen?: boolean;
  onCloseContextMenu?: () => void;
  renameActive?: boolean;
  onCancelRename?: () => void;
  selectedIds?: readonly EntityLibraryItemId[];
  onClearSelection?: () => void;
  moveBufferCount?: number;
  onCancelMoveBuffer?: () => void;
  onOpenSelected?: (itemId: EntityLibraryItemId) => void;
  onDeleteSelected?: (itemId: EntityLibraryItemId) => void;
}

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement
    && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));

export function useEntityLibraryKeyboard({
  enabled = true,
  contextMenuOpen = false,
  onCloseContextMenu,
  renameActive = false,
  onCancelRename,
  selectedIds = [],
  onClearSelection,
  moveBufferCount = 0,
  onCancelMoveBuffer,
  onOpenSelected,
  onDeleteSelected
}: UseEntityLibraryKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === 'Escape') {
        if (contextMenuOpen && onCloseContextMenu) {
          event.preventDefault();
          onCloseContextMenu();
          return;
        }
        if (renameActive && onCancelRename) {
          event.preventDefault();
          onCancelRename();
          return;
        }
        if (selectedIds.length > 0 && onClearSelection) {
          event.preventDefault();
          onClearSelection();
          return;
        }
        if (moveBufferCount > 0 && onCancelMoveBuffer) {
          event.preventDefault();
          onCancelMoveBuffer();
        }
        return;
      }

      if (event.key === 'Enter' && selectedIds.length === 1 && onOpenSelected) {
        event.preventDefault();
        onOpenSelected(selectedIds[0]);
        return;
      }

      if (event.key === 'Delete' && selectedIds.length === 1 && onDeleteSelected) {
        event.preventDefault();
        onDeleteSelected(selectedIds[0]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    contextMenuOpen,
    enabled,
    moveBufferCount,
    onCancelMoveBuffer,
    onCancelRename,
    onClearSelection,
    onCloseContextMenu,
    onDeleteSelected,
    onOpenSelected,
    renameActive,
    selectedIds
  ]);
}
