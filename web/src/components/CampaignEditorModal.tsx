
import React, { useState } from 'react';
import { Modal } from './Modal';
import { Input, TextArea, Button, Select } from './UI';
import { COLORS } from '../constants';
import { Campaign, Scenario, MapData, Character, Item, ItemRarity } from '../types';
import { 
  X, 
  Save, 
  Sparkles, 
  FileText, 
  Map as MapIcon, 
  Users, 
  Plus,
  Briefcase,
  Zap
} from 'lucide-react';

interface CampaignEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Partial<Campaign>;
  onSave: (updated: Campaign) => void;
  allScenarios: Scenario[];
  allMaps: MapData[];
  allCharacters: Character[];
  allItems: Item[];
}

const TAG_POOL = [
  'ВЫСОКОЕ ФЭНТЕЗИ', 'МРАЧНОЕ ФЭНТЕЗИ', 'КИБЕРПАНК', 'УЖАСЫ', 'ПЕСОЧНИЦА', 
  'ОДИНОЧНОЕ', 'ДЕТЕКТИВ', 'СТИМПАНК', 'ВЫЖИВАНИЕ', 'ПОЛИТИКА'
];

const RARITY_COLORS: Record<ItemRarity, string> = {
  'Легендарный': '#FFC300',
  'Эпический': '#8338EC',
  'Редкий': '#E63946',
  'Необычный': '#4361EE',
  'Обычный': '#888888',
};

export const CampaignEditorModal: React.FC<CampaignEditorModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onSave,
  allScenarios,
  allMaps,
  allCharacters,
  allItems
}) => {
  const [formData, setFormData] = useState<Partial<Campaign>>({
    title: '',
    description: '',
    tags: [],
    resources: [],
    scenarioIds: [],
    mapIds: [],
    characterIds: [],
    ...campaign
  });

  const [tagSearch, setTagSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  const PURPLE = COLORS.accentPurple;
  const BLUE = 'var(--col-blue)';

  const toggleLink = (listKey: 'scenarioIds' | 'mapIds' | 'characterIds', id: string) => {
    const list = formData[listKey] || [];
    const newList = list.includes(id) ? list.filter(item => item !== id) : [...list, id];
    setFormData({ ...formData, [listKey]: newList });
  };

  const handleAddTag = (tag: string) => {
    const cleanTag = tag.trim().toUpperCase();
    if (cleanTag && !formData.tags?.includes(cleanTag)) {
      setFormData({ ...formData, tags: [...(formData.tags || []), cleanTag] });
    }
    setTagSearch('');
  };

  const handleAddItem = (itemName: string) => {
    const cleanName = itemName.trim().toUpperCase();
    if (cleanName && !formData.resources?.includes(cleanName)) {
      setFormData({ ...formData, resources: [...(formData.resources || []), cleanName] });
    }
    setItemSearch('');
  };

  const removeResource = (res: string) => {
    setFormData({ ...formData, resources: formData.resources?.filter(r => r !== res) });
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tag) });
  };

  const getItemRarityColor = (name: string) => {
    const item = allItems.find(i => i.name.toUpperCase() === name.toUpperCase());
    return item ? RARITY_COLORS[item.rarity] : '#FFC300';
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Модификация мира"
      accentColor={PURPLE}
      maxWidth="max-w-6xl"
    >
      <div className="space-y-6">
        {/* Basic Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="mono text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Название кампании</label>
            <Input 
              value={formData.title} 
              onChange={e => setFormData({ ...formData, title: e.target.value.toUpperCase() })}
              placeholder="ВВЕДИТЕ НАЗВАНИЕ..."
              accentColor={PURPLE}
              className="h-12 text-sm font-bold bg-[var(--input-bg)] border-[var(--border-color)] uppercase text-[var(--text-main)]"
            />
          </div>
          <div className="space-y-2">
            <label className="mono text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Описание и сеттинг</label>
            <TextArea 
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="КРАТКОЕ ОПИСАНИЕ МИРА..."
              accentColor={PURPLE}
              className="h-12 min-h-[48px] text-xs bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-main)]"
            />
          </div>
        </div>

        {/* Tags & Resources Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tags (Campaign metadata = Purple) */}
          <div className="space-y-3">
            <label className="mono text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] flex items-center gap-2">
              <Sparkles size={12} style={{ color: PURPLE }} /> Теги и жанры мира
            </label>
            <div className="p-4 bg-[var(--bg-main)] border border-[var(--border-color)] space-y-3 min-h-[120px]">
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map(tag => (
                  <div key={tag} className="flex items-center gap-2 px-3 py-1.5 border border-[var(--col-purple)]/40 bg-[var(--col-purple)]/10 animate-appear">
                    <span className="mono text-[9px] font-black text-[var(--col-purple)]"># {tag}</span>
                    <button onClick={() => removeTag(tag)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={10} /></button>
                  </div>
                ))}
                <input 
                  value={tagSearch}
                  onChange={e => setTagSearch(e.target.value)}
                  placeholder="НОВЫЙ ТЕГ..."
                  className="bg-transparent border-none mono text-[9px] uppercase font-black text-[var(--text-main)] focus:outline-none placeholder:text-[var(--text-muted)] w-24"
                  onKeyDown={e => e.key === 'Enter' && handleAddTag(tagSearch)}
                />
              </div>
              <div className="pt-3 border-t border-[var(--border-color)] flex flex-wrap gap-2">
                {TAG_POOL.filter(tag => !formData.tags?.includes(tag)).map(tag => (
                  <button key={tag} onClick={() => handleAddTag(tag)} className="px-2 py-1 border border-[var(--border-color)] bg-[var(--bg-surface)] mono text-[8px] font-bold text-[var(--text-muted)] hover:text-[var(--col-purple)] transition-all">+ {tag}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Resources (Items = Blue section) */}
          <div className="space-y-3">
            <label className="mono text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] flex items-center gap-2">
              <Briefcase size={12} style={{ color: BLUE }} /> Общие ресурсы группы
            </label>
            <div className="p-4 bg-[var(--bg-main)] border border-[var(--border-color)] space-y-3 min-h-[120px]">
              <div className="flex flex-wrap gap-2">
                {formData.resources?.map(res => {
                  const color = getItemRarityColor(res);
                  return (
                    <div key={res} className="flex items-center gap-2 px-3 py-1.5 border animate-appear" style={{ borderColor: `${color}66`, backgroundColor: `${color}10`, color: color }}>
                      <span className="mono text-[9px] font-black uppercase">{res}</span>
                      <button onClick={() => removeResource(res)} className="opacity-60 hover:opacity-100"><X size={10} /></button>
                    </div>
                  );
                })}
                <input 
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  placeholder="ДОБАВИТЬ ПРЕДМЕТ..."
                  className="bg-transparent border-none mono text-[9px] uppercase font-black text-[var(--text-main)] focus:outline-none placeholder:text-[var(--text-muted)] w-32"
                  onKeyDown={e => e.key === 'Enter' && handleAddItem(itemSearch)}
                />
              </div>
              <div className="pt-3 border-t border-[var(--border-color)] flex flex-wrap gap-2">
                {allItems.filter(i => !formData.resources?.includes(i.name.toUpperCase())).map(item => (
                  <button key={item.id} onClick={() => handleAddItem(item.name)} className="group px-2 py-1 border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center gap-2 hover:bg-[var(--bg-main)] transition-all">
                    <div className="w-1 h-1" style={{ backgroundColor: RARITY_COLORS[item.rarity] }} />
                    <span className="mono text-[8px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-main)] uppercase">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Links Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[var(--border-color)]">
          {[
            { label: 'Сценарии', icon: <FileText size={14} />, key: 'scenarioIds' as const, items: allScenarios, nameField: 'title' as const, color: 'var(--col-red)' }, 
            { label: 'Карты', icon: <MapIcon size={14} />, key: 'mapIds' as const, items: allMaps, nameField: 'name' as const, color: 'var(--col-white)' },
            { label: 'Персонажи', icon: <Users size={14} />, key: 'characterIds' as const, items: allCharacters, nameField: 'name' as const, color: 'var(--col-yellow)' },
          ].map(section => (
            <div key={section.key} className="space-y-3">
              <label className="mono text-[10px] uppercase font-black text-[var(--text-muted)] flex items-center gap-2">
                <span style={{ color: section.color }}>{section.icon}</span> {section.label}
              </label>

              <Select 
                placeholder={`ВЫБРАТЬ ${section.label.toUpperCase()}...`}
                accentColor={section.color}
                options={section.items
                  .filter(i => !(formData[section.key] as string[])?.includes(i.id))
                  .map(i => ({ value: i.id, label: (i as any)[section.nameField].toUpperCase() }))
                }
                onChange={(val) => toggleLink(section.key, val)}
              />

              <div className="space-y-1.5 mt-2">
                {(formData[section.key] as string[])?.map(id => {
                  const item = section.items.find(i => i.id === id);
                  if (!item) return null;
                  return (
                    <div 
                      key={id} 
                      className="w-full flex justify-between items-center px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] animate-appear" 
                      style={{ borderLeft: `3px solid ${section.color}` }}
                    >
                      <span className="mono text-[9px] uppercase font-black text-[var(--text-main)] truncate pr-2">{(item as any)[section.nameField]}</span>
                      <button onClick={() => toggleLink(section.key, id)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={12} /></button>
                    </div>
                  );
                })}
                <div className="pt-1 space-y-1">
                   {section.items
                    .filter(i => !(formData[section.key] as string[])?.includes(i.id))
                    .slice(0, 2) 
                    .map(item => (
                      <button key={item.id} onClick={() => toggleLink(section.key, item.id)} className="w-full flex justify-between items-center px-3 py-2 border border-dashed border-[var(--border-color)] hover:border-[var(--text-muted)] transition-all group">
                        <span className="mono text-[9px] uppercase font-black text-[var(--text-muted)] group-hover:text-[var(--text-main)] truncate">{(item as any)[section.nameField]}</span>
                        <Plus size={10} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-4 pt-4 border-t border-[var(--border-color)]">
          <button onClick={onClose} className="flex-1 h-12 border border-[var(--border-color)] mono text-[10px] font-black uppercase hover:bg-[var(--bg-main)] transition-all text-[var(--text-muted)]">Отмена</button>
          <Button color="purple" className="flex-[2] h-12" onClick={() => onSave(formData as Campaign)}>
            <Save size={16} /> ЗАФИКСИРОВАТЬ ИЗМЕНЕНИЯ
          </Button>
        </div>
      </div>
    </Modal>
  );
};
