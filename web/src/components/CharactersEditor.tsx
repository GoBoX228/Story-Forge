
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { BaseCard } from './BaseCard';
import { Button, Input, SearchInput, Select, AddTile, SectionHeader, StatBadge, TextArea } from './UI';
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
  StatKey,
  ItemRarity,
  MapData,
  PublishedContent,
  PublicationAssignmentMap,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload,
  Scenario,
  Tag,
  TagAssignmentMap,
  TaggableTargetType,
  WorldEvent,
  WorldLocation
} from '../types';
import { apiRequest } from '../lib/api';
import { entityLinkAssignmentKey, mapCharacterFromApi, publicationAssignmentKey, tagAssignmentKey } from '../lib/mappers';
import { buildAssetUsagePayload, findAssetForUsage, findAssetUsageLink, isAssetUsageLink } from '../lib/assetUsage';
import { TagFilter, TagPicker } from './TagPicker';
import { EntityLinksPanel } from './EntityLinksPanel';
import { AssetUsagePicker } from './AssetUsagePicker';
import { PublicationPanel } from './PublicationPanel';
import { UserPlus, Zap, Edit3, Save, Scale, Package, Plus, X } from 'lucide-react';

interface CharactersEditorProps {
  data: Character[];
  onUpdate: (data: Character[]) => void;
  items: Item[];
  scenarios: Scenario[];
  maps: MapData[];
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
  initialCharacterId?: string | null;
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

const ROLE_COLORS = { 'Герой': 'var(--col-yellow)', 'NPC': 'var(--col-purple)', 'Монстр': 'var(--col-red)', 'ВСЕ': 'var(--col-white)' };

const EMPTY_STATS: Record<StatKey, number> = { 'АТК': 10, 'ЗАЩ': 10, 'СИЛ': 10, 'ЛОВ': 10, 'ВЫН': 10, 'ИНТ': 10, 'МДР': 10, 'ХАР': 10, 'УДЧ': 10 };

const EMPTY_CHARACTER: Partial<Character> = { name: '', role: 'NPC', race: 'ЧЕЛОВЕК', description: '', level: 1, baseStats: { ...EMPTY_STATS }, inventory: [] };

const CharactersEditor: React.FC<CharactersEditorProps> = ({
  data,
  onUpdate,
  items,
  scenarios,
  maps,
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
  initialCharacterId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [activeRole, setActiveRole] = useState<'ВСЕ' | 'Герой' | 'NPC' | 'Монстр'>('ВСЕ');
  const [sortOrder, setSortOrder] = useState('NAME_ASC');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Character>>(EMPTY_CHARACTER);
  const initialCharacterAppliedRef = useRef<string | null>(null);

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

  const calculateWeight = (inventory: string[]) => inventory.reduce((acc, id) => acc + (items.find(i => i.id === id)?.weight || 0), 0);

  const maxWeight = (formData.baseStats?.СИЛ || 10) * 5;
  const currentWeight = calculateWeight(formData.inventory || []);
  const inventorySlots = 12;

  const handleOpenEdit = (char: Character) => { setEditingId(char.id); setFormData({ ...char }); setIsModalOpen(true); };
  const handleOpenCreate = () => { setEditingId(null); setFormData(EMPTY_CHARACTER); setIsModalOpen(true); };

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
      level: formData.level ?? 1,
      stats: formData.baseStats ?? { ...EMPTY_STATS },
      inventory: formData.inventory ?? [],
      scenario_id: formData.scenarioId ?? null
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
    } catch {
      // ignore
    }
  };

  const toggleInventoryItem = (id: string) => {
    const inv = [...(formData.inventory || [])];
    const index = inv.indexOf(id);
    if (index > -1) inv.splice(index, 1);
    else { if (inv.length >= inventorySlots) return alert('ИНВЕНТАРЬ ПЕРЕПОЛНЕН'); inv.push(id); }
    setFormData({ ...formData, inventory: inv });
  };

  const filteredCharacters = data
    .filter(c => {
      const assignedTags = tagAssignments[tagAssignmentKey('character', c.id)] ?? [];
      return c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (activeRole === 'ВСЕ' || c.role === activeRole) &&
        (!selectedTagFilter || assignedTags.some((tag) => tag.id === selectedTagFilter));
    })
    .sort((a, b) => {
      if (sortOrder === 'NAME_ASC') return a.name.localeCompare(b.name);
      if (sortOrder === 'LEVEL_DESC') return b.level - a.level;
      if (sortOrder === 'WEIGHT_DESC') return calculateWeight(b.inventory) - calculateWeight(a.inventory);
      return 0;
    });

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 bg-[var(--bg-main)] overflow-auto p-12 bauhaus-bg">
        <div className="max-w-6xl mx-auto">
          <SectionHeader title="РЕЕСТР СУЩЕСТВ" subtitle="NPC И ГЕРОИ ТЕКУЩЕГО МИРА" accentColor={SECTION_ACCENT} actions={<Button color="yellow" onClick={handleOpenCreate}><UserPlus size={16} /> НОВЫЙ ГЕРОЙ</Button>} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-20">
            {filteredCharacters.map(char => {
              const { effective: eff, bonus: bns } = calculateEffectiveStats(char);
              const accent = ROLE_COLORS[char.role as keyof typeof ROLE_COLORS] || 'var(--col-blue)';
              const portraitAsset = findAssetForUsage(linksForCharacter(char.id), assets, 'portrait');
              return (
                <BaseCard key={char.id} title={char.name} accentColor={accent}>
                  <div className="space-y-6 flex flex-col h-full">
                    {portraitAsset?.url && (
                      <div className="relative h-36 border border-[var(--border-color)] bg-black overflow-hidden">
                        <Image
                          src={portraitAsset.url}
                          alt={portraitAsset.name}
                          fill
                          sizes="360px"
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="mono text-[11px] font-black uppercase tracking-[0.15em]" style={{ color: accent }}>{char.role}</span>
                      <span className="mono text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-widest">{char.race} | УР {char.level}</span>
                    </div>
                    <div className="relative pl-5 py-1 border-l border-[var(--border-color)]">
                      <p className="text-[11px] text-[var(--text-main)] opacity-60 mono leading-relaxed text-left">{char.description || 'БИОГРАФИЯ НЕ ЗАПОЛНЕНА'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">{['АТК', 'ЗАЩ', 'СИЛ'].map(sk => (<StatBadge key={sk} stat={sk as StatKey} value={eff[sk as StatKey]} bonus={bns[sk as StatKey]} showBonus={false}/>))}</div>
                    <div className="flex-1 min-h-[10px]" />
                    <div className="grid grid-cols-2 gap-4 border-t border-[var(--border-color)] pt-4">
                      <div className="flex items-center gap-2"><Scale size={14} className="text-[var(--text-muted)]" /><span className="mono text-[10px] uppercase font-black text-[var(--text-main)] opacity-80">{calculateWeight(char.inventory).toFixed(1)} КГ</span></div>
                      <div className="flex items-center gap-2 justify-end"><Package size={14} className="text-[var(--col-yellow)]" /><span className="mono text-[10px] uppercase font-black text-[var(--col-yellow)]">{char.inventory.length} / {inventorySlots}</span></div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button inverted color={char.role === 'Герой' ? 'yellow' : char.role === 'NPC' ? 'purple' : 'red'} className="w-full h-12" onClick={() => handleOpenEdit(char)}><Edit3 size={14} /> РЕДАКТИРОВАТЬ</Button>
                      <button onClick={() => handleDelete(char.id)} className="py-1 mono text-[8px] uppercase font-black text-[var(--text-muted)] hover:text-[var(--col-red)] transition-colors self-center">УДАЛИТЬ ИЗ БАЗЫ</button>
                    </div>
                  </div>
                </BaseCard>
              );
            })}
            <AddTile label="ДОБАВИТЬ ГЕРОЯ" accentColor={SECTION_ACCENT} onClick={handleOpenCreate} />
          </div>
        </div>
      </div>
      <div className="w-80 bg-[var(--bg-surface)] border-l-4 border-[var(--col-yellow)] flex flex-col p-8 space-y-10 z-10 overflow-y-auto">
        <h2 className="text-4xl font-black uppercase tracking-tighter text-[var(--col-yellow)] glitch-text leading-none">АРХИВ</h2>
        <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ИМЯ..." accentColor={SECTION_ACCENT} />
        <TagFilter tags={tags} value={selectedTagFilter} onChange={setSelectedTagFilter} accentColor={SECTION_ACCENT} />
        <Select value={sortOrder} onChange={val => setSortOrder(val)} options={[{value:'NAME_ASC', label:'ИМЯ'}, {value:'LEVEL_DESC', label:'УРОВЕНЬ'}, {value:'WEIGHT_DESC', label:'ВЕС'}]} accentColor={SECTION_ACCENT} />
        <div className="space-y-5">
           <label className="mono text-[10px] text-[var(--col-yellow)] uppercase tracking-[0.3em] font-black">ФИЛЬТР</label>
           <div className="flex flex-col gap-2">
            {(['ВСЕ', 'Герой', 'NPC', 'Монстр'] as const).map(r => (
              <button key={r} onClick={() => setActiveRole(r)} style={{ color: activeRole === r ? 'var(--text-inverted)' : ROLE_COLORS[r], borderColor: activeRole === r ? ROLE_COLORS[r] : `color-mix(in srgb, ${ROLE_COLORS[r]} 20%, transparent)`, backgroundColor: activeRole === r ? ROLE_COLORS[r] : 'transparent' }} className={`px-4 py-3 border-2 mono text-[10px] uppercase text-left font-black transition-all`}>{r}</button>
            ))}
           </div>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="ПРОФИЛЬ СУЩЕСТВА" accentColor={SECTION_ACCENT} maxWidth="max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">Имя персонажа</label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} accentColor={SECTION_ACCENT} className="h-10 text-sm uppercase font-black" /></div>
              <div className="space-y-1.5"><label className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">Роль</label><Select value={formData.role} onChange={v => setFormData({...formData, role: v as any})} options={[{value:'NPC', label:'NPC'},{value:'Герой', label:'ГЕРОЙ'},{value:'Монстр', label:'МОНСТР'}]} accentColor={SECTION_ACCENT} /></div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2"><label className="mono text-[10px] uppercase font-black text-[var(--text-muted)] flex items-center gap-2"><Zap size={12} /> Базовые атрибуты</label><span className="mono text-[9px] font-black text-[var(--text-muted)]">БАЗА (+БОНУС)</span></div>
              <div className="grid grid-cols-3 gap-4">
                {STAT_KEYS.map(sk => { const { bonus: bns } = calculateEffectiveStats(formData); return (
                    <div key={sk} className="space-y-1.5 p-3 border border-[var(--border-color)] bg-[var(--bg-main)] hover:bg-[var(--bg-surface)] transition-all">
                      <div className="flex justify-between items-center"><label className="mono text-[9px] font-black text-[var(--text-muted)]">{sk}</label><div className="mono text-[10px] font-black"><span className="text-[var(--text-main)]">{formData.baseStats?.[sk]}</span>{bns[sk] > 0 && <span className="text-[var(--col-yellow)] ml-1">+{bns[sk]}</span>}</div></div>
                      <input type="number" value={formData.baseStats?.[sk]} onChange={e => { const newStats = { ...formData.baseStats } as any; newStats[sk] = parseInt(e.target.value) || 0; setFormData({...formData, baseStats: newStats}); }} className="w-full bg-transparent border-none mono text-xs font-black text-[var(--col-yellow)] focus:outline-none p-0 h-6" />
                    </div>
                ); })}
              </div>
            </div>
            <div className="space-y-1.5"><label className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">История</label><TextArea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="h-24" accentColor={SECTION_ACCENT} /></div>
            {editingId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AssetUsagePicker
                  label="Портрет"
                  assets={assets}
                  value={findAssetUsageLink(linksForCharacter(editingId), 'portrait')?.targetId ?? null}
                  allowedTypes={['image']}
                  accentColor={SECTION_ACCENT}
                  onChange={(assetId) => setCharacterAssetUsage('portrait', assetId)}
                />
                <AssetUsagePicker
                  label="Токен"
                  assets={assets}
                  value={findAssetUsageLink(linksForCharacter(editingId), 'token')?.targetId ?? null}
                  allowedTypes={['token', 'image']}
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
              <EntityLinksPanel
                sourceType="character"
                sourceId={editingId}
                links={linksForCharacter(editingId).filter((link) => !isAssetUsageLink(link))}
                scenarios={scenarios}
                maps={maps}
                characters={data}
                items={items}
                assets={assets}
                locations={locations}
                factions={factions}
                events={events}
                accentColor={SECTION_ACCENT}
                onCreateLink={onCreateMaterialLink}
                onUpdateLink={onUpdateMaterialLink}
                onDeleteLink={onDeleteMaterialLink}
                onOpenLink={onOpenMaterialLink}
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
               <div className="space-y-1.5">
                 <div className="flex justify-between mono text-[8px] font-black uppercase"><span className={currentWeight > maxWeight ? 'text-[var(--col-red)]' : 'text-[var(--text-muted)]'}>Вес: {currentWeight.toFixed(1)} КГ</span><span className="text-[var(--text-muted)]">Макс: {maxWeight.toFixed(1)} КГ</span></div>
                 <div className="h-1 bg-[var(--border-color)] w-full"><div className={`h-full transition-all duration-500 ${currentWeight > maxWeight ? 'bg-[var(--col-red)]' : 'bg-[var(--col-yellow)]'}`} style={{ width: `${Math.min(100, (currentWeight / maxWeight) * 100)}%` }} /></div>
               </div>
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
                  <button key={item.id} onClick={() => toggleInventoryItem(item.id)} className="w-full flex items-center justify-between p-3 border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-main)] group transition-all">
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
