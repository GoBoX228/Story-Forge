
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { BaseCard } from './BaseCard';
import { Button, Input, SearchInput, Select, TextArea, AddTile, SectionHeader, StatBadge } from './UI';
import { Modal } from './Modal';
import {
  Asset,
  Character,
  EntityLink,
  EntityLinkAssignmentMap,
  EntityLinkCreatePayload,
  EntityLinkTargetType,
  EntityLinkUpdatePayload,
  Faction,
  Item,
  ItemRarity,
  ItemType,
  MapData,
  PublishedContent,
  PublicationAssignmentMap,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload,
  Scenario,
  StatModifier,
  StatKey,
  Tag,
  TagAssignmentMap,
  TaggableTargetType,
  WorldEvent,
  WorldLocation
} from '../types';
import { entityLinkAssignmentKey, publicationAssignmentKey, tagAssignmentKey } from '../lib/mappers';
import { buildAssetUsagePayload, findAssetForUsage, findAssetUsageLink, isAssetUsageLink } from '../lib/assetUsage';
import { TagFilter, TagPicker } from './TagPicker';
import { EntityLinksPanel } from './EntityLinksPanel';
import { AssetUsagePicker } from './AssetUsagePicker';
import { PublicationPanel } from './PublicationPanel';
import { Scale, Coins, Edit3, Trash2, Zap, Plus } from 'lucide-react';

interface ItemsEditorProps {
  data: Item[];
  onUpdate: (data: Item[]) => void;
  onCreateItem?: (payload: Omit<Item, 'id'>) => Promise<Item>;
  onUpdateItem?: (id: string, payload: Omit<Item, 'id'>) => Promise<Item>;
  onDeleteItem?: (id: string) => Promise<void>;
  scenarios: Scenario[];
  maps: MapData[];
  characters: Character[];
  assets: Asset[];
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
  tags: Tag[];
  tagAssignments: TagAssignmentMap;
  entityLinks: EntityLinkAssignmentMap;
  publicationAssignments: PublicationAssignmentMap;
  onReplaceTargetTags: (type: TaggableTargetType, id: string, tagIds: string[], newTags?: string[]) => Promise<Tag[]>;
  onUpdateTag: (id: string, name: string) => Promise<Tag>;
  onDeleteTag: (id: string) => Promise<void>;
  onCreateMaterialLink: (sourceType: EntityLinkTargetType, sourceId: string, payload: EntityLinkCreatePayload) => Promise<EntityLink>;
  onUpdateMaterialLink: (id: string, payload: EntityLinkUpdatePayload) => Promise<EntityLink>;
  onDeleteMaterialLink: (id: string) => Promise<void>;
  onUpsertPublication: (type: PublicationTargetType, id: string, payload: PublicationUpsertPayload) => Promise<PublishedContent>;
  onUpdatePublication: (id: string, payload: PublicationUpdatePayload) => Promise<PublishedContent>;
  onDeletePublication: (id: string) => Promise<void>;
  onOpenMaterialLink?: (targetType: EntityLinkTargetType, targetId: string) => void;
  initialItemId?: string | null;
}

const SECTION_ACCENT = 'var(--col-blue)';
const RARITY_COLORS: Record<ItemRarity, string> = { 'Легендарный': 'var(--col-yellow)', 'Эпический': 'var(--col-purple)', 'Редкий': 'var(--col-red)', 'Необычный': 'var(--col-blue)', 'Обычный': 'var(--col-grey)' };
const RARITY_SHADOWS: Record<ItemRarity, string> = { 'Легендарный': 'rgba(122, 92, 0, 0.6)', 'Эпический': 'rgba(60, 19, 122, 0.6)', 'Редкий': 'rgba(107, 20, 27, 0.6)', 'Необычный': 'rgba(26, 42, 140, 0.6)', 'Обычный': 'rgba(88, 88, 88, 0.4)' };
const STAT_OPTIONS: StatKey[] = ['АТК', 'ЗАЩ', 'СИЛ', 'ЛОВ', 'ВЫН', 'ИНТ', 'МДР', 'ХАР', 'УДЧ'];
const ITEM_TYPE_OPTIONS = [{ value: 'Оружие', label: 'ОРУЖИЕ' }, { value: 'Снаряжение', label: 'СНАРЯЖЕНИЕ' }, { value: 'Артефакт', label: 'АРТЕФАКТ' }, { value: 'Расходник', label: 'РАСХОДНИК' }, { value: 'Прочее', label: 'ПРОЧЕЕ' }];
const RARITY_OPTIONS = [{ value: 'Обычный', label: 'ОБЫЧНЫЙ' }, { value: 'Необычный', label: 'НЕОБЫЧНЫЙ' }, { value: 'Редкий', label: 'РЕДКИЙ' }, { value: 'Эпический', label: 'ЭПИЧЕСКИЙ' }, { value: 'Легендарный', label: 'ЛЕГЕНДАРНЫЙ' }];
const EMPTY_ITEM: Partial<Item> = { name: '', type: 'Оружие', rarity: 'Обычный', description: '', modifiers: [], weight: 0, value: 0 };

const ItemsEditor: React.FC<ItemsEditorProps> = ({
  data,
  onUpdate,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  scenarios,
  maps,
  characters,
  assets,
  locations,
  factions,
  events,
  tags,
  tagAssignments,
  entityLinks,
  publicationAssignments,
  onReplaceTargetTags,
  onUpdateTag,
  onDeleteTag,
  onCreateMaterialLink,
  onUpdateMaterialLink,
  onDeleteMaterialLink,
  onUpsertPublication,
  onUpdatePublication,
  onDeletePublication,
  onOpenMaterialLink,
  initialItemId
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ItemRarity | 'ВСЕ'>('ВСЕ');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('NAME_ASC');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<Item>>(EMPTY_ITEM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const initialItemAppliedRef = useRef<string | null>(null);
  const currentRarityAccent = RARITY_COLORS[formData.rarity as ItemRarity || 'Обычный'];

  const linksForItem = (itemId: string) =>
    entityLinks[entityLinkAssignmentKey('item', itemId)] ?? [];

  const setItemAssetUsage = async (assetId: string | null) => {
    if (!editingId) return;
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

  const openCreateModal = () => { setEditingId(null); setFormData(EMPTY_ITEM); setIsModalOpen(true); };
  const openEditModal = (item: Item) => { setEditingId(item.id); setFormData({ ...item }); setIsModalOpen(true); };

  useEffect(() => {
    if (!initialItemId) return;
    if (initialItemAppliedRef.current === initialItemId) return;
    const target = data.find((item) => item.id === initialItemId);
    if (!target) return;
    initialItemAppliedRef.current = initialItemId;
    setEditingId(target.id);
    setFormData({ ...target });
    setIsModalOpen(true);
  }, [data, initialItemId]);

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
        await onCreateItem(payload);
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

  const filteredItems = data
    .filter(item => {
      const assignedTags = tagAssignments[tagAssignmentKey('item', item.id)] ?? [];
      return (activeFilter === 'ВСЕ' || item.rarity === activeFilter) &&
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (!selectedTagFilter || assignedTags.some((tag) => tag.id === selectedTagFilter));
    })
    .sort((a, b) => {
      if (sortOrder === 'NAME_ASC') return a.name.localeCompare(b.name);
      if (sortOrder === 'VALUE_DESC') return b.value - a.value;
      if (sortOrder === 'WEIGHT_DESC') return b.weight - a.weight;
      return 0;
    });

  const getButtonColor = (rarity: ItemRarity = 'Обычный'): "blue" | "yellow" | "purple" | "red" | "white" | "grey" => {
    if (rarity === 'Легендарный') return 'yellow'; if (rarity === 'Эпический') return 'purple'; if (rarity === 'Редкий') return 'red'; if (rarity === 'Необычный') return 'blue'; return 'grey';
  };

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 bg-[var(--bg-main)] overflow-auto p-12 bauhaus-bg relative">
        <div className="max-w-6xl mx-auto">
          <SectionHeader title="СКЛАД ТВОРЦА" subtitle="РЕЕСТР СНАРЯЖЕНИЯ" accentColor={SECTION_ACCENT} actions={<Button color="blue" size="lg" onClick={openCreateModal}><Plus size={18} /> СОЗДАТЬ ПРЕДМЕТ</Button>} />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            {filteredItems.map(item => {
              const itemImage = findAssetForUsage(linksForItem(item.id), assets, 'item_image');
              return (
              <BaseCard key={item.id} title={item.name} accentColor={RARITY_COLORS[item.rarity]}>
                <div className="space-y-4 flex flex-col h-full">
                  {itemImage?.url && (
                    <div className="relative h-32 border border-[var(--border-color)] bg-black overflow-hidden">
                      <Image
                        src={itemImage.url}
                        alt={itemImage.name}
                        fill
                        sizes="360px"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center"><span className="mono text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: RARITY_COLORS[item.rarity] }}>{item.rarity}</span><span className="mono text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-widest">{item.type}</span></div>
                  <div className="relative pl-6 py-1 border-l border-[var(--border-color)]"><p className="text-[11px] text-[var(--text-main)] opacity-60 mono leading-relaxed text-left">{item.description || 'ОПИСАНИЕ ОТСУТСТВУЕТ'}</p></div>
                  {item.modifiers?.length > 0 && (<div className="flex flex-wrap gap-2 pt-1">{item.modifiers.map((mod, idx) => (<StatBadge key={idx} stat={mod.stat} value={mod.value} accentColor={RARITY_COLORS[item.rarity]} />))}</div>)}
                  <div className="flex-1 min-h-[10px]" />
                  <div className="grid grid-cols-2 gap-4 border-t border-[var(--border-color)] pt-4"><div className="flex items-center gap-2"><Scale size={14} className="text-[var(--text-muted)]" /><span className="mono text-[10px] uppercase font-black text-[var(--text-main)] opacity-80">{item.weight} КГ</span></div><div className="flex items-center gap-2 justify-end"><Coins size={14} className="text-[var(--col-yellow)]" /><span className="mono text-[10px] uppercase font-black text-[var(--col-yellow)]">{item.value} GP</span></div></div>
                  <div className="flex flex-col gap-2"><Button inverted color={getButtonColor(item.rarity)} className="w-full h-12" onClick={() => openEditModal(item)}><Edit3 size={14} /> РЕДАКТИРОВАТЬ</Button><button onClick={() => handleDelete(item.id)} className="py-2 mono text-[8px] uppercase font-black text-[var(--text-muted)] hover:text-[var(--col-red)] transition-colors self-center">УДАЛИТЬ ПРЕДМЕТ</button></div>
                </div>
              </BaseCard>
              );
            })}
            <AddTile label="ДОБАВИТЬ ПРЕДМЕТ" accentColor={SECTION_ACCENT} onClick={openCreateModal} />
          </div>
        </div>
      </div>
      <div className="w-80 bg-[var(--bg-surface)] border-l-4 border-[var(--col-blue)] flex flex-col p-8 space-y-10 z-10 overflow-y-auto">
        <h2 className="text-4xl font-black uppercase tracking-tighter text-[var(--col-blue)] glitch-text leading-none">АРСЕНАЛ</h2>
        <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ВВЕДИТЕ НАЗВАНИЕ..." accentColor={SECTION_ACCENT} />
        <TagFilter tags={tags} value={selectedTagFilter} onChange={setSelectedTagFilter} accentColor={SECTION_ACCENT} />
        <Select value={sortOrder} onChange={val => setSortOrder(val)} options={[{value:'NAME_ASC', label:'ИМЯ'}, {value:'VALUE_DESC', label:'ЦЕНА'}, {value:'WEIGHT_DESC', label:'ВЕС'}]} accentColor={SECTION_ACCENT} />
        <div className="space-y-5">
          <label className="mono text-[10px] text-[var(--col-blue)] uppercase tracking-[0.3em] font-black">ФИЛЬТР РЕДКОСТИ</label>
          <div className="flex flex-col gap-2">
            <button onClick={() => setActiveFilter('ВСЕ')} className={`px-4 py-3 border-2 mono text-[10px] uppercase text-left font-black transition-all ${activeFilter === 'ВСЕ' ? 'border-[var(--text-main)] bg-[var(--text-main)] text-[var(--bg-main)]' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--border-color-hover)]'}`}>ВСЕ КАТЕГОРИИ</button>
            {(Object.keys(RARITY_COLORS) as ItemRarity[]).map(r => (<button key={r} onClick={() => setActiveFilter(r)} style={{ color: activeFilter === r ? 'var(--text-inverted)' : RARITY_COLORS[r], borderColor: activeFilter === r ? RARITY_COLORS[r] : `color-mix(in srgb, ${RARITY_COLORS[r]} 20%, transparent)`, backgroundColor: activeFilter === r ? RARITY_COLORS[r] : 'transparent' }} className={`px-4 py-3 border-2 mono text-[10px] uppercase text-left font-black transition-all`}>{r}</button>))}
          </div>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "РЕДАКТИРОВАТЬ ПРЕДМЕТ" : "НОВЫЙ ПРЕДМЕТ"} accentColor={currentRarityAccent} shadowColor={RARITY_SHADOWS[formData.rarity as ItemRarity || 'Обычный']} maxWidth="max-w-3xl">
        <div className="space-y-6">
          {error && <div className="p-3 border border-[var(--col-red)] bg-[var(--col-red)]/10 mono text-[10px] uppercase font-black text-[var(--col-red)]">{error}</div>}
          <div className="space-y-1.5"><label className="mono text-[10px] uppercase block font-black tracking-[0.2em] text-[var(--text-muted)]">Наименование</label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="МОЛОТ ПРЕДКОВ" className="h-10 text-sm border-2 font-black uppercase" accentColor={currentRarityAccent}/></div>
          <div className="grid grid-cols-2 gap-6"><div className="space-y-1.5"><label className="mono text-[10px] uppercase block font-black tracking-[0.2em] text-[var(--text-muted)]">Тип</label><Select value={formData.type} onChange={val => setFormData({...formData, type: val as ItemType})} accentColor={currentRarityAccent} options={ITEM_TYPE_OPTIONS}/></div><div className="space-y-1.5"><label className="mono text-[10px] uppercase block font-black tracking-[0.2em] text-[var(--text-muted)]">Редкость</label><Select value={formData.rarity} onChange={val => setFormData({...formData, rarity: val as ItemRarity})} accentColor={currentRarityAccent} options={RARITY_OPTIONS}/></div></div>
          <div className="space-y-1.5"><label className="mono text-[10px] uppercase block font-black tracking-[0.2em] text-[var(--text-muted)]">Описание</label><TextArea placeholder="Опишите свойства предмета..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} accentColor={currentRarityAccent} className="min-h-[100px]"/></div>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2"><label className="mono text-[10px] uppercase font-black tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-2"><Zap size={12} style={{ color: currentRarityAccent }} /> Модификаторы</label><button onClick={addModifier} className="mono text-[10px] uppercase font-black transition-colors flex items-center gap-1.5 hover:brightness-125 group" style={{ color: currentRarityAccent }}><Plus size={14} className="group-hover:rotate-90 transition-transform" /> ДОБАВИТЬ</button></div>
            <div className="space-y-3">{(formData.modifiers && formData.modifiers.length > 0) ? (formData.modifiers.map((mod, idx) => (<div key={idx} className="flex gap-4 items-center animate-appear relative" style={{ zIndex: 100 - idx }}><div className="flex-[3]"><Select value={mod.stat} onChange={val => updateModifier(idx, 'stat', val as StatKey)} accentColor={currentRarityAccent} options={STAT_OPTIONS.map(opt => ({ value: opt, label: opt }))}/></div><div className="flex-1"><Input type="number" className="h-10 px-3 text-center border-2 font-black" value={mod.value} onChange={e => updateModifier(idx, 'value', parseInt(e.target.value) || 0)} accentColor={currentRarityAccent}/></div><button onClick={() => removeModifier(idx)} className="w-10 h-10 shrink-0 border-2 border-[var(--border-color)] flex items-center justify-center hover:border-[var(--col-red)] hover:text-[var(--col-red)] transition-all bg-[var(--bg-main)] active:scale-90 text-[var(--text-muted)]"><Trash2 size={16} /></button></div>))) : (<div className="py-8 border-2 border-dashed flex flex-col items-center justify-center gap-2 bauhaus-bg" style={{ borderColor: `color-mix(in srgb, ${currentRarityAccent} 20%, transparent)` }}><Zap size={16} className="text-[var(--text-muted)]" /><p className="mono text-[9px] uppercase font-black tracking-[0.2em] text-[var(--text-muted)] text-center px-4 leading-relaxed">СПИСОК МОДИФИКАТОРОВ ПУСТ.<br/>НАЖМИТЕ «ДОБАВИТЬ» ДЛЯ НАСТРОЙКИ ХАРАКТЕРИСТИК.</p></div>)}</div>
          </div>
          <div className="grid grid-cols-2 gap-6 border-t border-[var(--border-color)] pt-8 mt-4"><div className="space-y-1.5"><label className="mono text-[10px] uppercase block font-black tracking-[0.2em] text-[var(--text-muted)]">Вес (КГ)</label><Input type="number" step="0.1" className="h-10 border-2 font-black" value={formData.weight} onChange={e => setFormData({...formData, weight: parseFloat(e.target.value) || 0})} accentColor={currentRarityAccent} /></div><div className="space-y-1.5"><label className="mono text-[10px] uppercase block font-black tracking-[0.2em] text-[var(--text-muted)]">Цена (GP)</label><Input type="number" className="h-10 border-2 font-black" value={formData.value} onChange={e => setFormData({...formData, value: parseInt(e.target.value) || 0})} accentColor={currentRarityAccent} /></div></div>
          {editingId && (
            <AssetUsagePicker
              label="Изображение предмета"
              assets={assets}
              value={findAssetUsageLink(linksForItem(editingId), 'item_image')?.targetId ?? null}
              allowedTypes={['image', 'token']}
              accentColor={currentRarityAccent}
              onChange={setItemAssetUsage}
            />
          )}
          {editingId && (
            <TagPicker
              allTags={tags}
              selectedTags={tagAssignments[tagAssignmentKey('item', editingId)] ?? []}
              accentColor={currentRarityAccent}
              onReplaceTags={(tagIds, newTags) => onReplaceTargetTags('item', editingId, tagIds, newTags)}
              onUpdateTag={onUpdateTag}
              onDeleteTag={onDeleteTag}
            />
          )}
          {editingId && (
            <EntityLinksPanel
              sourceType="item"
              sourceId={editingId}
              links={linksForItem(editingId).filter((link) => !isAssetUsageLink(link))}
              scenarios={scenarios}
              maps={maps}
              characters={characters}
              items={data}
              assets={assets}
              locations={locations}
              factions={factions}
              events={events}
              accentColor={currentRarityAccent}
              onCreateLink={onCreateMaterialLink}
              onUpdateLink={onUpdateMaterialLink}
              onDeleteLink={onDeleteMaterialLink}
              onOpenLink={onOpenMaterialLink}
            />
          )}
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
