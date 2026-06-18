
import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, SearchInput, Select, TextArea, SectionHeader, StatBadge } from './UI';
import { Modal } from './Modal';
import {
  Asset,
  AssetCollection,
  AssetCollectionAssignmentMap,
  AssetCollectionTargetType,
  EntityLink,
  EntityLinkAssignmentMap,
  EntityLinkCreatePayload,
  EntityLinkTargetType,
  Item,
  ItemGroup,
  ItemRarity,
  ItemType,
  PublishedContent,
  PublicationAssignmentMap,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload,
  StatModifier,
  StatKey,
  Tag,
  TagAssignmentMap,
  TaggableTargetType
} from '../types';
import { assetCollectionAssignmentKey, entityLinkAssignmentKey, publicationAssignmentKey, tagAssignmentKey } from '../lib/mappers';
import { buildAssetUsagePayload, findAssetForUsage, findAssetUsageLink } from '../lib/assetUsage';
import { TagFilter, TagPicker } from './TagPicker';
import { AssetUsagePicker } from './AssetUsagePicker';
import { AssetCollectionTargetPicker } from './AssetCollectionTargetPicker';
import { AssetCollectionTargetSelect } from './AssetCollectionTargetSelect';
import { PublicationPanel } from './PublicationPanel';
import { ClipboardPaste, Coins, Edit3, FolderOpen, FolderPlus, Pencil, Scale, Scissors, Trash2, X, Zap, Plus } from 'lucide-react';
import {
  EntityLibraryCard,
  EntityLibraryContextMenu,
  EntityLibraryGroupCard,
  EntityLibraryMediaSlot,
  EntityLibraryWorkspace,
  type EntityLibraryActionSection,
  useEntityLibraryContextMenu,
  useEntityLibraryDragDrop,
  useEntityLibraryKeyboard,
  useEntityLibraryMoveBuffer,
  useEntityLibraryNavigation,
  useEntityLibrarySelection
} from './entityLibrary';

interface ItemsEditorProps {
  data: Item[];
  onUpdate: (data: Item[]) => void;
  onCreateItem?: (payload: Omit<Item, 'id'>) => Promise<Item>;
  onUpdateItem?: (id: string, payload: Omit<Item, 'id'>) => Promise<Item>;
  onDeleteItem?: (id: string) => Promise<void>;
  assets: Asset[];
  assetCollections: AssetCollection[];
  assetCollectionAssignments: AssetCollectionAssignmentMap;
  tags: Tag[];
  tagAssignments: TagAssignmentMap;
  entityLinks: EntityLinkAssignmentMap;
  publicationAssignments: PublicationAssignmentMap;
  onReplaceTargetTags: (type: TaggableTargetType, id: string, tagIds: string[], newTags?: string[]) => Promise<Tag[]>;
  onUpdateTag: (id: string, name: string) => Promise<Tag>;
  onDeleteTag: (id: string) => Promise<void>;
  onCreateMaterialLink: (sourceType: EntityLinkTargetType, sourceId: string, payload: EntityLinkCreatePayload) => Promise<EntityLink>;
  onDeleteMaterialLink: (id: string) => Promise<void>;
  onUpsertPublication: (type: PublicationTargetType, id: string, payload: PublicationUpsertPayload) => Promise<PublishedContent>;
  onUpdatePublication: (id: string, payload: PublicationUpdatePayload) => Promise<PublishedContent>;
  onDeletePublication: (id: string) => Promise<void>;
  onReplaceAssetCollections: (type: AssetCollectionTargetType, id: string, collectionIds: string[]) => Promise<AssetCollection[]>;
  initialItemId?: string | null;
  itemGroups: ItemGroup[];
  onCreateItemGroup: () => Promise<ItemGroup>;
  onUpdateItemGroup: (id: string, payload: Partial<ItemGroup>) => Promise<ItemGroup>;
  onDeleteItemGroup: (id: string) => Promise<void>;
}

const SECTION_ACCENT = 'var(--col-blue)';
const RARITY_COLORS: Record<ItemRarity, string> = { 'Легендарный': 'var(--col-yellow)', 'Эпический': 'var(--col-purple)', 'Редкий': 'var(--col-red)', 'Необычный': 'var(--col-blue)', 'Обычный': 'var(--col-grey)' };
const RARITY_SHADOWS: Record<ItemRarity, string> = { 'Легендарный': 'rgba(122, 92, 0, 0.6)', 'Эпический': 'rgba(60, 19, 122, 0.6)', 'Редкий': 'rgba(107, 20, 27, 0.6)', 'Необычный': 'rgba(26, 42, 140, 0.6)', 'Обычный': 'rgba(88, 88, 88, 0.4)' };
const STAT_OPTIONS: StatKey[] = ['АТК', 'ЗАЩ', 'СИЛ', 'ЛОВ', 'ВЫН', 'ИНТ', 'МДР', 'ХАР', 'УДЧ'];
const ITEM_TYPE_OPTIONS = [{ value: 'Оружие', label: 'ОРУЖИЕ' }, { value: 'Снаряжение', label: 'СНАРЯЖЕНИЕ' }, { value: 'Артефакт', label: 'АРТЕФАКТ' }, { value: 'Расходник', label: 'РАСХОДНИК' }, { value: 'Прочее', label: 'ПРОЧЕЕ' }];
const RARITY_OPTIONS = [{ value: 'Обычный', label: 'ОБЫЧНЫЙ' }, { value: 'Необычный', label: 'НЕОБЫЧНЫЙ' }, { value: 'Редкий', label: 'РЕДКИЙ' }, { value: 'Эпический', label: 'ЭПИЧЕСКИЙ' }, { value: 'Легендарный', label: 'ЛЕГЕНДАРНЫЙ' }];
const EMPTY_ITEM: Partial<Item> = { name: '', type: 'Оружие', rarity: 'Обычный', description: '', modifiers: [], weight: 0, value: 0 };
const DRAFT_TAG_PREFIX = 'draft-tag:';

const normalizeDraftTagName = (name: string): string => name.trim().replace(/\s+/g, ' ');
const draftTagId = (name: string): string => `${DRAFT_TAG_PREFIX}${encodeURIComponent(normalizeDraftTagName(name).toLowerCase())}`;
const isDraftTagId = (id: string): boolean => id.startsWith(DRAFT_TAG_PREFIX);
const draftTagFromName = (name: string): Tag => {
  const normalized = normalizeDraftTagName(name);
  return {
    id: draftTagId(normalized),
    userId: null,
    name: normalized,
    slug: normalized.toLowerCase()
  };
};

const uniqueDraftTagNames = (names: string[]): string[] => {
  const seen = new Set<string>();
  return names
    .map(normalizeDraftTagName)
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const ItemsEditor: React.FC<ItemsEditorProps> = ({
  data,
  onUpdate,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  assets,
  assetCollections,
  assetCollectionAssignments,
  tags,
  tagAssignments,
  entityLinks,
  publicationAssignments,
  onReplaceTargetTags,
  onUpdateTag,
  onDeleteTag,
  onCreateMaterialLink,
  onDeleteMaterialLink,
  onUpsertPublication,
  onUpdatePublication,
  onDeletePublication,
  onReplaceAssetCollections,
  initialItemId,
  itemGroups,
  onCreateItemGroup,
  onUpdateItemGroup,
  onDeleteItemGroup
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renamingGroupName, setRenamingGroupName] = useState('');
  const [activeFilter, setActiveFilter] = useState<ItemRarity | 'all'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('NAME_ASC');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<Item>>(EMPTY_ITEM);
  const [draftItemImageId, setDraftItemImageId] = useState<string | null>(null);
  const [draftTags, setDraftTags] = useState<Tag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const initialItemAppliedRef = useRef<string | null>(null);
  const librarySelection = useEntityLibrarySelection({ mode: 'multi' });
  const libraryNavigation = useEntityLibraryNavigation();
  const libraryContextMenu = useEntityLibraryContextMenu();
  const moveBuffer = useEntityLibraryMoveBuffer();
  const { currentGroupId, isRoot: libraryIsRoot, openGroup, returnToRoot } = libraryNavigation;
  const currentRarityAccent = RARITY_COLORS[formData.rarity as ItemRarity || 'Обычный'];

  const linksForItem = (itemId: string) =>
    entityLinks[entityLinkAssignmentKey('item', itemId)] ?? [];

  const collectionIdsForItem = (itemId: string) =>
    (assetCollectionAssignments[assetCollectionAssignmentKey('item', itemId)] ?? []).map((collection) => collection.id);

  const collectionIdsForItemGroup = (groupId?: string | null) =>
    groupId
      ? (assetCollectionAssignments[assetCollectionAssignmentKey('item_group', groupId)] ?? []).map((collection) => collection.id)
      : [];

  const effectiveCollectionIdsForItem = (item: Partial<Item>) => {
    const groupCollectionIds = collectionIdsForItemGroup(item.groupId);
    if (groupCollectionIds.length > 0) return groupCollectionIds;
    if (item.id) return collectionIdsForItem(item.id);
    return [];
  };

  const assetSourceLabelForItem = (item: Partial<Item>) => {
    const group = itemGroups.find((candidate) => candidate.id === item.groupId);
    const groupCollectionIds = collectionIdsForItemGroup(item.groupId);
    if (group && groupCollectionIds.length > 0) return `Источник ассетов: из группы "${group.name}"`;
    if (item.id && collectionIdsForItem(item.id).length > 0) return 'Источник ассетов: прямые наборы карточки';
    return 'Источник ассетов: все подходящие ассеты';
  };

  const setItemAssetUsage = async (assetId: string | null) => {
    if (!editingId) {
      setDraftItemImageId(assetId);
      return;
    }

    const links = linksForItem(editingId);
    const existing = findAssetUsageLink(links, 'item_image');

    if (!assetId) {
      if (existing) await onDeleteMaterialLink(existing.id);
      return;
    }

    if (existing && existing.targetId !== assetId) {
      await onDeleteMaterialLink(existing.id);
    }

    await onCreateMaterialLink(
      'item',
      editingId,
      buildAssetUsagePayload(assetId, 'item_image')
    );
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      ...EMPTY_ITEM,
      groupId: currentGroupId
    });
    setDraftItemImageId(null);
    setDraftTags([]);
    setIsModalOpen(true);
  };
  const openEditModal = (item: Item) => {
    setDraftItemImageId(null);
    setDraftTags([]);
    setEditingId(item.id);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!initialItemId) return;
    if (initialItemAppliedRef.current === initialItemId) return;
    const target = data.find((item) => item.id === initialItemId);
    if (!target) return;
    initialItemAppliedRef.current = initialItemId;
    setDraftItemImageId(null);
    setDraftTags([]);
    setEditingId(target.id);
    setFormData({ ...target });
    setIsModalOpen(true);
  }, [data, initialItemId]);

  const replaceDraftTags = async (tagIds: string[], newTags: string[] = []): Promise<Tag[]> => {
    const existingTags = tagIds
      .filter((id) => !isDraftTagId(id))
      .map((id) => tags.find((tag) => tag.id === id))
      .filter((tag): tag is Tag => Boolean(tag));
    const retainedDraftNames = tagIds
      .filter(isDraftTagId)
      .map((id) => draftTags.find((tag) => tag.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    const nextDraftTags = uniqueDraftTagNames([...retainedDraftNames, ...newTags]).map(draftTagFromName);
    const nextTags = [...existingTags, ...nextDraftTags];

    setDraftTags(nextTags);

    return nextTags;
  };

  const applyCreateDrafts = async (itemId: string) => {
    if (draftItemImageId) {
      await onCreateMaterialLink('item', itemId, buildAssetUsagePayload(draftItemImageId, 'item_image'));
    }

    const existingTagIds = draftTags.filter((tag) => !isDraftTagId(tag.id)).map((tag) => tag.id);
    const newTagNames = draftTags.filter((tag) => isDraftTagId(tag.id)).map((tag) => tag.name);
    if (existingTagIds.length > 0 || newTagNames.length > 0) {
      await onReplaceTargetTags('item', itemId, existingTagIds, newTagNames);
    }
  };

  const buildPayload = (): Omit<Item, 'id'> => ({
    name: String(formData.name ?? '').trim().toUpperCase(),
    type: (formData.type ?? 'Прочее') as ItemType,
    rarity: (formData.rarity ?? 'Обычный') as ItemRarity,
    description: formData.description ?? '',
    modifiers: (formData.modifiers ?? []).map((modifier) => ({
      stat: modifier.stat,
      value: Number(modifier.value ?? 0),
    })),
    weight: Number(formData.weight ?? 0),
    value: Number(formData.value ?? 0),
    groupId: formData.groupId ?? null,
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить предмет?')) return;
    setError('');

    try {
      if (onDeleteItem) {
        setIsSubmitting(true);
        await onDeleteItem(id);
      } else {
        onUpdate(data.filter(item => item.id !== id));
      }
      librarySelection.clearSelection();
      moveBuffer.removeIds([id]);
    } catch {
      setError('Не удалось удалить предмет');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || isSubmitting) return;

    const payload = buildPayload();
    setError('');
    setIsSubmitting(true);

    try {
      if (editingId) {
        if (onUpdateItem) {
          await onUpdateItem(editingId, payload);
        } else {
          onUpdate(data.map(item => item.id === editingId ? { ...payload, id: editingId } : item));
        }
      } else if (onCreateItem) {
        const created = await onCreateItem(payload);
        setEditingId(created.id);
        setFormData({ ...created });
        await applyCreateDrafts(created.id);
        setDraftItemImageId(null);
        setDraftTags([]);
      } else {
        onUpdate([...data, { ...payload, id: Math.random().toString(36).substr(2, 9) }]);
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData(EMPTY_ITEM);
    } catch {
      setError('Не удалось сохранить предмет');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addModifier = () => {
    const modifiers = [...(formData.modifiers || [])];
    const usedStats = modifiers.map(m => m.stat);
    const availableStat = STAT_OPTIONS.find(s => !usedStats.includes(s));
    if (!availableStat) return;
    modifiers.push({ stat: availableStat as StatKey, value: 0 });
    setFormData({ ...formData, modifiers });
  };
  const removeModifier = (index: number) => { const modifiers = [...(formData.modifiers || [])]; modifiers.splice(index, 1); setFormData({ ...formData, modifiers }); };
  const updateModifier = (index: number, key: keyof StatModifier, value: any) => { const modifiers = [...(formData.modifiers || [])]; modifiers[index] = { ...modifiers[index], [key]: value }; setFormData({ ...formData, modifiers }); };

  const hasLibraryFilters = searchQuery.trim().length > 0 || Boolean(selectedTagFilter) || activeFilter !== 'all';
  const currentItemGroup = currentGroupId ? itemGroups.find((group) => group.id === currentGroupId) : null;
  const visibleItemGroups = libraryIsRoot && !hasLibraryFilters ? itemGroups : [];
  const itemGroupCountById = new Map(itemGroups.map((group) => [
    group.id,
    data.filter((item) => item.groupId === group.id).length
  ]));

  const filteredItems = data
    .filter(item => {
      const assignedTags = tagAssignments[tagAssignmentKey('item', item.id)] ?? [];
      return (activeFilter === 'all' || item.rarity === activeFilter) &&
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (libraryIsRoot ? !item.groupId : item.groupId === currentGroupId) &&
        (!selectedTagFilter || assignedTags.some((tag) => tag.id === selectedTagFilter));
    })
    .sort((a, b) => {
      if (sortOrder === 'NAME_ASC') return a.name.localeCompare(b.name);
      if (sortOrder === 'VALUE_DESC') return b.value - a.value;
      if (sortOrder === 'WEIGHT_DESC') return b.weight - a.weight;
      return 0;
    });
  const visibleItemIds = filteredItems.map((item) => item.id);
  const visibleItemIdKey = visibleItemIds.join('|');
  const isItemLibraryFilteredEmpty = data.length > 0 && filteredItems.length === 0 && hasLibraryFilters;
  const itemLibraryEmptyTitle = isItemLibraryFilteredEmpty
    ? 'Ничего не найдено'
    : libraryIsRoot
      ? 'Предметов пока нет'
      : 'В группе пока нет предметов';
  const itemLibraryEmptyDescription = isItemLibraryFilteredEmpty
    ? 'Попробуйте изменить поиск, тег или фильтр редкости.'
    : libraryIsRoot
      ? 'Чтобы создать предмет или группу, нажмите правой кнопкой мыши по этой области.'
      : 'Чтобы создать предмет в текущей группе, нажмите правой кнопкой мыши по этой области.';

  useEffect(() => {
    librarySelection.pruneSelection(visibleItemIds);
  }, [librarySelection, visibleItemIdKey, visibleItemIds]);

  const getButtonColor = (rarity: ItemRarity = 'Обычный'): "blue" | "yellow" | "purple" | "red" | "white" | "grey" => {
    if (rarity === 'Легендарный') return 'yellow'; if (rarity === 'Эпический') return 'purple'; if (rarity === 'Редкий') return 'red'; if (rarity === 'Необычный') return 'blue'; return 'grey';
  };

  const createGroup = async () => {
    const created = await onCreateItemGroup();
    openGroup(created.id);
    librarySelection.clearSelection();
    startRenameGroup(created);
  };

  const startRenameGroup = (group: ItemGroup) => {
    setRenamingGroupId(group.id);
    setRenamingGroupName(group.name);
  };

  const cancelRenameGroup = () => {
    setRenamingGroupId(null);
    setRenamingGroupName('');
  };

  const commitRenameGroup = async () => {
    if (!renamingGroupId) return;
    const groupId = renamingGroupId;
    const name = renamingGroupName.trim();
    cancelRenameGroup();
    if (name) await onUpdateItemGroup(groupId, { name });
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Удалить группу? Предметы останутся без группы.')) return;
    await onDeleteItemGroup(groupId);
    if (currentGroupId === groupId) returnToRoot();
    if (renamingGroupId === groupId) cancelRenameGroup();
    librarySelection.clearSelection();
  };

  const itemPayloadWithGroup = (item: Item, groupId: string | null): Omit<Item, 'id'> => ({
    name: item.name,
    type: item.type,
    rarity: item.rarity,
    description: item.description,
    modifiers: item.modifiers ?? [],
    weight: item.weight,
    value: item.value,
    groupId,
  });

  const cutItemsToClipboard = (itemId?: string | null) => {
    const targetIds = librarySelection.getActionTargetIds(itemId);
    if (targetIds.length === 0) return;
    moveBuffer.cut(targetIds);
    librarySelection.replaceSelection(targetIds);
  };

  const moveItemsToGroup = async (itemIds: readonly string[], targetGroupId: string | null) => {
    const targetIds = Array.from(new Set(itemIds)).filter(Boolean);
    if (targetIds.length === 0) return;

    if (onUpdateItem) {
      const updatedItems = await Promise.all(targetIds.map(async (id) => {
        const item = data.find((candidate) => candidate.id === id);
        if (!item) return null;
        return onUpdateItem(id, itemPayloadWithGroup(item, targetGroupId));
      }));
      const byId = new Map(updatedItems.filter(Boolean).map((item) => [item!.id, item!]));
      if (byId.size > 0) onUpdate(data.map((item) => byId.get(item.id) ?? item));
    } else {
      onUpdate(data.map((item) => targetIds.includes(item.id) ? { ...item, groupId: targetGroupId } : item));
    }

    librarySelection.clearSelection();
  };

  const pasteItemsToGroup = async (targetGroupId: string | null) => {
    await moveBuffer.paste(async (bufferedIds) => {
      await moveItemsToGroup(bufferedIds, targetGroupId);
    });
  };

  const libraryDragDrop = useEntityLibraryDragDrop({
    getDragItemIds: (itemId) => librarySelection.getActionTargetIds(itemId),
    onDropItems: async ({ itemIds, targetGroupId }) => {
      await moveItemsToGroup(itemIds, targetGroupId);
      moveBuffer.removeIds(itemIds);
    }
  });

  const getItemLibraryContextSections = (): EntityLibraryActionSection[] => {
    const context = libraryContextMenu.contextMenu;
    if (!context) return [];

    if (context.kind === 'workspace') {
      return [
        {
          actions: [
            { id: 'create-item', label: 'Создать предмет', icon: <Plus size={13} />, onSelect: openCreateModal },
            { id: 'create-group', label: 'Создать группу', icon: <FolderPlus size={13} />, disabled: !libraryIsRoot, onSelect: () => void createGroup() },
            { id: 'paste-items', label: context.groupId ? 'Вставить сюда' : 'Вставить в корень', icon: <ClipboardPaste size={13} />, disabled: moveBuffer.count === 0, onSelect: () => void pasteItemsToGroup(context.groupId) }
          ]
        }
      ];
    }

    if (context.kind === 'group') {
      const group = itemGroups.find((candidate) => candidate.id === context.groupId);
      return [
        {
          actions: [
            { id: 'open-group', label: 'Открыть группу', icon: <FolderOpen size={13} />, onSelect: () => { openGroup(context.groupId); librarySelection.clearSelection(); } },
            { id: 'rename-group', label: 'Переименовать', icon: <Pencil size={13} />, onSelect: () => { if (group) startRenameGroup(group); } },
            { id: 'paste-to-group', label: 'Вставить в группу', icon: <ClipboardPaste size={13} />, disabled: moveBuffer.count === 0, onSelect: () => void pasteItemsToGroup(context.groupId) }
          ]
        },
        {
          actions: [
            { id: 'delete-group', label: 'Удалить группу', icon: <Trash2 size={13} />, destructive: true, onSelect: () => void deleteGroup(context.groupId) }
          ]
        }
      ];
    }

    const targetIds = librarySelection.getActionTargetIds(context.itemId);
    return [
      {
        actions: [
          { id: 'open-item', label: 'Редактировать', icon: <Edit3 size={13} />, onSelect: () => { const item = data.find((candidate) => candidate.id === context.itemId); if (item) openEditModal(item); } },
          { id: 'cut-item', label: targetIds.length > 1 ? 'Вырезать выбранное' : 'Вырезать', icon: <Scissors size={13} />, onSelect: () => cutItemsToClipboard(context.itemId) }
        ]
      },
      {
        actions: [
          { id: 'delete-item', label: 'Удалить', icon: <Trash2 size={13} />, destructive: true, onSelect: () => void handleDelete(context.itemId) }
        ]
      }
    ];
  };

  useEntityLibraryKeyboard({
    contextMenuOpen: Boolean(libraryContextMenu.contextMenu),
    onCloseContextMenu: libraryContextMenu.closeContextMenu,
    renameActive: Boolean(renamingGroupId),
    onCancelRename: cancelRenameGroup,
    selectedIds: librarySelection.selectedIds,
    onClearSelection: librarySelection.clearSelection,
    moveBufferCount: moveBuffer.count,
    onCancelMoveBuffer: moveBuffer.cancel,
    onOpenSelected: (itemId) => {
      const item = data.find((candidate) => candidate.id === itemId);
      if (item) openEditModal(item);
    },
    onDeleteSelected: (itemId) => void handleDelete(itemId)
  });

  return (
    <div className="flex h-full w-full flex-col bg-[var(--bg-main)] bauhaus-bg">
      <div className="shrink-0 px-8 pb-5 pt-7">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div className="flex flex-col gap-4">
            <SectionHeader title="СКЛАД ТВОРЦА" subtitle="РЕЕСТР СНАРЯЖЕНИЯ" accentColor={SECTION_ACCENT} />
            {!libraryIsRoot && currentItemGroup && (
              <div className="mono flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-[var(--text-muted)]">
                <button
                  type="button"
                  onClick={() => {
                    returnToRoot();
                    librarySelection.clearSelection();
                  }}
                  className="transition-colors hover:text-[var(--col-blue)]"
                >
                  Предметы
                </button>
                <span>/</span>
                <span className="text-[var(--text-main)]">{currentItemGroup.name}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-[250px] flex-1">
              <SearchInput value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ВВЕДИТЕ НАЗВАНИЕ..." accentColor={SECTION_ACCENT} />
            </div>
            <div className="min-w-[190px]">
              <TagFilter tags={tags} value={selectedTagFilter} onChange={setSelectedTagFilter} accentColor={SECTION_ACCENT} />
            </div>
            <div className="min-w-[170px]">
              <Select value={sortOrder} onChange={val => setSortOrder(val)} options={[{value:'NAME_ASC', label:'ИМЯ'}, {value:'VALUE_DESC', label:'ЦЕНА'}, {value:'WEIGHT_DESC', label:'ВЕС'}]} accentColor={SECTION_ACCENT} />
            </div>
            <div className="min-w-[180px]">
              <Select
                value={activeFilter}
                onChange={(value) => setActiveFilter(value as ItemRarity | 'all')}
                options={[{ value: 'all', label: 'ВСЕ' }, ...RARITY_OPTIONS]}
                accentColor={SECTION_ACCENT}
              />
            </div>
            {!libraryIsRoot && (
              <button
                type="button"
                onClick={() => {
                  returnToRoot();
                  librarySelection.clearSelection();
                }}
                className="h-11 border-2 border-[var(--border-color)] px-4 mono text-[10px] font-black uppercase text-[var(--text-muted)] transition-colors hover:border-[var(--col-blue)] hover:text-[var(--col-blue)]"
              >
                Все предметы
              </button>
            )}
            {!libraryIsRoot && currentItemGroup && (
              <AssetCollectionTargetSelect
                label="Набор ассетов группы"
                collections={assetCollections}
                value={collectionIdsForItemGroup(currentItemGroup.id)}
                accentColor={SECTION_ACCENT}
                onChange={(collectionIds) => onReplaceAssetCollections('item_group', currentItemGroup.id, collectionIds)}
              />
            )}
            <div className="flex-1" />
            <Button color="blue" onClick={openCreateModal}><Plus size={18} /> СОЗДАТЬ ПРЕДМЕТ</Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-8 pb-8 pt-3">
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-3">
          {moveBuffer.count > 0 && (
            <div className="flex flex-wrap items-center gap-3 border border-[var(--col-blue)]/50 bg-[var(--col-blue)]/10 px-4 py-3">
              <div className="mono text-[10px] font-black uppercase tracking-[0.12em] text-[var(--col-blue)]">
                Вырезано: {moveBuffer.count}
              </div>
              <div className="flex-1" />
              <button type="button" onClick={() => void pasteItemsToGroup(currentGroupId)} className="mono flex items-center gap-2 text-[10px] font-black uppercase text-[var(--text-main)] hover:text-[var(--col-blue)]">
                <ClipboardPaste size={13} /> Вставить сюда
              </button>
              <button type="button" onClick={moveBuffer.cancel} className="mono flex items-center gap-2 text-[10px] font-black uppercase text-[var(--text-muted)] hover:text-[var(--col-red)]">
                <X size={13} /> Отменить
              </button>
            </div>
          )}
          <EntityLibraryWorkspace<Item, ItemGroup>
            items={filteredItems}
            groups={visibleItemGroups}
            getItemId={(item) => item.id}
            getGroupId={(group) => group.id}
            selectedIds={librarySelection.selectedIds}
            cutItemIds={moveBuffer.itemIds}
            draggingItemIds={libraryDragDrop.draggingIds}
            dragOverGroupId={libraryDragDrop.dragOverGroupId}
            currentGroupId={currentGroupId}
            draggableItems
            surface="transparent"
            framed
            className="min-h-[420px] flex-1"
            gridClassName=""
            onSelectItem={(itemId, _item, event) => librarySelection.selectFromEvent(itemId, event, visibleItemIds)}
            onOpenItem={(_itemId, item) => openEditModal(item)}
            onOpenGroup={(groupId) => {
              openGroup(groupId);
              librarySelection.clearSelection();
            }}
            onClearSelection={librarySelection.clearSelection}
            onWorkspaceContextMenu={(context) => libraryContextMenu.setContextMenu(context)}
            onItemContextMenu={(itemId, _item, event) => {
              if (!librarySelection.isSelected(itemId)) librarySelection.replaceSelection(itemId);
              libraryContextMenu.openItemMenu(event, itemId, currentGroupId);
            }}
            onGroupContextMenu={(groupId, _group, event) => {
              librarySelection.clearSelection();
              libraryContextMenu.openGroupMenu(event, groupId);
            }}
            onItemDragStart={(itemId, _item, event) => {
              if (!librarySelection.isSelected(itemId)) librarySelection.replaceSelection(itemId);
              libraryDragDrop.handleItemDragStart(itemId, event);
            }}
            onItemDragEnd={() => libraryDragDrop.handleItemDragEnd()}
            onWorkspaceDragOver={(groupId, event) => libraryDragDrop.handleWorkspaceDragOver(groupId, event)}
            onWorkspaceDragLeave={(groupId, event) => libraryDragDrop.handleWorkspaceDragLeave(groupId, event)}
            onWorkspaceDrop={(groupId, event) => libraryDragDrop.handleWorkspaceDrop(groupId, event)}
            onGroupDragOver={(groupId, _group, event) => libraryDragDrop.handleGroupDragOver(groupId, event)}
            onGroupDragLeave={(groupId, _group, event) => libraryDragDrop.handleGroupDragLeave(groupId, event)}
            onGroupDrop={(groupId, _group, event) => libraryDragDrop.handleGroupDrop(groupId, event)}
            renderGroup={(group, state) => (
              <EntityLibraryGroupCard
                name={group.name}
                nameContent={renamingGroupId === group.id ? (
                  <Input
                    autoFocus
                    value={renamingGroupName}
                    onChange={(event) => setRenamingGroupName(event.target.value)}
                    onBlur={() => void commitRenameGroup()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void commitRenameGroup();
                      if (event.key === 'Escape') cancelRenameGroup();
                    }}
                    accentColor={SECTION_ACCENT}
                    className="h-9"
                  />
                ) : undefined}
                count={itemGroupCountById.get(group.id) ?? 0}
                countLabel={(itemGroupCountById.get(group.id) ?? 0) === 0 ? 'ПУСТО' : 'ПРЕДМЕТОВ'}
                accentColor={SECTION_ACCENT}
                dragOver={state.dragOver}
              />
            )}
            renderItem={(item, state) => {
              const itemImage = findAssetForUsage(linksForItem(item.id), assets, 'item_image');
              const accent = RARITY_COLORS[item.rarity];

              return (
                <EntityLibraryCard
                  title={item.name}
                  accentColor={accent}
                  selected={state.selected}
                  cut={state.cut}
                  dragging={state.dragging}
                  headerExtra={(
                    <div className="flex items-center gap-2">
                      {state.cut && <span className="mono text-[8px] font-black uppercase text-[var(--col-blue)]">ВЫРЕЗАНО</span>}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(item.id);
                        }}
                        className="text-[var(--text-muted)] transition-colors hover:text-[var(--col-red)]"
                        title="Удалить"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                >
                  <div className="space-y-4">
                    <EntityLibraryMediaSlot
                      src={itemImage?.url}
                      alt={itemImage?.name ?? item.name}
                      emptyLabel="ИЗОБРАЖЕНИЕ НЕ ВЫБРАНО"
                      accentColor={accent}
                    />
                    <div className="flex justify-between gap-3">
                      <span className="mono text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: accent }}>{item.rarity}</span>
                      <span className="mono truncate text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{item.type}</span>
                    </div>
                    <p className="line-clamp-3 border-l border-[var(--border-color)] py-1 pl-4 text-left mono text-[11px] leading-relaxed text-[var(--text-main)] opacity-70">{item.description || 'ОПИСАНИЕ ОТСУТСТВУЕТ'}</p>
                    {item.modifiers?.length > 0 && (<div className="flex flex-wrap gap-2 pt-1">{item.modifiers.slice(0, 4).map((mod, idx) => (<StatBadge key={idx} stat={mod.stat} value={mod.value} accentColor={accent} />))}</div>)}
                    <div className="grid grid-cols-2 gap-3 border-t border-[var(--border-color)] pt-4">
                      <div className="flex items-center gap-2"><Scale size={14} className="text-[var(--text-muted)]" /><span className="mono text-[10px] font-black uppercase text-[var(--text-main)] opacity-80">{item.weight} КГ</span></div>
                      <div className="flex items-center justify-end gap-2"><Coins size={14} className="text-[var(--col-yellow)]" /><span className="mono text-[10px] font-black uppercase text-[var(--col-yellow)]">{item.value} GP</span></div>
                    </div>
                  </div>
                </EntityLibraryCard>
              );
            }}
            emptyTitle={itemLibraryEmptyTitle}
            emptyDescription={itemLibraryEmptyDescription}
            emptyAction={isItemLibraryFilteredEmpty ? null : <Button color="blue" onClick={openCreateModal}><Plus size={16} /> СОЗДАТЬ ПРЕДМЕТ</Button>}
          />
          <EntityLibraryContextMenu
            context={libraryContextMenu.contextMenu}
            sections={getItemLibraryContextSections()}
            accentColor={SECTION_ACCENT}
            onClose={libraryContextMenu.closeContextMenu}
          />
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "РЕДАКТИРОВАТЬ ПРЕДМЕТ" : "НОВЫЙ ПРЕДМЕТ"} accentColor={currentRarityAccent} shadowColor={RARITY_SHADOWS[formData.rarity as ItemRarity || 'Обычный']} maxWidth="max-w-3xl">
        <div className="space-y-6">
          {error && <div className="p-3 border border-[var(--col-red)] bg-[var(--col-red)]/10 mono text-[10px] uppercase font-black text-[var(--col-red)]">{error}</div>}
          <div className="space-y-1.5"><label className="mono text-[10px] uppercase block font-black tracking-[0.2em] text-[var(--text-muted)]">Наименование</label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="МОЛОТ ПРЕДКОВ" className="h-10 text-sm border-2 font-black uppercase" accentColor={currentRarityAccent}/></div>
          <div className="space-y-1.5">
            <label className="mono text-[10px] uppercase block font-black tracking-[0.2em] text-[var(--text-muted)]">Группа</label>
            <Select
              value={formData.groupId ?? ''}
              onChange={(value) => setFormData({ ...formData, groupId: value || null })}
              options={[{ value: '', label: 'БЕЗ ГРУППЫ' }, ...itemGroups.map((group) => ({ value: group.id, label: group.name.toUpperCase() }))]}
              accentColor={currentRarityAccent}
            />
          </div>
          <div className="grid grid-cols-2 gap-6"><div className="space-y-1.5"><label className="mono text-[10px] uppercase block font-black tracking-[0.2em] text-[var(--text-muted)]">Тип</label><Select value={formData.type} onChange={val => setFormData({...formData, type: val as ItemType})} accentColor={currentRarityAccent} options={ITEM_TYPE_OPTIONS}/></div><div className="space-y-1.5"><label className="mono text-[10px] uppercase block font-black tracking-[0.2em] text-[var(--text-muted)]">Редкость</label><Select value={formData.rarity} onChange={val => setFormData({...formData, rarity: val as ItemRarity})} accentColor={currentRarityAccent} options={RARITY_OPTIONS}/></div></div>
          <div className="space-y-1.5"><label className="mono text-[10px] uppercase block font-black tracking-[0.2em] text-[var(--text-muted)]">Описание</label><TextArea placeholder="Опишите свойства предмета..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} accentColor={currentRarityAccent} className="min-h-[100px]"/></div>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2"><label className="mono text-[10px] uppercase font-black tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-2"><Zap size={12} style={{ color: currentRarityAccent }} /> Модификаторы</label><button onClick={addModifier} className="mono text-[10px] uppercase font-black transition-colors flex items-center gap-1.5 hover:brightness-125 group" style={{ color: currentRarityAccent }}><Plus size={14} className="group-hover:rotate-90 transition-transform" /> ДОБАВИТЬ</button></div>
            <div className="space-y-3">{(formData.modifiers && formData.modifiers.length > 0) ? (formData.modifiers.map((mod, idx) => (<div key={idx} className="flex gap-4 items-center animate-appear relative" style={{ zIndex: 100 - idx }}><div className="flex-[3]"><Select value={mod.stat} onChange={val => updateModifier(idx, 'stat', val as StatKey)} accentColor={currentRarityAccent} options={STAT_OPTIONS.map(opt => ({ value: opt, label: opt }))}/></div><div className="flex-1"><Input type="number" className="h-10 px-3 text-center border-2 font-black" value={mod.value} onChange={e => updateModifier(idx, 'value', parseInt(e.target.value) || 0)} accentColor={currentRarityAccent}/></div><button onClick={() => removeModifier(idx)} className="w-10 h-10 shrink-0 border-2 border-[var(--border-color)] flex items-center justify-center hover:border-[var(--col-red)] hover:text-[var(--col-red)] transition-all bg-[var(--bg-main)] active:scale-90 text-[var(--text-muted)]"><Trash2 size={16} /></button></div>))) : (<div className="py-8 border-2 border-dashed flex flex-col items-center justify-center gap-2 bauhaus-bg" style={{ borderColor: `color-mix(in srgb, ${currentRarityAccent} 20%, transparent)` }}><Zap size={16} className="text-[var(--text-muted)]" /><p className="mono text-[9px] uppercase font-black tracking-[0.2em] text-[var(--text-muted)] text-center px-4 leading-relaxed">СПИСОК МОДИФИКАТОРОВ ПУСТ.<br/>НАЖМИТЕ «ДОБАВИТЬ» ДЛЯ НАСТРОЙКИ ХАРАКТЕРИСТИК.</p></div>)}</div>
          </div>
          <div className="grid grid-cols-2 gap-6 border-t border-[var(--border-color)] pt-8 mt-4"><div className="space-y-1.5"><label className="mono text-[10px] uppercase block font-black tracking-[0.2em] text-[var(--text-muted)]">Вес (КГ)</label><Input type="number" step="0.1" className="h-10 border-2 font-black" value={formData.weight} onChange={e => setFormData({...formData, weight: parseFloat(e.target.value) || 0})} accentColor={currentRarityAccent} /></div><div className="space-y-1.5"><label className="mono text-[10px] uppercase block font-black tracking-[0.2em] text-[var(--text-muted)]">Цена (GP)</label><Input type="number" className="h-10 border-2 font-black" value={formData.value} onChange={e => setFormData({...formData, value: parseInt(e.target.value) || 0})} accentColor={currentRarityAccent} /></div></div>
          {editingId && !formData.groupId && collectionIdsForItem(editingId).length > 0 && (
            <AssetCollectionTargetPicker
              label="Прямые наборы карточки"
              collections={assetCollections}
              value={collectionIdsForItem(editingId)}
              accentColor={currentRarityAccent}
              onChange={(collectionIds) => onReplaceAssetCollections('item', editingId, collectionIds)}
            />
          )}
          <div className="mono text-[9px] uppercase text-[var(--text-muted)]">{assetSourceLabelForItem(formData)}</div>
          <AssetUsagePicker
            label="Изображение предмета"
            assets={assets}
            value={editingId ? findAssetUsageLink(linksForItem(editingId), 'item_image')?.targetId ?? null : draftItemImageId}
            allowedKinds={['item_image']}
            collectionIds={effectiveCollectionIdsForItem(formData)}
            accentColor={currentRarityAccent}
            onChange={setItemAssetUsage}
          />
          <TagPicker
            allTags={tags}
            selectedTags={editingId ? tagAssignments[tagAssignmentKey('item', editingId)] ?? [] : draftTags}
            accentColor={currentRarityAccent}
            onReplaceTags={editingId ? (tagIds, newTags) => onReplaceTargetTags('item', editingId, tagIds, newTags) : replaceDraftTags}
            onUpdateTag={editingId ? onUpdateTag : undefined}
            onDeleteTag={editingId ? onDeleteTag : undefined}
          />
          {editingId && (
            <PublicationPanel
              targetType="item"
              targetId={editingId}
              publication={publicationAssignments[publicationAssignmentKey('item', editingId)]}
              accentColor={currentRarityAccent}
              onUpsertPublication={onUpsertPublication}
              onUpdatePublication={onUpdatePublication}
              onDeletePublication={onDeletePublication}
            />
          )}
          <Button color={getButtonColor(formData.rarity as ItemRarity)} size="lg" className="w-full mt-4 h-14" onClick={() => void handleSave()} disabled={isSubmitting}>{editingId ? "ОБНОВИТЬ В РЕЕСТРЕ" : "ПОДТВЕРДИТЬ СОЗДАНИЕ"}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default ItemsEditor;
