import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';
import {
  Asset,
  Character,
  Faction,
  Item,
  MapData,
  ScenarioNodeEntityLink,
  ScenarioNodeEntityLinkCreatePayload,
  ScenarioNodeEntityTargetType,
  WorldEvent,
  WorldLocation
} from '../../types';
import { Button, Select } from '../UI';

const ENTITY_TARGET_TYPE_OPTIONS: { value: ScenarioNodeEntityTargetType; label: string }[] = [
  { value: 'map', label: 'КАРТА' },
  { value: 'character', label: 'ПЕРСОНАЖ' },
  { value: 'item', label: 'ПРЕДМЕТ' },
  { value: 'asset', label: 'АССЕТ' },
  { value: 'location', label: 'ЛОКАЦИЯ' },
  { value: 'faction', label: 'ФРАКЦИЯ' },
  { value: 'event', label: 'СОБЫТИЕ' },
];

const ENTITY_TARGET_LABELS: Record<ScenarioNodeEntityTargetType, string> = {
  map: 'КАРТА',
  character: 'ПЕРСОНАЖ',
  item: 'ПРЕДМЕТ',
  asset: 'АССЕТ',
  location: 'ЛОКАЦИЯ',
  faction: 'ФРАКЦИЯ',
  event: 'СОБЫТИЕ',
};

interface GraphNodeEntityLinksProps {
  entityLinks: ScenarioNodeEntityLink[];
  entityLinksLoading?: boolean;
  maps: MapData[];
  characters: Character[];
  items: Item[];
  assets: Asset[];
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
  busy?: boolean;
  onCreateEntityLink: (payload: ScenarioNodeEntityLinkCreatePayload) => void | Promise<void>;
  onDeleteEntityLink: (linkId: string) => void | Promise<void>;
  onOpenEntityLink?: (targetType: ScenarioNodeEntityTargetType, targetId: string) => void;
}

export const GraphNodeEntityLinks: React.FC<GraphNodeEntityLinksProps> = ({
  entityLinks,
  entityLinksLoading = false,
  maps,
  characters,
  items,
  assets,
  locations,
  factions,
  events,
  busy = false,
  onCreateEntityLink,
  onDeleteEntityLink,
  onOpenEntityLink
}) => {
  const [targetType, setTargetType] = useState<ScenarioNodeEntityTargetType>('map');
  const [targetId, setTargetId] = useState('');
  const [linkLabel, setLinkLabel] = useState('');

  const targetOptions = useMemo(() => {
    const linkedIds = new Set(
      entityLinks
        .filter((link) => link.targetType === targetType)
        .map((link) => link.targetId)
    );

    if (targetType === 'map') {
      return maps
        .filter((map) => !linkedIds.has(map.id))
        .map((map) => ({ value: map.id, label: map.name || `Карта ${map.id}` }));
    }

    if (targetType === 'character') {
      return characters
        .filter((character) => !linkedIds.has(character.id))
        .map((character) => ({ value: character.id, label: character.name || `Персонаж ${character.id}` }));
    }

    if (targetType === 'item') {
      return items
        .filter((item) => !linkedIds.has(item.id))
        .map((item) => ({ value: item.id, label: item.name || `Предмет ${item.id}` }));
    }

    if (targetType === 'asset') {
      return assets
        .filter((asset) => !linkedIds.has(asset.id))
        .map((asset) => ({ value: asset.id, label: asset.name || `Ассет ${asset.id}` }));
    }

    if (targetType === 'location') {
      return locations
        .filter((location) => !linkedIds.has(location.id))
        .map((location) => ({ value: location.id, label: location.name || `Локация ${location.id}` }));
    }

    if (targetType === 'faction') {
      return factions
        .filter((faction) => !linkedIds.has(faction.id))
        .map((faction) => ({ value: faction.id, label: faction.name || `Фракция ${faction.id}` }));
    }

    return events
      .filter((event) => !linkedIds.has(event.id))
      .map((event) => ({ value: event.id, label: event.title || `Событие ${event.id}` }));
  }, [assets, characters, entityLinks, events, factions, items, locations, maps, targetType]);

  useEffect(() => {
    setTargetId(targetOptions[0]?.value ?? '');
  }, [targetOptions]);

  const getEntityTitle = (link: ScenarioNodeEntityLink): string => {
    if (link.targetType === 'map') {
      return maps.find((map) => map.id === link.targetId)?.name ?? `Карта #${link.targetId}`;
    }

    if (link.targetType === 'character') {
      return characters.find((character) => character.id === link.targetId)?.name ?? `Персонаж #${link.targetId}`;
    }

    if (link.targetType === 'item') {
      return items.find((item) => item.id === link.targetId)?.name ?? `Предмет #${link.targetId}`;
    }

    if (link.targetType === 'asset') {
      return assets.find((asset) => asset.id === link.targetId)?.name ?? `Ассет #${link.targetId}`;
    }

    if (link.targetType === 'location') {
      return locations.find((location) => location.id === link.targetId)?.name ?? `Локация #${link.targetId}`;
    }

    if (link.targetType === 'faction') {
      return factions.find((faction) => faction.id === link.targetId)?.name ?? `Фракция #${link.targetId}`;
    }

    return events.find((event) => event.id === link.targetId)?.title ?? `Событие #${link.targetId}`;
  };

  const handleCreateEntityLink = async () => {
    if (!targetId || busy) return;

    await onCreateEntityLink({
      targetType,
      targetId,
      label: linkLabel.trim() || null,
    });
    setLinkLabel('');
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link2 size={14} className="text-[var(--col-red)]" />
          <span className="mono text-[10px] uppercase font-black text-[var(--text-main)] tracking-widest">
            СВЯЗАННЫЕ СУЩНОСТИ
          </span>
        </div>
        {entityLinksLoading && (
          <span className="mono text-[8px] uppercase text-[var(--text-muted)]">ЗАГРУЗКА...</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Select
          value={targetType}
          onChange={(value) => setTargetType(value as ScenarioNodeEntityTargetType)}
          options={ENTITY_TARGET_TYPE_OPTIONS}
          accentColor="var(--col-red)"
        />
        <Select
          value={targetId}
          onChange={setTargetId}
          options={targetOptions}
          placeholder="НЕТ ДОСТУПНЫХ"
          accentColor="var(--col-red)"
        />
        <input
          value={linkLabel}
          onChange={(event) => setLinkLabel(event.target.value)}
          disabled={busy}
          placeholder="Метка связи"
          className="w-full h-10 bg-[var(--input-bg)] border-2 border-[var(--border-color)] px-4 mono text-[10px] text-[var(--text-main)] focus:border-[var(--col-red)] focus:outline-none"
        />
        <Button variant="accent-red" size="sm" disabled={busy || !targetId} onClick={handleCreateEntityLink}>
          <Plus size={14} /> ДОБАВИТЬ
        </Button>
      </div>

      {entityLinks.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] p-5 text-center mono text-[9px] uppercase text-[var(--text-muted)]">
          У узла пока нет связанных материалов
        </div>
      ) : (
        <div className="space-y-3">
          {entityLinks.map((link) => (
            <div key={link.id} className="border border-[var(--border-color)] bg-[var(--input-bg)] p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="mono text-[8px] uppercase text-[var(--text-muted)]">
                  {ENTITY_TARGET_LABELS[link.targetType]} {link.label ? ` / ${link.label}` : ''}
                </div>
                <div className="mono text-[10px] uppercase font-black text-[var(--text-main)] truncate">
                  {getEntityTitle(link)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onOpenEntityLink && (
                  <button
                    type="button"
                    onClick={() => onOpenEntityLink(link.targetType, link.targetId)}
                    disabled={busy}
                    className="h-8 px-3 inline-flex items-center gap-2 border border-[var(--col-red)] text-[var(--col-red)] hover:bg-[var(--col-red)] hover:text-white disabled:opacity-40 mono text-[8px] uppercase font-black transition-colors"
                    title="Открыть материал"
                  >
                    <ExternalLink size={12} />
                    Открыть
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteEntityLink(link.id)}
                  disabled={busy}
                  className="h-8 w-8 inline-flex items-center justify-center text-[var(--col-red)] hover:text-[var(--text-main)] disabled:opacity-40"
                  title="Удалить связь"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
