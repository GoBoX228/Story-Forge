import React from 'react';
import { Layout, Trash2, type LucideIcon } from 'lucide-react';

export type EditorToolbarPosition = 'left' | 'top' | 'right' | 'bottom';
export type EditorToolbarTone = 'default' | 'danger';

export interface EditorToolbarButtonItem {
  id: string;
  action?: string;
  icon: LucideIcon;
  title: string;
  active?: boolean;
  disabled?: boolean;
  tone?: EditorToolbarTone;
}

export interface EditorToolbarGroup {
  id: string;
  items: EditorToolbarButtonItem[];
}

export interface EditorToolbarSpacer {
  id?: string;
  spacer: true;
}

export type EditorToolbarEntry = EditorToolbarGroup | EditorToolbarSpacer;

export interface EditorToolbarUtilityActionConfig {
  action: string;
  title: string;
  disabled?: boolean;
}

export interface EditorToolbarUtilityGroupOptions {
  delete?: EditorToolbarUtilityActionConfig;
  position?: EditorToolbarUtilityActionConfig;
}

interface EditorToolbarProps {
  position: EditorToolbarPosition;
  groups: EditorToolbarEntry[];
  onAction: (action: string) => void;
  className?: string;
}

const isSpacer = (entry: EditorToolbarEntry): entry is EditorToolbarSpacer => 'spacer' in entry;

const isVerticalPosition = (position: EditorToolbarPosition): boolean => position === 'left' || position === 'right';

export const createEditorToolbarUtilityGroup = (options: EditorToolbarUtilityGroupOptions): EditorToolbarEntry[] => {
  const items: EditorToolbarButtonItem[] = [];

  if (options.delete) {
    items.push({
      id: options.delete.action,
      action: options.delete.action,
      icon: Trash2,
      title: options.delete.title,
      disabled: options.delete.disabled,
      tone: 'danger'
    });
  }

  if (options.position) {
    items.push({
      id: options.position.action,
      action: options.position.action,
      icon: Layout,
      title: options.position.title,
      disabled: options.position.disabled
    });
  }

  if (items.length === 0) {
    return [];
  }

  return [
    { id: 'utility-spacer', spacer: true },
    {
      id: 'utility',
      items
    }
  ];
};

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ position, groups, onAction, className = '' }) => {
  const isVertical = isVerticalPosition(position);

  const borderClass = position === 'left'
    ? 'border-r'
    : position === 'right'
      ? 'border-l'
      : position === 'top'
        ? 'border-b'
        : 'border-t';

  return (
    <div
      className={[
        'bg-[var(--bg-surface)] z-30 flex items-center gap-1 p-2 shrink-0 border-[var(--border-color)] overflow-x-auto scrollbar-hide',
        isVertical ? 'flex-col w-14 border-y-0 py-4' : 'flex-row h-14 w-full border-x-0 px-4',
        borderClass,
        className
      ].join(' ')}
    >
      {groups.map((entry, index) => {
        if (isSpacer(entry)) {
          return <div key={entry.id ?? `spacer-${index}`} className={`flex-1 ${isVertical ? '' : 'flex'}`} />;
        }

        return (
          <React.Fragment key={entry.id}>
            {index > 0 && !isSpacer(groups[index - 1]) && <EditorToolbarSeparator vertical={isVertical} />}
            <div className={isVertical ? 'flex flex-col gap-1' : 'flex flex-row gap-1'}>
              {entry.items.map((item) => (
                <EditorToolbarButton key={item.id} item={item} onAction={onAction} />
              ))}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

const EditorToolbarSeparator: React.FC<{ vertical: boolean }> = ({ vertical }) => (
  <div className={vertical ? 'w-full h-[1px] bg-[var(--border-color)] my-1' : 'h-full w-[1px] bg-[var(--border-color)] mx-1'} />
);

const EditorToolbarButton: React.FC<{ item: EditorToolbarButtonItem; onAction: (action: string) => void }> = ({ item, onAction }) => {
  const Icon = item.icon;
  const tone = item.tone ?? 'default';
  const inactiveClass = tone === 'danger'
    ? 'border-transparent text-[var(--text-muted)] hover:text-[var(--col-red)] hover:bg-[var(--col-red)]/10'
    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/10';

  return (
    <button
      type="button"
      onClick={() => onAction(item.action ?? item.id)}
      title={item.title}
      disabled={item.disabled}
      className={`w-9 h-9 flex items-center justify-center border transition-all disabled:opacity-40 disabled:pointer-events-none ${
        item.active
          ? 'bg-[var(--text-main)] text-[var(--bg-main)]'
          : inactiveClass
      }`}
    >
      <Icon size={18} />
    </button>
  );
};

export default EditorToolbar;
