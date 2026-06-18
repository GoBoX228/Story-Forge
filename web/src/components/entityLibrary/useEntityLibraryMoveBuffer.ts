import { useMemo, useState } from 'react';
import type { EntityLibraryItemId } from './types';

export interface UseEntityLibraryMoveBufferResult {
  itemIds: EntityLibraryItemId[];
  itemIdSet: ReadonlySet<EntityLibraryItemId>;
  count: number;
  hasItems: boolean;
  cut: (itemIds: readonly EntityLibraryItemId[]) => void;
  paste: (handler: (itemIds: EntityLibraryItemId[]) => void | Promise<void>) => Promise<void>;
  cancel: () => void;
  removeIds: (itemIds: readonly EntityLibraryItemId[]) => void;
  isCut: (itemId: EntityLibraryItemId) => boolean;
}

const uniqueIds = (itemIds: readonly EntityLibraryItemId[]): EntityLibraryItemId[] =>
  Array.from(new Set(itemIds));

export function useEntityLibraryMoveBuffer(): UseEntityLibraryMoveBufferResult {
  const [itemIds, setItemIds] = useState<EntityLibraryItemId[]>([]);
  const itemIdSet = useMemo(() => new Set(itemIds), [itemIds]);

  const cut = (nextItemIds: readonly EntityLibraryItemId[]) => {
    setItemIds(uniqueIds(nextItemIds));
  };

  const paste = async (handler: (itemIds: EntityLibraryItemId[]) => void | Promise<void>) => {
    const targetIds = uniqueIds(itemIds);
    if (targetIds.length === 0) {
      setItemIds([]);
      return;
    }

    await handler(targetIds);
    setItemIds([]);
  };

  const cancel = () => setItemIds([]);

  const removeIds = (removedIds: readonly EntityLibraryItemId[]) => {
    const removedSet = new Set(removedIds);
    setItemIds((current) => current.filter((id) => !removedSet.has(id)));
  };

  const isCut = (itemId: EntityLibraryItemId) => itemIdSet.has(itemId);

  return {
    itemIds,
    itemIdSet,
    count: itemIds.length,
    hasItems: itemIds.length > 0,
    cut,
    paste,
    cancel,
    removeIds,
    isCut
  };
}
