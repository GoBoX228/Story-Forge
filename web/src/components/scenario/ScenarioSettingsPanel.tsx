import React from 'react';
import { Layers, Map as MapIcon, Settings, Users, X } from 'lucide-react';
import {
  Asset,
  Campaign,
  Character,
  EntityLink,
  EntityLinkCreatePayload,
  EntityLinkTargetType,
  EntityLinkUpdatePayload,
  Faction,
  Item,
  MapData,
  PublishedContent,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload,
  Scenario,
  Tag,
  WorldEvent,
  WorldLocation
} from '../../types';
import { COLORS } from '../../constants';
import { Button, Select } from '../UI';
import { TagPicker } from '../TagPicker';
import { EntityLinksPanel } from '../EntityLinksPanel';
import { PublicationPanel } from '../PublicationPanel';

interface ScenarioSettingsPanelProps {
  scenario: Scenario;
  scenarios: Scenario[];
  campaigns: Campaign[];
  characters: Character[];
  maps: MapData[];
  items: Item[];
  assets: Asset[];
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
  relatedCharacters: Character[];
  relatedMaps: MapData[];
  tags: Tag[];
  selectedTags: Tag[];
  entityLinks: EntityLink[];
  publication?: PublishedContent;
  validationSummary?: { errorCount: number; warningCount: number };
  onReplaceTags: (tagIds: string[], newTags?: string[]) => Promise<Tag[]>;
  onUpdateTag: (id: string, name: string) => Promise<Tag>;
  onDeleteTag: (id: string) => Promise<void>;
  onCreateMaterialLink: (sourceType: EntityLinkTargetType, sourceId: string, payload: EntityLinkCreatePayload) => Promise<EntityLink>;
  onUpdateMaterialLink: (id: string, payload: EntityLinkUpdatePayload) => Promise<EntityLink>;
  onDeleteMaterialLink: (id: string) => Promise<void>;
  onUpsertPublication: (type: PublicationTargetType, id: string, payload: PublicationUpsertPayload) => Promise<PublishedContent>;
  onUpdatePublication: (id: string, payload: PublicationUpdatePayload) => Promise<PublishedContent>;
  onDeletePublication: (id: string) => Promise<void>;
  onOpenMaterialLink?: (targetType: EntityLinkTargetType, targetId: string) => void;
  onUpdateField: (field: keyof Scenario, value: string) => void;
  onToggleCharacterRelation: (id: string) => void;
  onToggleMapRelation: (id: string) => void;
  onExportPdf: () => void;
  embedded?: boolean;
}

export const ScenarioSettingsPanel: React.FC<ScenarioSettingsPanelProps> = ({
  scenario,
  scenarios,
  campaigns,
  characters,
  maps,
  items,
  assets,
  locations,
  factions,
  events,
  relatedCharacters,
  relatedMaps,
  tags,
  selectedTags,
  entityLinks,
  publication,
  validationSummary,
  onReplaceTags,
  onUpdateTag,
  onDeleteTag,
  onCreateMaterialLink,
  onUpdateMaterialLink,
  onDeleteMaterialLink,
  onUpsertPublication,
  onUpdatePublication,
  onDeletePublication,
  onOpenMaterialLink,
  onUpdateField,
  onToggleCharacterRelation,
  onToggleMapRelation,
  onExportPdf,
  embedded = false
}) => (
  <div className={`${embedded ? 'w-full max-h-[70vh]' : 'w-80 border-l'} bg-[var(--bg-surface)] border-[var(--border-color)] flex flex-col z-10`}>
    <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-2 bg-[var(--bg-main)]">
      <Settings size={16} className="text-[var(--col-red)]" />
      <span className="mono text-[10px] uppercase font-black text-[var(--text-main)] tracking-widest">ПАРАМЕТРЫ</span>
    </div>
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      <div className="space-y-2">
        <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black flex items-center gap-2">
          <Layers size={10} /> Кампания
        </label>
        <Select
          value={scenario.campaignId}
          onChange={(value) => onUpdateField('campaignId', value)}
          options={campaigns.map((campaign) => ({ value: campaign.id, label: campaign.title }))}
          placeholder="БЕЗ ПРИВЯЗКИ"
          accentColor={COLORS.accentPurple}
        />
      </div>
      <div className="space-y-2">
        <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black flex items-center gap-2">
          <Users size={10} /> Персонажи
        </label>
        <Select
          onChange={onToggleCharacterRelation}
          options={characters.map((character) => ({ value: character.id, label: character.name }))}
          placeholder="ДОБАВИТЬ..."
          accentColor={COLORS.accentYellow}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {relatedCharacters.map((character) => (
            <div key={character.id} className="flex items-center gap-2 px-2 py-1 bg-[var(--col-yellow)]/10 border border-[var(--col-yellow)] animate-appear">
              <span className="mono text-[8px] font-black text-[var(--col-yellow)] uppercase">{character.name}</span>
              <button onClick={() => onToggleCharacterRelation(character.id)} className="text-[var(--col-yellow)] hover:text-[var(--text-main)]" title="Убрать персонажа">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black flex items-center gap-2">
          <MapIcon size={10} /> Локации
        </label>
        <Select
          onChange={onToggleMapRelation}
          options={maps.map((map) => ({ value: map.id, label: map.name }))}
          placeholder="ДОБАВИТЬ..."
          accentColor="var(--col-white)"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {relatedMaps.map((map) => (
            <div key={map.id} className="flex items-center gap-2 px-2 py-1 bg-[var(--bg-main)] border border-[var(--col-white)] animate-appear">
              <span className="mono text-[8px] font-black text-[var(--text-main)] uppercase">{map.name}</span>
              <button onClick={() => onToggleMapRelation(map.id)} className="text-[var(--text-main)] hover:text-[var(--text-muted)]" title="Убрать локацию">
                <X size={10} />
              </button>
            </div>
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
      <EntityLinksPanel
        sourceType="scenario"
        sourceId={scenario.id}
        links={entityLinks}
        scenarios={scenarios}
        maps={maps}
        characters={characters}
        items={items}
        assets={assets}
        locations={locations}
        factions={factions}
        events={events}
        accentColor="var(--col-red)"
        onCreateLink={onCreateMaterialLink}
        onUpdateLink={onUpdateMaterialLink}
        onDeleteLink={onDeleteMaterialLink}
        onOpenLink={onOpenMaterialLink}
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
          ЭКСПОРТ PDF
        </Button>
      </div>
    </div>
  </div>
);
