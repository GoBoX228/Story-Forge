import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import type {
  EntityLibraryContext,
  EntityLibraryGroupId,
  EntityLibraryItemId
} from './types';

export interface UseEntityLibraryContextMenuResult {
  contextMenu: EntityLibraryContext | null;
  setContextMenu: React.Dispatch<React.SetStateAction<EntityLibraryContext | null>>;
  closeContextMenu: () => void;
  openWorkspaceMenu: (event: React.MouseEvent, groupId?: EntityLibraryGroupId) => void;
  openItemMenu: (event: React.MouseEvent, itemId: EntityLibraryItemId, groupId?: EntityLibraryGroupId) => void;
  openGroupMenu: (event: React.MouseEvent, groupId: Exclude<EntityLibraryGroupId, null>) => void;
}

export function useEntityLibraryContextMenu(): UseEntityLibraryContextMenuResult {
  const [contextMenu, setContextMenu] = useState<EntityLibraryContext | null>(null);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const openWorkspaceMenu = (event: React.MouseEvent, groupId: EntityLibraryGroupId = null) => {
    event.preventDefault();
    setContextMenu({ kind: 'workspace', x: event.clientX, y: event.clientY, groupId });
  };

  const openItemMenu = (
    event: React.MouseEvent,
    itemId: EntityLibraryItemId,
    groupId: EntityLibraryGroupId = null
  ) => {
    event.preventDefault();
    setContextMenu({ kind: 'item', x: event.clientX, y: event.clientY, itemId, groupId });
  };

  const openGroupMenu = (event: React.MouseEvent, groupId: Exclude<EntityLibraryGroupId, null>) => {
    event.preventDefault();
    setContextMenu({ kind: 'group', x: event.clientX, y: event.clientY, groupId });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeContextMenu();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeContextMenu]);

  return {
    contextMenu,
    setContextMenu,
    closeContextMenu,
    openWorkspaceMenu,
    openItemMenu,
    openGroupMenu
  };
}

