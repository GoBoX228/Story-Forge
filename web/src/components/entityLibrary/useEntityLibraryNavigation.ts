import { useMemo, useState } from 'react';
import type { EntityLibraryGroupId } from './types';

export interface UseEntityLibraryNavigationOptions {
  initialGroupId?: EntityLibraryGroupId;
}

export interface UseEntityLibraryNavigationResult {
  currentGroupId: EntityLibraryGroupId;
  isRoot: boolean;
  setCurrentGroupId: React.Dispatch<React.SetStateAction<EntityLibraryGroupId>>;
  openGroup: (groupId: Exclude<EntityLibraryGroupId, null>) => void;
  returnToRoot: () => void;
}

export function useEntityLibraryNavigation({
  initialGroupId = null
}: UseEntityLibraryNavigationOptions = {}): UseEntityLibraryNavigationResult {
  const [currentGroupId, setCurrentGroupId] = useState<EntityLibraryGroupId>(initialGroupId);
  const isRoot = useMemo(() => currentGroupId === null, [currentGroupId]);

  const openGroup = (groupId: Exclude<EntityLibraryGroupId, null>) => setCurrentGroupId(groupId);
  const returnToRoot = () => setCurrentGroupId(null);

  return {
    currentGroupId,
    isRoot,
    setCurrentGroupId,
    openGroup,
    returnToRoot
  };
}

