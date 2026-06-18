import type React from 'react';

export type EntityLibraryItemId = string;
export type EntityLibraryGroupId = string | null;
export type EntityLibraryContextKind = 'workspace' | 'item' | 'group';

export interface EntityLibraryWorkspaceContext {
  kind: 'workspace';
  x: number;
  y: number;
  groupId: EntityLibraryGroupId;
}

export interface EntityLibraryItemContext {
  kind: 'item';
  x: number;
  y: number;
  itemId: EntityLibraryItemId;
  groupId: EntityLibraryGroupId;
}

export interface EntityLibraryGroupContext {
  kind: 'group';
  x: number;
  y: number;
  groupId: Exclude<EntityLibraryGroupId, null>;
}

export type EntityLibraryContext =
  | EntityLibraryWorkspaceContext
  | EntityLibraryItemContext
  | EntityLibraryGroupContext;

export interface EntityLibraryAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  hidden?: boolean;
  onSelect: (context: EntityLibraryContext) => void;
}

export interface EntityLibraryActionSection {
  id?: string;
  label?: string;
  actions: EntityLibraryAction[];
}

export interface EntityLibrarySelectionState {
  selectedIds: EntityLibraryItemId[];
  selectedSet: ReadonlySet<EntityLibraryItemId>;
  isSelected: (itemId: EntityLibraryItemId) => boolean;
}

export interface EntityLibraryItemRenderState {
  id: EntityLibraryItemId;
  selected: boolean;
  cut: boolean;
  dragging: boolean;
}

export interface EntityLibraryGroupRenderState {
  id: Exclude<EntityLibraryGroupId, null>;
  dragOver: boolean;
}
