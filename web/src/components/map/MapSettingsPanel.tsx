import React, { useMemo } from 'react';
import { Download, Link2, Maximize, Package, Tags } from 'lucide-react';
import {
  Asset,
  AssetCollection,
  Character,
  EntityLink,
  EntityLinkCreatePayload,
  EntityLinkTargetType,
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
import { Button, Input, Select } from '../UI';
import { AssetCollectionTargetPicker } from '../AssetCollectionTargetPicker';
import { PublicationPanel } from '../PublicationPanel';
import { TagPicker } from '../TagPicker';
import { TypedMaterialOption, TypedMaterialSelectField } from '../TypedMaterialSelectField';

export type MapPdfPageSize = 'a4' | 'a3' | 'a2' | 'a1' | 'a0';
export type MapPdfOrientation = 'landscape' | 'portrait';

interface MapSettingsPanelProps {
  map: MapData;
  scenarios: Scenario[];
  characters: Character[];
  items: Item[];
  assets: Asset[];
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
  links: EntityLink[];
  scenarioMapLinks: EntityLink[];
  tags: Tag[];
  selectedTags: Tag[];
  publication?: PublishedContent;
  assetCollections: AssetCollection[];
  activeCollectionIds: string[];
  pageSize: MapPdfPageSize;
  orientation: MapPdfOrientation;
  accentColor: string;
  onPageSizeChange: (value: MapPdfPageSize) => void;
  onOrientationChange: (value: MapPdfOrientation) => void;
  onExportPdf: () => void;
  onUpdateMapSize: (field: 'width' | 'height', value: number) => void;
  onReplaceAssetCollections: (collectionIds: string[]) => Promise<AssetCollection[]>;
  onReplaceTags: (tagIds: string[], newTags?: string[]) => Promise<Tag[]>;
  onUpdateTag: (id: string, name: string) => Promise<Tag>;
  onDeleteTag: (id: string) => Promise<void>;
  onCreateMaterialLink: (sourceType: EntityLinkTargetType, sourceId: string, payload: EntityLinkCreatePayload) => Promise<EntityLink>;
  onDeleteMaterialLink: (id: string) => Promise<void>;
  onUpsertPublication: (type: PublicationTargetType, id: string, payload: PublicationUpsertPayload) => Promise<PublishedContent>;
  onUpdatePublication: (id: string, payload: PublicationUpdatePayload) => Promise<PublishedContent>;
  onDeletePublication: (id: string) => Promise<void>;
}

interface MaterialFieldConfig {
  id: string;
  label: string;
  targetType: EntityLinkTargetType;
  options: TypedMaterialOption[];
}

const toOptions = <T extends { id: string }>(
  items: T[],
  getLabel: (item: T) => string
): TypedMaterialOption[] =>
  items
    .map((item) => ({ id: item.id, label: getLabel(item) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title,
  icon,
  children
}) => (
  <section className="space-y-4 border-t border-[var(--border-color)] pt-6 first:border-t-0 first:pt-0">
    <div className="flex items-center gap-2">
      <span className="text-[var(--text-muted)]">{icon}</span>
      <h4 className="mono text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">
        {title}
      </h4>
    </div>
    {children}
  </section>
);

export const MapSettingsPanel: React.FC<MapSettingsPanelProps> = ({
  map,
  scenarios,
  characters,
  items,
  assets,
  locations,
  factions,
  events,
  links,
  scenarioMapLinks,
  tags,
  selectedTags,
  publication,
  assetCollections,
  activeCollectionIds,
  pageSize,
  orientation,
  accentColor,
  onPageSizeChange,
  onOrientationChange,
  onExportPdf,
  onUpdateMapSize,
  onReplaceAssetCollections,
  onReplaceTags,
  onUpdateTag,
  onDeleteTag,
  onCreateMaterialLink,
  onDeleteMaterialLink,
  onUpsertPublication,
  onUpdatePublication,
  onDeletePublication
}) => {
  const fields = useMemo<MaterialFieldConfig[]>(() => [
    {
      id: 'scenarios',
      label: 'Сценарии',
      targetType: 'scenario',
      options: toOptions(scenarios, (scenario) => scenario.title)
    },
    {
      id: 'characters',
      label: 'Персонажи',
      targetType: 'character',
      options: toOptions(characters, (character) => character.name)
    },
    {
      id: 'items',
      label: 'Предметы',
      targetType: 'item',
      options: toOptions(items, (item) => item.name)
    },
    {
      id: 'locations',
      label: 'Места',
      targetType: 'location',
      options: toOptions(locations, (location) => location.name)
    },
    {
      id: 'factions',
      label: 'Организации',
      targetType: 'faction',
      options: toOptions(factions, (faction) => faction.name)
    },
    {
      id: 'events',
      label: 'Хроника',
      targetType: 'event',
      options: toOptions(events, (event) => event.title)
    },
    {
      id: 'assets',
      label: 'Ассеты',
      targetType: 'asset',
      options: toOptions(assets, (asset) => asset.name)
    }
  ], [assets, characters, events, factions, items, locations, scenarios]);

  const selectedForScenarioField = (field: MaterialFieldConfig): TypedMaterialOption[] => {
    const optionById = new Map(field.options.map((option) => [option.id, option]));
    const seen = new Set<string>();

    return scenarioMapLinks
      .filter((link) => link.targetType === 'map' && link.targetId === map.id && link.relationType === 'uses')
      .filter((link) => {
        if (seen.has(link.sourceId)) return false;
        seen.add(link.sourceId);
        return true;
      })
      .map((link) => optionById.get(link.sourceId) ?? {
        id: link.sourceId,
        label: 'Удаленный сценарий'
      });
  };

  const selectedForField = (field: MaterialFieldConfig): TypedMaterialOption[] => {
    if (field.targetType === 'scenario') {
      return selectedForScenarioField(field);
    }

    const optionById = new Map(field.options.map((option) => [option.id, option]));
    const seen = new Set<string>();
    return links
      .filter((link) => link.targetType === field.targetType)
      .filter((link) => {
        if (seen.has(link.targetId)) return false;
        seen.add(link.targetId);
        return true;
      })
      .map((link) => optionById.get(link.targetId) ?? {
        id: link.targetId,
        label: 'Удаленный материал'
      });
  };

  const optionsForField = (field: MaterialFieldConfig): TypedMaterialOption[] => {
    const selectedIds = new Set(selectedForField(field).map((option) => option.id));
    return field.options.filter((option) => !selectedIds.has(option.id));
  };

  const addScenarioMapLink = async (scenarioId: string) => {
    await onCreateMaterialLink('scenario', scenarioId, {
      targetType: 'map',
      targetId: map.id,
      relationType: 'uses',
      label: null
    });

    const legacyLinks = links.filter((link) =>
      link.targetType === 'scenario' &&
      link.targetId === scenarioId &&
      link.relationType === 'related'
    );
    await Promise.all(legacyLinks.map((link) => onDeleteMaterialLink(link.id)));
  };

  const addLink = (field: MaterialFieldConfig, targetId: string) => {
    if (field.targetType === 'scenario') {
      void addScenarioMapLink(targetId);
      return;
    }

    void onCreateMaterialLink('map', map.id, {
      targetType: field.targetType,
      targetId,
      relationType: 'related',
      label: null
    });
  };

  const removeLinks = (field: MaterialFieldConfig, targetId: string) => {
    const matchingLinks = field.targetType === 'scenario'
      ? [
          ...scenarioMapLinks.filter((link) =>
            link.sourceId === targetId &&
            link.targetType === 'map' &&
            link.targetId === map.id &&
            link.relationType === 'uses'
          ),
          ...links.filter((link) =>
            link.targetType === 'scenario' &&
            link.targetId === targetId &&
            link.relationType === 'related'
          )
        ]
      : links.filter((link) => link.targetType === field.targetType && link.targetId === targetId);

    void Promise.all(matchingLinks.map((link) => onDeleteMaterialLink(link.id)));
  };

  return (
    <div className="max-h-[70vh] space-y-8 overflow-y-auto pr-2">
      <Section title="Экспорт карты" icon={<Download size={14} />}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Select
            value={pageSize}
            onChange={(value) => onPageSizeChange((['a4', 'a3', 'a2', 'a1', 'a0'].includes(value) ? value : 'a4') as MapPdfPageSize)}
            options={[
              { value: 'a4', label: 'A4' },
              { value: 'a3', label: 'A3' },
              { value: 'a2', label: 'A2' },
              { value: 'a1', label: 'A1' },
              { value: 'a0', label: 'A0' }
            ]}
            placeholder="Размер листа"
            accentColor={accentColor}
          />
          <Select
            value={orientation}
            onChange={(value) => onOrientationChange(value === 'portrait' ? 'portrait' : 'landscape')}
            options={[
              { value: 'landscape', label: 'Альбомная' },
              { value: 'portrait', label: 'Книжная' }
            ]}
            placeholder="Ориентация"
            accentColor={accentColor}
          />
          <Button variant="secondary" className="h-10 whitespace-nowrap" onClick={onExportPdf}>
            Экспорт PDF
          </Button>
        </div>
        <p className="mono text-[9px] uppercase leading-relaxed text-[var(--text-muted)]">
          Карта вписывается в один лист. В PDF попадают видимые слои и сетка.
        </p>
      </Section>

      <Section title="Размер карты" icon={<Maximize size={14} />}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mono mb-1 block text-[8px] uppercase text-[var(--text-muted)]">Ширина</label>
            <Input
              type="number"
              min={1}
              value={map.width}
              onChange={(event) => onUpdateMapSize('width', Math.max(1, parseInt(event.target.value, 10) || 20))}
              accentColor={accentColor}
              className="text-center font-bold"
            />
          </div>
          <div>
            <label className="mono mb-1 block text-[8px] uppercase text-[var(--text-muted)]">Высота</label>
            <Input
              type="number"
              min={1}
              value={map.height}
              onChange={(event) => onUpdateMapSize('height', Math.max(1, parseInt(event.target.value, 10) || 15))}
              accentColor={accentColor}
              className="text-center font-bold"
            />
          </div>
        </div>
      </Section>

      <Section title="Наборы ассетов" icon={<Package size={14} />}>
        <AssetCollectionTargetPicker
          label="Наборы ассетов карты"
          collections={assetCollections}
          value={activeCollectionIds}
          accentColor={accentColor}
          onChange={onReplaceAssetCollections}
        />
      </Section>

      <Section title="Связанные материалы" icon={<Link2 size={14} />}>
        <div className="space-y-5">
          {fields.map((field) => (
            <TypedMaterialSelectField
              key={field.id}
              label={field.label}
              accentColor={accentColor}
              options={optionsForField(field)}
              selected={selectedForField(field)}
              onAdd={(targetId) => addLink(field, targetId)}
              onRemove={(targetId) => removeLinks(field, targetId)}
            />
          ))}
        </div>
      </Section>

      <Section title="Теги" icon={<Tags size={14} />}>
        <TagPicker
          allTags={tags}
          selectedTags={selectedTags}
          accentColor={accentColor}
          onReplaceTags={onReplaceTags}
          onUpdateTag={onUpdateTag}
          onDeleteTag={onDeleteTag}
        />
      </Section>

      <PublicationPanel
        targetType="map"
        targetId={map.id}
        publication={publication}
        accentColor={accentColor}
        onUpsertPublication={onUpsertPublication}
        onUpdatePublication={onUpdatePublication}
        onDeletePublication={onDeletePublication}
      />
    </div>
  );
};
