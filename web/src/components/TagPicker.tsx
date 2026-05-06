import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Tag as TagIcon, Trash2, X } from 'lucide-react';
import { Tag } from '../types';
import { Button, Input, Select } from './UI';

interface TagPickerProps {
  allTags: Tag[];
  selectedTags: Tag[];
  accentColor: string;
  onReplaceTags: (tagIds: string[], newTags?: string[]) => Promise<Tag[]>;
  onUpdateTag?: (id: string, name: string) => Promise<Tag>;
  onDeleteTag?: (id: string) => Promise<void>;
}

export const TagPicker: React.FC<TagPickerProps> = ({
  allTags,
  selectedTags,
  accentColor,
  onReplaceTags,
  onUpdateTag,
  onDeleteTag
}) => {
  const [selectedTagId, setSelectedTagId] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [renamingTagId, setRenamingTagId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedIds = useMemo(() => selectedTags.map((tag) => tag.id), [selectedTags]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const availableOptions = useMemo(
    () => [
      { value: '', label: 'ВЫБРАТЬ ТЕГ' },
      ...allTags
        .filter((tag) => !selectedIdSet.has(tag.id))
        .map((tag) => ({ value: tag.id, label: tag.name.toUpperCase() }))
    ],
    [allTags, selectedIdSet]
  );

  const replaceSafely = async (tagIds: string[], newTags: string[] = []) => {
    setError('');
    setIsSubmitting(true);
    try {
      await onReplaceTags(tagIds, newTags);
      setSelectedTagId('');
      setNewTagName('');
    } catch (tagError) {
      setError(tagError instanceof Error ? tagError.message : 'Не удалось обновить теги');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addExistingTag = async () => {
    if (!selectedTagId || selectedIdSet.has(selectedTagId) || isSubmitting) return;
    await replaceSafely([...selectedIds, selectedTagId]);
  };

  const addNewTag = async () => {
    const nextName = newTagName.trim();
    if (!nextName || isSubmitting) return;
    await replaceSafely(selectedIds, [nextName]);
  };

  const removeTag = async (tagId: string) => {
    if (isSubmitting) return;
    await replaceSafely(selectedIds.filter((id) => id !== tagId));
  };

  const startRename = (tag: Tag) => {
    setRenamingTagId(tag.id);
    setRenameValue(tag.name);
    setError('');
  };

  const saveRename = async () => {
    if (!renamingTagId || !renameValue.trim() || !onUpdateTag || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onUpdateTag(renamingTagId, renameValue.trim());
      setRenamingTagId(null);
      setRenameValue('');
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Не удалось переименовать тег');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteGlobalTag = async (tag: Tag) => {
    if (!onDeleteTag || isSubmitting) return;
    if (!confirm(`Удалить тег "${tag.name}" из всех материалов?`)) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onDeleteTag(tag.id);
      setRenamingTagId(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить тег');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 border-t border-[var(--border-color)] pt-5">
      <div className="flex items-center gap-2">
        <TagIcon size={14} style={{ color: accentColor }} />
        <span className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">Теги</span>
      </div>

      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 border px-2 py-1 bg-[var(--bg-main)]"
              style={{ borderColor: accentColor }}
            >
              {renamingTagId === tag.id ? (
                <input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void saveRename();
                    if (event.key === 'Escape') setRenamingTagId(null);
                  }}
                  className="w-28 bg-transparent mono text-[9px] uppercase font-black text-[var(--text-main)] outline-none"
                  autoFocus
                />
              ) : (
                <span className="mono text-[9px] uppercase font-black" style={{ color: accentColor }}>
                  #{tag.name}
                </span>
              )}
              {renamingTagId === tag.id ? (
                <button type="button" onClick={() => void saveRename()} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  <Plus size={11} />
                </button>
              ) : (
                <button type="button" onClick={() => startRename(tag)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  <Edit3 size={10} />
                </button>
              )}
              <button type="button" onClick={() => void removeTag(tag.id)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X size={11} />
              </button>
              {onDeleteTag && (
                <button type="button" onClick={() => void deleteGlobalTag(tag)} className="text-[var(--text-muted)] hover:text-[var(--col-red)]">
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-[var(--border-color)] p-3 mono text-[9px] uppercase text-[var(--text-muted)]">
          У материала пока нет тегов
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
        <Select value={selectedTagId} onChange={setSelectedTagId} options={availableOptions} accentColor={accentColor} />
        <Button inverted color="white" size="sm" disabled={!selectedTagId || isSubmitting} onClick={() => void addExistingTag()}>
          <Plus size={13} /> ДОБАВИТЬ
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
        <Input
          value={newTagName}
          onChange={(event) => setNewTagName(event.target.value)}
          placeholder="Новый тег"
          accentColor={accentColor}
        />
        <Button inverted color="white" size="sm" disabled={!newTagName.trim() || isSubmitting} onClick={() => void addNewTag()}>
          <Plus size={13} /> СОЗДАТЬ
        </Button>
      </div>

      {error && (
        <div className="border border-[var(--col-red)] bg-[var(--col-red)]/10 p-3 mono text-[9px] uppercase font-black text-[var(--col-red)]">
          {error}
        </div>
      )}
    </div>
  );
};

interface TagFilterProps {
  tags: Tag[];
  value: string;
  onChange: (value: string) => void;
  accentColor: string;
}

export const TagFilter: React.FC<TagFilterProps> = ({ tags, value, onChange, accentColor }) => (
  <Select
    value={value}
    onChange={onChange}
    options={[
      { value: '', label: 'ВСЕ ТЕГИ' },
      ...tags.map((tag) => ({ value: tag.id, label: `# ${tag.name}`.toUpperCase() }))
    ]}
    accentColor={accentColor}
  />
);
