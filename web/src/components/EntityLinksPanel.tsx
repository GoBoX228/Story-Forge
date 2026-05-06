import React, { useMemo, useState } from 'react';
import { ExternalLink, Link2, Plus, Save, Trash2 } from 'lucide-react';
import {
  Asset,
  Character,
  EntityLink,
  EntityLinkCreatePayload,
  EntityLinkRelationType,
  EntityLinkTargetType,
  EntityLinkUpdatePayload,
  Faction,
  Item,
  MapData,
  Scenario,
  WorldEvent,
  WorldLocation
} from '../types';
import { Button, Input, Select } from './UI';

const TARGET_LABELS: Record<EntityLinkTargetType, string> = {
  scenario: 'СЦЕНАРИЙ',
  map: 'КАРТА',
  character: 'ПЕРСОНАЖ',
  item: 'ПРЕДМЕТ',
  asset: 'АССЕТ',
  location: 'ЛОКАЦИЯ',
  faction: 'ФРАКЦИЯ',
  event: 'СОБЫТИЕ'
};

const RELATION_LABELS: Record<EntityLinkRelationType, string> = {
  related: 'СВЯЗАНО',
  uses: 'ИСПОЛЬЗУЕТ',
  located_in: 'НАХОДИТСЯ В',
  member_of: 'УЧАСТНИК',
  rewards: 'НАГРАЖДАЕТ',
  mentions: 'УПОМИНАЕТ'
};

const RELATIONS: EntityLinkRelationType[] = ['related', 'uses', 'located_in', 'member_of', 'rewards', 'mentions'];
const TARGET_TYPES: EntityLinkTargetType[] = ['scenario', 'map', 'character', 'item', 'asset', 'location', 'faction', 'event'];

interface EntityLinkTargetOption {
  type: EntityLinkTargetType;
  id: string;
  label: string;
}

interface EntityLinksPanelProps {
  sourceType: EntityLinkTargetType;
  sourceId: string;
  links: EntityLink[];
  scenarios: Scenario[];
  maps: MapData[];
  characters: Character[];
  items: Item[];
  assets: Asset[];
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
  accentColor?: string;
  onCreateLink: (sourceType: EntityLinkTargetType, sourceId: string, payload: EntityLinkCreatePayload) => Promise<EntityLink>;
  onUpdateLink: (id: string, payload: EntityLinkUpdatePayload) => Promise<EntityLink>;
  onDeleteLink: (id: string) => Promise<void>;
  onOpenLink?: (targetType: EntityLinkTargetType, targetId: string) => void;
}

const entityTitle = (link: EntityLink, options: EntityLinkTargetOption[]): string =>
  options.find((option) => option.type === link.targetType && option.id === link.targetId)?.label ?? `#${link.targetId}`;

export const EntityLinksPanel: React.FC<EntityLinksPanelProps> = ({
  sourceType,
  sourceId,
  links,
  scenarios,
  maps,
  characters,
  items,
  assets,
  locations,
  factions,
  events,
  accentColor = 'var(--col-teal)',
  onCreateLink,
  onUpdateLink,
  onDeleteLink,
  onOpenLink
}) => {
  const [targetType, setTargetType] = useState<EntityLinkTargetType>('scenario');
  const [targetId, setTargetId] = useState('');
  const [relationType, setRelationType] = useState<EntityLinkRelationType>('related');
  const [label, setLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRelation, setEditingRelation] = useState<EntityLinkRelationType>('related');
  const [editingLabel, setEditingLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const allOptions = useMemo<EntityLinkTargetOption[]>(
    () => [
      ...scenarios.map((scenario) => ({ type: 'scenario' as const, id: scenario.id, label: scenario.title })),
      ...maps.map((map) => ({ type: 'map' as const, id: map.id, label: map.name })),
      ...characters.map((character) => ({ type: 'character' as const, id: character.id, label: character.name })),
      ...items.map((item) => ({ type: 'item' as const, id: item.id, label: item.name })),
      ...assets.map((asset) => ({ type: 'asset' as const, id: asset.id, label: asset.name })),
      ...locations.map((location) => ({ type: 'location' as const, id: location.id, label: location.name })),
      ...factions.map((faction) => ({ type: 'faction' as const, id: faction.id, label: faction.name })),
      ...events.map((event) => ({ type: 'event' as const, id: event.id, label: event.title }))
    ],
    [assets, characters, events, factions, items, locations, maps, scenarios]
  );

  const targetOptions = useMemo(
    () => allOptions.filter((option) => option.type === targetType && !(option.type === sourceType && option.id === sourceId)),
    [allOptions, sourceId, sourceType, targetType]
  );

  const addLink = async () => {
    if (!targetId || busy) return;
    setBusy(true);
    setError('');
    try {
      await onCreateLink(sourceType, sourceId, {
        targetType,
        targetId,
        relationType,
        label: label.trim() || null
      });
      setTargetId('');
      setLabel('');
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'Не удалось создать связь');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (link: EntityLink) => {
    setEditingId(link.id);
    setEditingRelation(link.relationType);
    setEditingLabel(link.label ?? '');
    setError('');
  };

  const saveEdit = async () => {
    if (!editingId || busy) return;
    setBusy(true);
    setError('');
    try {
      await onUpdateLink(editingId, {
        relationType: editingRelation,
        label: editingLabel.trim() || null
      });
      setEditingId(null);
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'Не удалось обновить связь');
    } finally {
      setBusy(false);
    }
  };

  const deleteLink = async (linkId: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onDeleteLink(linkId);
      if (editingId === linkId) setEditingId(null);
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'Не удалось удалить связь');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 border-t border-[var(--border-color)] pt-5">
      <div className="flex items-center gap-2">
        <Link2 size={14} style={{ color: accentColor }} />
        <span className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">Связанные материалы</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Select
          value={targetType}
          onChange={(value) => {
            setTargetType(value as EntityLinkTargetType);
            setTargetId('');
          }}
          options={TARGET_TYPES.map((type) => ({ value: type, label: TARGET_LABELS[type] }))}
          accentColor={accentColor}
        />
        <Select
          value={targetId}
          onChange={setTargetId}
          options={targetOptions.map((option) => ({ value: option.id, label: option.label.toUpperCase() }))}
          placeholder="ВЫБРАТЬ МАТЕРИАЛ"
          accentColor={accentColor}
        />
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
          <Select
            value={relationType}
            onChange={(value) => setRelationType(value as EntityLinkRelationType)}
            options={RELATIONS.map((relation) => ({ value: relation, label: RELATION_LABELS[relation] }))}
            accentColor={accentColor}
          />
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Метка связи"
            accentColor={accentColor}
          />
          <Button inverted color="white" size="sm" disabled={!targetId || busy} onClick={() => void addLink()}>
            <Plus size={13} /> ДОБАВИТЬ
          </Button>
        </div>
      </div>

      {links.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] p-3 mono text-[9px] uppercase text-[var(--text-muted)]">
          У материала пока нет связей
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id} className="border border-[var(--border-color)] bg-[var(--bg-main)] p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mono text-[8px] uppercase font-black text-[var(--text-muted)]">
                    {TARGET_LABELS[link.targetType]} · {RELATION_LABELS[link.relationType]}
                  </div>
                  <div className="mono text-[10px] uppercase font-black text-[var(--text-main)] truncate">
                    {entityTitle(link, allOptions)}
                  </div>
                  {link.label && (
                    <div className="mt-1 mono text-[9px] text-[var(--text-muted)]">{link.label}</div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {onOpenLink && (
                    <Button inverted color="white" size="sm" onClick={() => onOpenLink(link.targetType, link.targetId)}>
                      <ExternalLink size={12} /> ОТКРЫТЬ
                    </Button>
                  )}
                  <Button inverted color="white" size="sm" onClick={() => startEdit(link)}>
                    <Save size={12} /> ПРАВИТЬ
                  </Button>
                  <button
                    type="button"
                    onClick={() => void deleteLink(link.id)}
                    className="h-8 w-8 inline-flex items-center justify-center border border-[var(--col-red)] text-[var(--col-red)] hover:bg-[var(--col-red)] hover:text-[var(--text-inverted)]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {editingId === link.id && (
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                  <Select
                    value={editingRelation}
                    onChange={(value) => setEditingRelation(value as EntityLinkRelationType)}
                    options={RELATIONS.map((relation) => ({ value: relation, label: RELATION_LABELS[relation] }))}
                    accentColor={accentColor}
                  />
                  <Input
                    value={editingLabel}
                    onChange={(event) => setEditingLabel(event.target.value)}
                    placeholder="Метка связи"
                    accentColor={accentColor}
                  />
                  <Button inverted color="white" size="sm" disabled={busy} onClick={() => void saveEdit()}>
                    <Save size={13} /> СОХРАНИТЬ
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="border border-[var(--col-red)] bg-[var(--col-red)]/10 p-3 mono text-[9px] uppercase font-black text-[var(--col-red)]">
          {error}
        </div>
      )}
    </div>
  );
};
