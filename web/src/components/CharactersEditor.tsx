
import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, SearchInput, Select, SectionHeader, StatBadge, TextArea } from './UI';
import { Modal } from './Modal';
import {
  Asset,
  AssetCollection,
  AssetCollectionAssignmentMap,
  AssetCollectionTargetType,
  Character,
  CharacterGroup,
  EntityLink,
  EntityLinkAssignmentMap,
  EntityLinkCreatePayload,
  EntityLinkTargetType,
  Item,
  StatKey,
  ItemRarity,
  PublishedContent,
  PublicationAssignmentMap,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload,
  Tag,
  TagAssignmentMap,
  TaggableTargetType
} from '../types';
import { apiRequest } from '../lib/api';
import { assetCollectionAssignmentKey, entityLinkAssignmentKey, mapCharacterFromApi, publicationAssignmentKey, tagAssignmentKey } from '../lib/mappers';
import { buildAssetUsagePayload, findAssetForUsage, findAssetUsageLink } from '../lib/assetUsage';
import { TagFilter, TagPicker } from './TagPicker';
import { AssetUsagePicker } from './AssetUsagePicker';
import { AssetCollectionTargetPicker } from './AssetCollectionTargetPicker';
import { PublicationPanel } from './PublicationPanel';
import {
  ClipboardPaste,
  FolderOpen,
  FolderPlus,
  Pencil,
  Scissors,
  Trash2,
  UserPlus,
  Zap,
  Edit3,
  Save,
  Package,
  Plus,
  X
} from 'lucide-react';
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

interface CharactersEditorProps {
  data: Character[];
  onUpdate: (data: Character[]) => void;
  items: Item[];
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
  initialCharacterId?: string | null;
  characterGroups: CharacterGroup[];
  onCreateCharacterGroup: () => Promise<CharacterGroup>;
  onUpdateCharacterGroup: (id: string, payload: Partial<CharacterGroup>) => Promise<CharacterGroup>;
  onDeleteCharacterGroup: (id: string) => Promise<void>;
}

const SECTION_ACCENT = 'var(--col-yellow)'; 
const STAT_KEYS: StatKey[] = ['АТК', 'ЗАЩ', 'СИЛ', 'ЛОВ', 'ВЫН', 'ИНТ', 'МДР', 'ХАР', 'УДЧ'];

const RARITY_COLORS: Record<ItemRarity, string> = {
  'Легендарный': 'var(--col-yellow)',
  'Эпический': 'var(--col-purple)',
  'Редкий': 'var(--col-red)',
  'Необычный': 'var(--col-blue)',
  'Обычный': 'var(--col-grey)',
};

const ROLE_COLORS = { 'Герой': 'var(--col-yellow)', 'NPC': 'var(--col-purple)', 'Монстр': 'var(--col-red)' };
const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'ВСЕ' },
  { value: 'Герой', label: 'ГЕРОЙ' },
  { value: 'NPC', label: 'NPC' },
  { value: 'Монстр', label: 'МОНСТР' }
];

const EMPTY_STATS: Record<StatKey, number> = { 'АТК': 10, 'ЗАЩ': 10, 'СИЛ': 10, 'ЛОВ': 10, 'ВЫН': 10, 'ИНТ': 10, 'МДР': 10, 'ХАР': 10, 'УДЧ': 10 };

const STAT_HINTS: Record<StatKey, string> = {
  'АТК': 'Атака: влияет на точность и силу боевых действий.',
  'ЗАЩ': 'Защита: снижает входящий урон и помогает выдерживать атаки.',
  'СИЛ': 'Сила: физическая мощь, грузоподъемность и силовые проверки.',
  'ЛОВ': 'Ловкость: реакция, уклонение, скрытность и точные действия.',
  'ВЫН': 'Выносливость: здоровье, стойкость и сопротивление усталости.',
  'ИНТ': 'Интеллект: знания, анализ, магическая теория и сложные задачи.',
  'МДР': 'Мудрость: внимательность, интуиция и восприятие опасности.',
  'ХАР': 'Харизма: убеждение, лидерство и социальное влияние.',
  'УДЧ': 'Удача: случайные шансы, редкие находки и рискованные исходы.'
};

const EMPTY_CHARACTER: Partial<Character> = { name: '', role: 'NPC', race: 'ЧЕЛОВЕК', description: '', baseStats: { ...EMPTY_STATS }, inventory: [] };

const CharactersEditor: React.FC<CharactersEditorProps> = ({
  data,
  onUpdate,
  items,
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
  initialCharacterId,
  characterGroups,
  onCreateCharacterGroup,
  onUpdateCharacterGroup,
  onDeleteCharacterGroup
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renamingGroupName, setRenamingGroupName] = useState('');
  const [activeRole, setActiveRole] = useState<'all' | 'Герой' | 'NPC' | 'Монстр'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Character>>(EMPTY_CHARACTER);
  const initialCharacterAppliedRef = useRef<string | null>(null);
  const librarySelection = useEntityLibrarySelection({ mode: 'multi' });
  const libraryNavigation = useEntityLibraryNavigation();
  const libraryContextMenu = useEntityLibraryContextMenu();
  const moveBuffer = useEntityLibraryMoveBuffer();
  const { currentGroupId, isRoot: libraryIsRoot, openGroup, returnToRoot } = libraryNavigation;

  const calculateEffectiveStats = (char: Partial<Character>) => {
    const effective = { ...(char.baseStats || EMPTY_STATS) };
    const bonus = Object.fromEntries(STAT_KEYS.map(k => [k, 0])) as Record<StatKey, number>;
    char.inventory?.forEach(itemId => {
      const item = items.find(i => i.id === itemId);
      item?.modifiers.forEach(mod => { bonus[mod.stat] += mod.value; });
    });
    return { effective, bonus };
  };

  const linksForCharacter = (characterId: string) =>
    entityLinks[entityLinkAssignmentKey('character', characterId)] ?? [];

  const collectionIdsForCharacter = (characterId: string) =>
    (assetCollectionAssignments[assetCollectionAssignmentKey('character', characterId)] ?? []).map((collection) => collection.id);

  const collectionIdsForCharacterGroup = (groupId?: string | null) =>
    groupId
      ? (assetCollectionAssignments[assetCollectionAssignmentKey('character_group', groupId)] ?? []).map((collection) => collection.id)
      : [];

  const effectiveCollectionIdsForCharacter = (character: Partial<Character>) => {
    const groupCollectionIds = collectionIdsForCharacterGroup(character.groupId);
    if (groupCollectionIds.length > 0) return groupCollectionIds;
    if (character.id) return collectionIdsForCharacter(character.id);
    return [];
  };

  const assetSourceLabelForCharacter = (character: Partial<Character>) => {
    const group = characterGroups.find((candidate) => candidate.id === character.groupId);
    const groupCollectionIds = collectionIdsForCharacterGroup(character.groupId);
    if (group && groupCollectionIds.length > 0) return `Источник ассетов: из группы "${group.name}"`;
    if (character.id && collectionIdsForCharacter(character.id).length > 0) return 'Источник ассетов: прямые наборы карточки';
    return 'Источник ассетов: все подходящие ассеты';
  };

  const setCharacterAssetUsage = async (
    role: 'portrait' | 'token',
    assetId: string | null
  ) => {
    if (!editingId) return;
    const links = linksForCharacter(editingId);
    const existing = findAssetUsageLink(links, role);

    if (!assetId) {
      if (existing) await onDeleteMaterialLink(existing.id);
      return;
    }

    if (existing && existing.targetId !== assetId) {
      await onDeleteMaterialLink(existing.id);
    }

    await onCreateMaterialLink(
      'character',
      editingId,
      buildAssetUsagePayload(assetId, role)
    );
  };

  const inventorySlots = 12;

  const handleOpenEdit = (char: Character) => { setEditingId(char.id); setFormData({ ...char }); setIsModalOpen(true); };
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      ...EMPTY_CHARACTER,
      groupId: currentGroupId
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!initialCharacterId) return;
    if (initialCharacterAppliedRef.current === initialCharacterId) return;
    const target = data.find((character) => character.id === initialCharacterId);
    if (!target) return;
    initialCharacterAppliedRef.current = initialCharacterId;
    setEditingId(target.id);
    setFormData({ ...target });
    setIsModalOpen(true);
  }, [data, initialCharacterId]);

  const handleSave = async () => {
    if (!formData.name) return;
    const payload = {
      name: formData.name,
      role: formData.role ?? 'NPC',
      race: formData.race ?? '',
      description: formData.description ?? '',
      stats: formData.baseStats ?? { ...EMPTY_STATS },
      inventory: formData.inventory ?? [],
      group_id: formData.groupId ?? null
    };

    try {
      if (editingId) {
        const updated = await apiRequest(`/characters/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        const mapped = mapCharacterFromApi(updated);
        onUpdate(data.map(c => c.id === mapped.id ? mapped : c));
      } else {
        const created = await apiRequest('/characters', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const mapped = mapCharacterFromApi(created);
        onUpdate([...data, mapped]);
      }
      setIsModalOpen(false);
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить персонажа?')) return;
    try {
      await apiRequest(`/characters/${id}`, { method: 'DELETE' });
      onUpdate(data.filter(c => c.id !== id));
      librarySelection.clearSelection();
      moveBuffer.removeIds([id]);
    } catch {
      // ignore
    }
  };

  const toggleInventoryItem = (id: string) => {
    const inv = [...(formData.inventory || [])];
    const index = inv.indexOf(id);
    if (index > -1) inv.splice(index, 1);
    else {
      if (inv.length >= inventorySlots) return alert('ИНВЕНТАРЬ ПЕРЕПОЛНЕН');
      inv.push(id);
    }
    setFormData({ ...formData, inventory: inv });
  };

  const hasLibraryFilters = searchQuery.trim().length > 0 || Boolean(selectedTagFilter) || activeRole !== 'all';
  const currentCharacterGroup = currentGroupId ? characterGroups.find((group) => group.id === currentGroupId) : null;
  const visibleCharacterGroups = libraryIsRoot && !hasLibraryFilters ? characterGroups : [];
  const characterGroupCountById = new Map(characterGroups.map((group) => [
    group.id,
    data.filter((character) => character.groupId === group.id).length
  ]));

  const filteredCharacters = data
    .filter(c => {
      const assignedTags = tagAssignments[tagAssignmentKey('character', c.id)] ?? [];
      const matchesContext = libraryIsRoot ? !c.groupId : c.groupId === currentGroupId;
      return matchesContext &&
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (activeRole === 'all' || c.role === activeRole) &&
        (!selectedTagFilter || assignedTags.some((tag) => tag.id === selectedTagFilter));
    })
    .sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  const visibleCharacterIds = filteredCharacters.map((character) => character.id);
  const visibleCharacterIdKey = visibleCharacterIds.join('|');
  const isCharacterLibraryFilteredEmpty = data.length > 0 && filteredCharacters.length === 0 && hasLibraryFilters;
  const characterLibraryEmptyTitle = isCharacterLibraryFilteredEmpty
    ? 'Ничего не найдено'
    : libraryIsRoot
      ? 'Персонажей пока нет'
      : 'В группе пока нет персонажей';
  const characterLibraryEmptyDescription = isCharacterLibraryFilteredEmpty
    ? 'Попробуйте изменить поиск, тег или фильтр роли.'
    : libraryIsRoot
      ? 'Чтобы создать персонажа или группу, нажмите правой кнопкой мыши по этой области.'
      : 'Чтобы создать персонажа в текущей группе, нажмите правой кнопкой мыши по этой области.';

  useEffect(() => {
    librarySelection.pruneSelection(visibleCharacterIds);
  }, [librarySelection, visibleCharacterIdKey, visibleCharacterIds]);

  const createGroup = async () => {
    const created = await onCreateCharacterGroup();
    openGroup(created.id);
    librarySelection.clearSelection();
    startRenameGroup(created);
  };

  const startRenameGroup = (group: CharacterGroup) => {
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
    if (name) await onUpdateCharacterGroup(groupId, { name });
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Удалить группу? Персонажи останутся без группы.')) return;
    await onDeleteCharacterGroup(groupId);
    if (currentGroupId === groupId) returnToRoot();
    if (renamingGroupId === groupId) cancelRenameGroup();
    librarySelection.clearSelection();
  };

  const cutCharactersToClipboard = (characterId?: string | null) => {
    const existingIds = new Set(data.map((character) => character.id));
    const targetIds = librarySelection
      .getActionTargetIds(characterId)
      .filter((id) => existingIds.has(id));

    if (targetIds.length === 0) return;
    moveBuffer.cut(targetIds);
  };

  const moveCharactersToGroup = async (characterIds: string[], targetGroupId: string | null) => {
    const existingIds = new Set(data.map((character) => character.id));
    const targetIds = characterIds.filter((id) => existingIds.has(id));
    if (targetIds.length === 0) return;

    const updatedCharacters = await Promise.all(
      targetIds.map(async (characterId) => {
        const updated = await apiRequest(`/characters/${characterId}`, {
          method: 'PATCH',
          body: JSON.stringify({ group_id: targetGroupId })
        });
        return mapCharacterFromApi(updated);
      })
    );
    const updatedById = new Map(updatedCharacters.map((character) => [character.id, character]));
    onUpdate(data.map((character) => updatedById.get(character.id) ?? character));
  };

  const pasteCharactersToGroup = async (targetGroupId: string | null) => {
    try {
      await moveBuffer.paste(async (bufferedIds) => {
        await moveCharactersToGroup(bufferedIds, targetGroupId);
      });
      librarySelection.clearSelection();
    } catch {
      // ignore
    }
  };

  const libraryDragDrop = useEntityLibraryDragDrop({
    getDragItemIds: (characterId) => librarySelection.getActionTargetIds(characterId),
    onDropItems: async ({ itemIds, targetGroupId }) => {
      try {
        await moveCharactersToGroup(itemIds, targetGroupId);
        librarySelection.clearSelection();
      } catch {
        // ignore
      }
    }
  });

  const getCharacterLibraryContextSections = (): EntityLibraryActionSection[] => {
    const context = libraryContextMenu.contextMenu;
    if (!context) return [];

    if (context.kind === 'workspace') {
      return [
        {
          actions: [
            { id: 'create-character', label: 'Создать персонажа', icon: <UserPlus size={13} />, onSelect: handleOpenCreate },
            { id: 'create-group', label: 'Создать группу', icon: <FolderPlus size={13} />, hidden: !libraryIsRoot, onSelect: () => void createGroup() },
            { id: 'paste-character', label: context.groupId ? 'Вставить сюда' : 'Вставить в корень', icon: <ClipboardPaste size={13} />, disabled: moveBuffer.count === 0, onSelect: () => void pasteCharactersToGroup(context.groupId) }
          ]
        }
      ];
    }

    if (context.kind === 'group') {
      const group = characterGroups.find((candidate) => candidate.id === context.groupId);
      return [
        {
          actions: [
            { id: 'open-group', label: 'Открыть группу', icon: <FolderOpen size={13} />, onSelect: () => { openGroup(context.groupId); librarySelection.clearSelection(); } },
            { id: 'rename-group', label: 'Переименовать', icon: <Pencil size={13} />, disabled: !group, onSelect: () => { if (group) startRenameGroup(group); } },
            { id: 'paste-to-group', label: 'Вставить в группу', icon: <ClipboardPaste size={13} />, disabled: moveBuffer.count === 0, onSelect: () => void pasteCharactersToGroup(context.groupId) }
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
          { id: 'open-character', label: 'Редактировать', icon: <Edit3 size={13} />, onSelect: () => { const character = data.find((candidate) => candidate.id === context.itemId); if (character) handleOpenEdit(character); } },
          { id: 'cut-character', label: targetIds.length > 1 ? 'Вырезать выбранное' : 'Вырезать', icon: <Scissors size={13} />, onSelect: () => cutCharactersToClipboard(context.itemId) }
        ]
      },
      {
        actions: [
          { id: 'delete-character', label: 'Удалить', icon: <Trash2 size={13} />, destructive: true, onSelect: () => void handleDelete(context.itemId) }
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
    onOpenSelected: (characterId) => {
      const character = data.find((candidate) => candidate.id === characterId);
      if (character) handleOpenEdit(character);
    },
    onDeleteSelected: (characterId) => void handleDelete(characterId)
  });

  return (
    <div className="flex h-full w-full flex-col bg-[var(--bg-main)] bauhaus-bg">
      <div className="shrink-0 px-8 pb-5 pt-7">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div className="flex flex-col gap-4">
            <SectionHeader title="РЕЕСТР СУЩЕСТВ" subtitle="NPC И ГЕРОИ ТЕКУЩЕГО МИРА" accentColor={SECTION_ACCENT} />
            {!libraryIsRoot && currentCharacterGroup && (
              <div className="mono flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-[var(--text-muted)]">
                <button
                  type="button"
                  onClick={() => {
                    returnToRoot();
                    librarySelection.clearSelection();
                  }}
                  className="transition-colors hover:text-[var(--col-yellow)]"
                >
                  Персонажи
                </button>
                <span>/</span>
                <span className="text-[var(--text-main)]">{currentCharacterGroup.name}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-[240px] flex-1">
              <SearchInput value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ИМЯ..." accentColor={SECTION_ACCENT} />
            </div>
            <div className="min-w-[190px]">
              <TagFilter tags={tags} value={selectedTagFilter} onChange={setSelectedTagFilter} accentColor={SECTION_ACCENT} />
            </div>
            <div className="min-w-[180px]">
              <Select
                value={activeRole}
                onChange={(value) => setActiveRole(value as 'all' | 'Герой' | 'NPC' | 'Монстр')}
                options={ROLE_FILTER_OPTIONS}
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
                className="h-11 border-2 border-[var(--border-color)] px-4 mono text-[10px] font-black uppercase text-[var(--text-muted)] transition-colors hover:border-[var(--col-yellow)] hover:text-[var(--col-yellow)]"
              >
                Все персонажи
              </button>
            )}
            <div className="flex-1" />
            <Button color="yellow" onClick={handleOpenCreate}><UserPlus size={16} /> НОВЫЙ ГЕРОЙ</Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-8 pb-8 pt-3">
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-3">
          {moveBuffer.count > 0 && (
            <div className="flex flex-wrap items-center gap-3 border border-[var(--col-yellow)]/50 bg-[var(--col-yellow)]/10 px-4 py-3">
              <div className="mono text-[10px] font-black uppercase tracking-[0.12em] text-[var(--col-yellow)]">
                Вырезано: {moveBuffer.count}
              </div>
              <div className="flex-1" />
              <button type="button" onClick={() => void pasteCharactersToGroup(currentGroupId)} className="mono flex items-center gap-2 text-[10px] font-black uppercase text-[var(--text-main)] hover:text-[var(--col-yellow)]">
                <ClipboardPaste size={13} /> Вставить сюда
              </button>
              <button type="button" onClick={moveBuffer.cancel} className="mono flex items-center gap-2 text-[10px] font-black uppercase text-[var(--text-muted)] hover:text-[var(--col-red)]">
                <X size={13} /> Отменить
              </button>
            </div>
          )}
          <EntityLibraryWorkspace<Character, CharacterGroup>
            items={filteredCharacters}
            groups={visibleCharacterGroups}
            getItemId={(character) => character.id}
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
            onSelectItem={(characterId, _character, event) => librarySelection.selectFromEvent(characterId, event, visibleCharacterIds)}
            onOpenItem={(_characterId, character) => handleOpenEdit(character)}
            onOpenGroup={(groupId) => {
              openGroup(groupId);
              librarySelection.clearSelection();
            }}
            onClearSelection={librarySelection.clearSelection}
            onWorkspaceContextMenu={(context) => libraryContextMenu.setContextMenu(context)}
            onItemContextMenu={(characterId, _character, event) => {
              if (!librarySelection.isSelected(characterId)) librarySelection.replaceSelection(characterId);
              libraryContextMenu.openItemMenu(event, characterId, currentGroupId);
            }}
            onGroupContextMenu={(groupId, _group, event) => {
              librarySelection.clearSelection();
              libraryContextMenu.openGroupMenu(event, groupId);
            }}
            onItemDragStart={(characterId, _character, event) => {
              if (!librarySelection.isSelected(characterId)) librarySelection.replaceSelection(characterId);
              libraryDragDrop.handleItemDragStart(characterId, event);
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
                count={characterGroupCountById.get(group.id) ?? 0}
                countLabel={(characterGroupCountById.get(group.id) ?? 0) === 0 ? 'ПУСТО' : 'ПЕРСОНАЖЕЙ'}
                accentColor={SECTION_ACCENT}
                dragOver={state.dragOver}
              />
            )}
            renderItem={(char, state) => {
              const { effective: eff, bonus: bns } = calculateEffectiveStats(char);
              const accent = ROLE_COLORS[char.role as keyof typeof ROLE_COLORS] || 'var(--col-blue)';
              const portraitAsset = findAssetForUsage(linksForCharacter(char.id), assets, 'portrait');

              return (
                <EntityLibraryCard
                  title={char.name}
                  accentColor={accent}
                  selected={state.selected}
                  cut={state.cut}
                  dragging={state.dragging}
                  headerExtra={(
                    <div className="flex items-center gap-2">
                      {state.cut && <span className="mono text-[8px] font-black uppercase text-[var(--col-yellow)]">ВЫРЕЗАНО</span>}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(char.id);
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
                      src={portraitAsset?.url}
                      alt={portraitAsset?.name ?? char.name}
                      emptyLabel="ПОРТРЕТ НЕ ВЫБРАН"
                      accentColor={accent}
                    />
                    <div className="flex justify-between gap-3">
                      <span className="mono text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: accent }}>{char.role}</span>
                      <span className="mono truncate text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{char.groupId ? characterGroups.find((group) => group.id === char.groupId)?.name ?? 'ГРУППА' : 'БЕЗ ГРУППЫ'}</span>
                    </div>
                    <p className="line-clamp-3 border-l border-[var(--border-color)] py-1 pl-4 text-left mono text-[11px] leading-relaxed text-[var(--text-main)] opacity-70">{char.description || 'БИОГРАФИЯ НЕ ЗАПОЛНЕНА'}</p>
                    <div className="flex flex-wrap gap-2 pt-1">{['АТК', 'ЗАЩ', 'СИЛ'].map(sk => (<StatBadge key={sk} stat={sk as StatKey} value={eff[sk as StatKey]} bonus={bns[sk as StatKey]} showBonus={false} accentColor={accent} />))}</div>
                    <div className="flex justify-end border-t border-[var(--border-color)] pt-4">
                      <div className="flex items-center justify-end gap-2"><Package size={14} className="text-[var(--col-yellow)]" /><span className="mono text-[10px] font-black uppercase text-[var(--col-yellow)]">{char.inventory.length} / {inventorySlots}</span></div>
                    </div>
                  </div>
                </EntityLibraryCard>
              );
            }}
            emptyTitle={characterLibraryEmptyTitle}
            emptyDescription={characterLibraryEmptyDescription}
            emptyAction={isCharacterLibraryFilteredEmpty ? null : <Button color="yellow" onClick={handleOpenCreate}><UserPlus size={16} /> НОВЫЙ ГЕРОЙ</Button>}
          />
          <EntityLibraryContextMenu
            context={libraryContextMenu.contextMenu}
            sections={getCharacterLibraryContextSections()}
            accentColor={SECTION_ACCENT}
            onClose={libraryContextMenu.closeContextMenu}
          />
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="ПРОФИЛЬ СУЩЕСТВА" accentColor={SECTION_ACCENT} maxWidth="max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">Имя персонажа</label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} accentColor={SECTION_ACCENT} className="h-10 text-sm uppercase font-black" /></div>
              <div className="space-y-1.5"><label className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">Роль</label><Select value={formData.role} onChange={v => setFormData({...formData, role: v as any})} options={[{value:'NPC', label:'NPC'},{value:'Герой', label:'ГЕРОЙ'},{value:'Монстр', label:'МОНСТР'}]} accentColor={SECTION_ACCENT} /></div>
            </div>
            <div className="space-y-1.5">
              <label className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">Группа</label>
              <Select
                value={formData.groupId ?? ''}
                onChange={(value) => setFormData({ ...formData, groupId: value || null })}
                options={[{ value: '', label: 'БЕЗ ГРУППЫ' }, ...characterGroups.map((group) => ({ value: group.id, label: group.name.toUpperCase() }))]}
                accentColor={SECTION_ACCENT}
              />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2"><label className="mono text-[10px] uppercase font-black text-[var(--text-muted)] flex items-center gap-2"><Zap size={12} /> Базовые атрибуты</label><span className="mono text-[9px] font-black text-[var(--text-muted)]">БАЗА (+БОНУС)</span></div>
              <div className="grid grid-cols-3 gap-4">
                {STAT_KEYS.map(sk => { const { bonus: bns } = calculateEffectiveStats(formData); return (
                    <div
                      key={sk}
                      title={STAT_HINTS[sk]}
                      className="group/stat-field relative space-y-1.5 p-3 border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-surface)] transition-all"
                    >
                      <div className="flex justify-between items-center"><label className="mono text-[9px] font-black text-[var(--text-muted)]">{sk}</label><div className="mono text-[10px] font-black"><span className="text-[var(--text-main)]">{formData.baseStats?.[sk]}</span>{bns[sk] > 0 && <span className="text-[var(--col-yellow)] ml-1">+{bns[sk]}</span>}</div></div>
                      <input type="number" value={formData.baseStats?.[sk]} onChange={e => { const newStats = { ...formData.baseStats } as any; newStats[sk] = parseInt(e.target.value) || 0; setFormData({...formData, baseStats: newStats}); }} className="w-full bg-transparent border-none mono text-xs font-black text-[var(--col-yellow)] focus:outline-none p-0 h-6" />
                      <div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-64 border border-[var(--border-color)] bg-[#050505] p-3 mono text-[9px] uppercase leading-relaxed text-[var(--text-main)] shadow-2xl group-hover/stat-field:block">
                        {STAT_HINTS[sk]}
                      </div>
                    </div>
                ); })}
              </div>
            </div>
            <div className="space-y-1.5"><label className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">История</label><TextArea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="h-24" accentColor={SECTION_ACCENT} /></div>
            {editingId && formData.groupId && (
              <AssetCollectionTargetPicker
                label="Наборы ассетов персонажа"
                collections={assetCollections}
                value={collectionIdsForCharacterGroup(formData.groupId)}
                accentColor={SECTION_ACCENT}
                onChange={(collectionIds) => onReplaceAssetCollections('character_group', formData.groupId!, collectionIds)}
              />
            )}
            {editingId && !formData.groupId && collectionIdsForCharacter(editingId).length > 0 && (
              <AssetCollectionTargetPicker
                label="Прямые наборы карточки"
                collections={assetCollections}
                value={collectionIdsForCharacter(editingId)}
                accentColor={SECTION_ACCENT}
                onChange={(collectionIds) => onReplaceAssetCollections('character', editingId, collectionIds)}
              />
            )}
            {editingId && (
              <div className="mono text-[9px] uppercase text-[var(--text-muted)]">{assetSourceLabelForCharacter(formData)}</div>
            )}
            {editingId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AssetUsagePicker
                  label="Портрет"
                  assets={assets}
                  value={findAssetUsageLink(linksForCharacter(editingId), 'portrait')?.targetId ?? null}
                  allowedKinds={['portrait']}
                  collectionIds={effectiveCollectionIdsForCharacter(formData)}
                  accentColor={SECTION_ACCENT}
                  onChange={(assetId) => setCharacterAssetUsage('portrait', assetId)}
                />
                <AssetUsagePicker
                  label="Токен"
                  assets={assets}
                  value={findAssetUsageLink(linksForCharacter(editingId), 'token')?.targetId ?? null}
                  allowedKinds={['token']}
                  collectionIds={effectiveCollectionIdsForCharacter(formData)}
                  accentColor={SECTION_ACCENT}
                  onChange={(assetId) => setCharacterAssetUsage('token', assetId)}
                />
              </div>
            )}
            {editingId && (
              <TagPicker
                allTags={tags}
                selectedTags={tagAssignments[tagAssignmentKey('character', editingId)] ?? []}
                accentColor={SECTION_ACCENT}
                onReplaceTags={(tagIds, newTags) => onReplaceTargetTags('character', editingId, tagIds, newTags)}
                onUpdateTag={onUpdateTag}
                onDeleteTag={onDeleteTag}
              />
            )}
            {editingId && (
              <PublicationPanel
                targetType="character"
                targetId={editingId}
                publication={publicationAssignments[publicationAssignmentKey('character', editingId)]}
                accentColor={SECTION_ACCENT}
                onUpsertPublication={onUpsertPublication}
                onUpdatePublication={onUpdatePublication}
                onDeletePublication={onDeletePublication}
              />
            )}
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-4">
               <div className="flex justify-between items-end"><label className="mono text-[10px] uppercase font-black text-[var(--text-muted)] flex items-center gap-2"><Package size={14} /> Инвентарь</label><span className="mono text-[10px] font-black text-[var(--text-muted)]">{formData.inventory?.length} / {inventorySlots} СЛОТОВ</span></div>
               <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {formData.inventory?.map((id, idx) => { const item = items.find(i => i.id === id); if (!item) return null; return (
                      <div key={idx} className="flex items-center justify-between p-3 border border-[var(--border-color)] bg-[var(--bg-main)] animate-appear">
                        <div className="flex items-center gap-3 truncate"><div className="w-1 h-6 shrink-0" style={{ backgroundColor: RARITY_COLORS[item.rarity] }} /><div className="truncate"><div className="mono text-[9px] font-black uppercase text-[var(--text-main)] truncate">{item.name}</div><div className="flex flex-wrap gap-2 items-center"><span className="mono text-[7px] text-[var(--text-muted)] uppercase">{item.weight} КГ</span>{item.modifiers.length > 0 && (<div className="flex gap-1.5">{item.modifiers.map((mod, mi) => (<span key={mi} className="mono text-[7px] text-[var(--col-yellow)] uppercase font-black">{mod.stat} +{mod.value}</span>))}</div>)}</div></div></div>
                        <button onClick={() => toggleInventoryItem(id)} className="text-[var(--text-muted)] hover:text-[var(--col-red)] transition-colors"><X size={14} /></button>
                      </div>
                  ); })}
               </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
              <label className="mono text-[9px] uppercase font-black text-[var(--text-muted)] flex items-center gap-2">Доступные предметы</label>
              <div className="space-y-2">
                {items.filter(i => !formData.inventory?.includes(i.id)).slice(0, 3).map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleInventoryItem(item.id)}
                    className="w-full flex items-center justify-between p-3 border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-main)] group transition-all"
                  >
                    <div className="flex flex-col items-start gap-1 truncate pr-2"><span className="mono text-[9px] font-black text-[var(--text-muted)] group-hover:text-[var(--text-main)] uppercase truncate">{item.name}</span></div>
                    <Plus size={14} className="text-[var(--text-muted)] group-hover:text-[var(--col-yellow)] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-4 pt-10 border-t border-[var(--border-color)] mt-8">
          <button onClick={() => setIsModalOpen(false)} className="flex-1 h-12 border border-[var(--border-color)] mono text-[10px] font-black uppercase hover:bg-[var(--bg-main)] transition-all text-[var(--text-muted)]">Отмена</button>
          <Button color="yellow" className="flex-[2] h-12" onClick={handleSave}><Save size={18} /> ЗАПИСАТЬ В РЕЕСТР</Button>
        </div>
      </Modal>
    </div>
  );
};

export default CharactersEditor;
