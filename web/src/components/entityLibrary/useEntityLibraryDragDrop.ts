import { useMemo, useState } from 'react';
import type React from 'react';
import type { EntityLibraryGroupId, EntityLibraryItemId } from './types';

export interface EntityLibraryDropPayload {
  itemIds: EntityLibraryItemId[];
  targetGroupId: EntityLibraryGroupId;
}

export interface UseEntityLibraryDragDropOptions {
  getDragItemIds: (itemId: EntityLibraryItemId) => EntityLibraryItemId[];
  onDropItems: (payload: EntityLibraryDropPayload) => void | Promise<void>;
}

export interface UseEntityLibraryDragDropResult {
  draggingIds: EntityLibraryItemId[];
  draggingSet: ReadonlySet<EntityLibraryItemId>;
  dragOverGroupId: EntityLibraryGroupId;
  isDragging: boolean;
  isDraggingItem: (itemId: EntityLibraryItemId) => boolean;
  isGroupDragOver: (groupId: EntityLibraryGroupId) => boolean;
  handleItemDragStart: (itemId: EntityLibraryItemId, event: React.DragEvent) => void;
  handleItemDragEnd: () => void;
  handleWorkspaceDragOver: (groupId: EntityLibraryGroupId, event: React.DragEvent) => void;
  handleWorkspaceDragLeave: (groupId: EntityLibraryGroupId, event: React.DragEvent) => void;
  handleWorkspaceDrop: (groupId: EntityLibraryGroupId, event: React.DragEvent) => void;
  handleGroupDragOver: (groupId: Exclude<EntityLibraryGroupId, null>, event: React.DragEvent) => void;
  handleGroupDragLeave: (groupId: Exclude<EntityLibraryGroupId, null>, event: React.DragEvent) => void;
  handleGroupDrop: (groupId: Exclude<EntityLibraryGroupId, null>, event: React.DragEvent) => void;
}

const uniqueIds = (itemIds: readonly EntityLibraryItemId[]): EntityLibraryItemId[] =>
  Array.from(new Set(itemIds));

const isLeavingTarget = (event: React.DragEvent) => {
  const currentTarget = event.currentTarget as HTMLElement;
  const relatedTarget = event.relatedTarget as Node | null;
  return !relatedTarget || !currentTarget.contains(relatedTarget);
};

export function useEntityLibraryDragDrop({
  getDragItemIds,
  onDropItems
}: UseEntityLibraryDragDropOptions): UseEntityLibraryDragDropResult {
  const [draggingIds, setDraggingIds] = useState<EntityLibraryItemId[]>([]);
  const [dragOverGroupId, setDragOverGroupId] = useState<EntityLibraryGroupId>(null);
  const draggingSet = useMemo(() => new Set(draggingIds), [draggingIds]);
  const isDragging = draggingIds.length > 0;

  const resetDragState = () => {
    setDraggingIds([]);
    setDragOverGroupId(null);
  };

  const handleItemDragStart = (itemId: EntityLibraryItemId, event: React.DragEvent) => {
    const nextDraggingIds = uniqueIds(getDragItemIds(itemId));
    if (nextDraggingIds.length === 0) return;

    setDraggingIds(nextDraggingIds);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragOver = (groupId: EntityLibraryGroupId, event: React.DragEvent) => {
    if (!isDragging) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverGroupId(groupId);
  };

  const handleDragLeave = (groupId: EntityLibraryGroupId, event: React.DragEvent) => {
    if (!isDragging || !isLeavingTarget(event)) return;
    setDragOverGroupId((current) => current === groupId ? null : current);
  };

  const handleDrop = (groupId: EntityLibraryGroupId, event: React.DragEvent) => {
    if (!isDragging) return;
    event.preventDefault();
    event.stopPropagation();
    const targetIds = uniqueIds(draggingIds);
    resetDragState();
    if (targetIds.length === 0) return;
    void onDropItems({ itemIds: targetIds, targetGroupId: groupId });
  };

  return {
    draggingIds,
    draggingSet,
    dragOverGroupId,
    isDragging,
    isDraggingItem: (itemId) => draggingSet.has(itemId),
    isGroupDragOver: (groupId) => dragOverGroupId === groupId,
    handleItemDragStart,
    handleItemDragEnd: resetDragState,
    handleWorkspaceDragOver: handleDragOver,
    handleWorkspaceDragLeave: handleDragLeave,
    handleWorkspaceDrop: handleDrop,
    handleGroupDragOver: handleDragOver,
    handleGroupDragLeave: handleDragLeave,
    handleGroupDrop: handleDrop
  };
}
