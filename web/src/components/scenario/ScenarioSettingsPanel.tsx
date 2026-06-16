import React, { useState } from 'react';
import { Layers, Map as MapIcon, Package, Settings, Users, X } from 'lucide-react';
import {
  Campaign,
  Character,
  EntityLinkTargetType,
  Item,
  MapData,
  PublishedContent,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload,
  Scenario,
  Tag
} from '../../types';
import { COLORS } from '../../constants';
import { Button, Select } from '../UI';
import { TagPicker } from '../TagPicker';
import { PublicationPanel } from '../PublicationPanel';

interface ScenarioSettingsPanelProps {
  scenario: Scenario;
  campaigns: Campaign[];
  characters: Character[];
  maps: MapData[];
  items: Item[];
  relatedCharacters: Character[];
  relatedMaps: MapData[];
  relatedItems: Item[];
  tags: Tag[];
  selectedTags: Tag[];
  publication?: PublishedContent;
  validationSummary?: { errorCount: number; warningCount: number };
  onReplaceTags: (tagIds: string[], newTags?: string[]) => Promise<Tag[]>;
  onUpdateTag: (id: string, name: string) => Promise<Tag>;
  onDeleteTag: (id: string) => Promise<void>;
  onUpsertPublication: (type: PublicationTargetType, id: string, payload: PublicationUpsertPayload) => Promise<PublishedContent>;
  onUpdatePublication: (id: string, payload: PublicationUpdatePayload) => Promise<PublishedContent>;
  onDeletePublication: (id: string) => Promise<void>;
  onUpdateField: (field: keyof Scenario, value: string) => void;
  onToggleComposition: (targetType: EntityLinkTargetType, targetId: string) => void;
  onExportPdf: () => void;
  onExportCharacterCardsPdf: (duplexEdge: 'long' | 'short') => void;
  onExportItemCardsPdf: (duplexEdge: 'long' | 'short') => void;
  embedded?: boolean;
}

const CompositionChip: React.FC<{
  label: string;
  accentColor: string;
  onRemove: () => void;
  removeTitle: string;
}> = ({ label, accentColor, onRemove, removeTitle }) => (
  <div
    className="flex items-center gap-2 px-2 py-1 border bg-[var(--bg-main)] animate-appear"
    style={{ borderColor: accentColor }}
  >
    <span className="mono text-[8px] font-black uppercase" style={{ color: accentColor }}>
      {label}
    </span>
    <button
      type="button"
      onClick={onRemove}
      className="hover:text-[var(--text-main)]"
      style={{ color: accentColor }}
      title={removeTitle}
    >
      <X size={10} />
    </button>
  </div>
);

export const ScenarioSettingsPanel: React.FC<ScenarioSettingsPanelProps> = ({
  scenario,
  campaigns,
  characters,
  maps,
  items,
  relatedCharacters,
  relatedMaps,
  relatedItems,
  tags,
  selectedTags,
  publication,
  validationSummary,
  onReplaceTags,
  onUpdateTag,
  onDeleteTag,
  onUpsertPublication,
  onUpdatePublication,
  onDeletePublication,
  onUpdateField,
  onToggleComposition,
  onExportPdf,
  onExportCharacterCardsPdf,
  onExportItemCardsPdf,
  embedded = false
}) => {
  const [characterCardsDuplexEdge, setCharacterCardsDuplexEdge] = useState<'long' | 'short'>('long');
  const [itemCardsDuplexEdge, setItemCardsDuplexEdge] = useState<'long' | 'short'>('long');
  const relatedCharacterIds = new Set(relatedCharacters.map((character) => character.id));
  const relatedMapIds = new Set(relatedMaps.map((map) => map.id));
  const relatedItemIds = new Set(relatedItems.map((item) => item.id));

  return (
    <div className={`${embedded ? 'w-full max-h-[70vh]' : 'w-80 border-l'} bg-[var(--bg-surface)] border-[var(--border-color)] flex flex-col z-10`}>
      <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-2 bg-[var(--bg-main)]">
        <Settings size={16} className="text-[var(--col-red)]" />
        <span className="mono text-[10px] uppercase font-black text-[var(--text-main)] tracking-widest">Параметры</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="space-y-2">
          <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black flex items-center gap-2">
            <Layers size={10} /> Кампания
          </label>
          <Select
            value={scenario.campaignId ?? ''}
            onChange={(value) => onUpdateField('campaignId', value)}
            options={campaigns.map((campaign) => ({ value: campaign.id, label: campaign.title }))}
            placeholder="Без привязки"
            accentColor={COLORS.accentPurple}
          />
        </div>

        <div className="space-y-2">
          <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black flex items-center gap-2">
            <Users size={10} /> Персонажи
          </label>
          <Select
            onChange={(id) => onToggleComposition('character', id)}
            options={characters
              .filter((character) => !relatedCharacterIds.has(character.id))
              .map((character) => ({ value: character.id, label: character.name }))}
            placeholder="Добавить..."
            accentColor={COLORS.accentYellow}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {relatedCharacters.map((character) => (
              <CompositionChip
                key={character.id}
                label={character.name}
                accentColor={COLORS.accentYellow}
                removeTitle="Убрать персонажа"
                onRemove={() => onToggleComposition('character', character.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black flex items-center gap-2">
            <MapIcon size={10} /> Карты
          </label>
          <Select
            onChange={(id) => onToggleComposition('map', id)}
            options={maps
              .filter((map) => !relatedMapIds.has(map.id))
              .map((map) => ({ value: map.id, label: map.name }))}
            placeholder="Добавить..."
            accentColor="var(--col-white)"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {relatedMaps.map((map) => (
              <CompositionChip
                key={map.id}
                label={map.name}
                accentColor="var(--col-white)"
                removeTitle="Убрать карту"
                onRemove={() => onToggleComposition('map', map.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black flex items-center gap-2">
            <Package size={10} /> Предметы
          </label>
          <Select
            onChange={(id) => onToggleComposition('item', id)}
            options={items
              .filter((item) => !relatedItemIds.has(item.id))
              .map((item) => ({ value: item.id, label: item.name }))}
            placeholder="Добавить..."
            accentColor={COLORS.accentBlue}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {relatedItems.map((item) => (
              <CompositionChip
                key={item.id}
                label={item.name}
                accentColor={COLORS.accentBlue}
                removeTitle="Убрать предмет"
                onRemove={() => onToggleComposition('item', item.id)}
              />
            ))}
          </div>
        </div>

        <TagPicker
          allTags={tags}
          selectedTags={selectedTags}
          accentColor="var(--col-red)"
          onReplaceTags={onReplaceTags}
          onUpdateTag={onUpdateTag}
          onDeleteTag={onDeleteTag}
        />
        <PublicationPanel
          targetType="scenario"
          targetId={scenario.id}
          publication={publication}
          validationSummary={validationSummary}
          accentColor="var(--col-red)"
          onUpsertPublication={onUpsertPublication}
          onUpdatePublication={onUpdatePublication}
          onDeletePublication={onDeletePublication}
        />
        <div className="space-y-2 pt-4 border-t border-[var(--border-color)]">
          <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black">Описание сюжета</label>
          <textarea
            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] p-3 mono text-[10px] text-[var(--text-main)] focus:border-[var(--col-red)] focus:outline-none min-h-[120px] resize-none leading-relaxed"
            value={scenario.description}
            onChange={(event) => onUpdateField('description', event.target.value)}
            placeholder="Краткая сводка сюжета..."
          />
          <Button variant="accent-red" className="w-full h-12" onClick={onExportPdf}>
            Экспорт PDF
          </Button>
        </div>
        <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
          <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black flex items-center gap-2">
            <Users size={10} /> Карточки персонажей
          </label>
          <Select
            value={characterCardsDuplexEdge}
            onChange={(value) => setCharacterCardsDuplexEdge(value === 'short' ? 'short' : 'long')}
            options={[
              { value: 'long', label: 'Длинный край' },
              { value: 'short', label: 'Короткий край' }
            ]}
            placeholder="Режим двусторонней печати"
            accentColor={COLORS.accentYellow}
          />
          <Button
            variant="accent-red"
            className="w-full h-12"
            onClick={() => onExportCharacterCardsPdf(characterCardsDuplexEdge)}
          >
            Экспорт карточек персонажей
          </Button>
          <p className="mono text-[8px] leading-relaxed text-[var(--text-muted)] uppercase">
            A4, 3×3, лица и обороты для двусторонней печати.
          </p>
        </div>
        <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
          <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black flex items-center gap-2">
            <Package size={10} /> Карточки предметов
          </label>
          <Select
            value={itemCardsDuplexEdge}
            onChange={(value) => setItemCardsDuplexEdge(value === 'short' ? 'short' : 'long')}
            options={[
              { value: 'long', label: 'Длинный край' },
              { value: 'short', label: 'Короткий край' }
            ]}
            placeholder="Режим двусторонней печати"
            accentColor={COLORS.accentBlue}
          />
          <Button
            variant="accent-red"
            className="w-full h-12"
            onClick={() => onExportItemCardsPdf(itemCardsDuplexEdge)}
          >
            Экспорт карточек предметов
          </Button>
          <p className="mono text-[8px] leading-relaxed text-[var(--text-muted)] uppercase">
            A4, 3×3, лица и обороты для двусторонней печати.
          </p>
        </div>
      </div>
    </div>
  );
};
