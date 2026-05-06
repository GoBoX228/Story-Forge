import React, { useEffect, useMemo, useState } from 'react';
import { Link2, Plus, Save, Trash2 } from 'lucide-react';
import {
  Asset,
  Character,
  Faction,
  Item,
  MapData,
  ScenarioNode,
  ScenarioNodeConfig,
  ScenarioNodeEntityLink,
  ScenarioNodeEntityLinkCreatePayload,
  ScenarioNodeEntityTargetType,
  ScenarioNodeType,
  WorldEvent,
  WorldLocation
} from '../../types';
import { Button, Select } from '../UI';
import {
  GraphNodeConfigErrors,
  GraphNodeConfigField,
  GraphNodeConfigFields,
  GraphNodeConfigValues
} from './GraphNodeConfigFields';
import { NODE_TYPE_OPTIONS } from './GraphNodeList';

const getConfigString = (config: ScenarioNodeConfig, key: string): string => {
  const value = (config as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
};

const getConfigNumberString = (config: ScenarioNodeConfig, key: string): string => {
  const value = (config as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
};

const EMPTY_CONFIG_VALUES: GraphNodeConfigValues = {
  scene: '',
  speaker: '',
  mapHint: '',
  skill: '',
  dc: '',
  itemHint: '',
  encounter: ''
};

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

interface GraphNodeDetailsProps {
  node: ScenarioNode | null;
  busy?: boolean;
  entityLinks: ScenarioNodeEntityLink[];
  entityLinksLoading?: boolean;
  maps: MapData[];
  characters: Character[];
  items: Item[];
  assets?: Asset[];
  locations?: WorldLocation[];
  factions?: Faction[];
  events?: WorldEvent[];
  onUpdateNode: (nodeId: string, payload: {
    type: ScenarioNodeType;
    title: string;
    content: string;
    config: ScenarioNodeConfig;
  }) => void | Promise<void>;
  onDeleteNode: (nodeId: string) => void | Promise<void>;
  onCreateEntityLink: (payload: ScenarioNodeEntityLinkCreatePayload) => void | Promise<void>;
  onDeleteEntityLink: (linkId: string) => void | Promise<void>;
  showEntityLinks?: boolean;
}

export const GraphNodeDetails: React.FC<GraphNodeDetailsProps> = ({
  node,
  busy = false,
  entityLinks,
  entityLinksLoading = false,
  maps,
  characters,
  items,
  assets = [],
  locations = [],
  factions = [],
  events = [],
  onUpdateNode,
  onDeleteNode,
  onCreateEntityLink,
  onDeleteEntityLink,
  showEntityLinks = true
}) => {
  const [type, setType] = useState<ScenarioNodeType>('description');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scene, setScene] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [mapHint, setMapHint] = useState('');
  const [skill, setSkill] = useState('');
  const [dc, setDc] = useState('');
  const [itemHint, setItemHint] = useState('');
  const [encounter, setEncounter] = useState('');
  const [configErrors, setConfigErrors] = useState<GraphNodeConfigErrors>({});
  const [targetType, setTargetType] = useState<ScenarioNodeEntityTargetType>('map');
  const [targetId, setTargetId] = useState('');
  const [linkLabel, setLinkLabel] = useState('');

  useEffect(() => {
    if (!node) {
      setType('description');
      setTitle('');
      setContent('');
      setScene('');
      setSpeaker('');
      setMapHint('');
      setSkill('');
      setDc('');
      setItemHint('');
      setEncounter('');
      setConfigErrors({});
      return;
    }

    setType(node.type);
    setTitle(node.title ?? '');
    setContent(node.content ?? '');
    setScene(getConfigString(node.config, 'scene'));
    setSpeaker(getConfigString(node.config, 'speaker'));
    setMapHint(getConfigString(node.config, 'map_hint'));
    setSkill(getConfigString(node.config, 'skill'));
    setDc(getConfigNumberString(node.config, 'dc'));
    setItemHint(getConfigString(node.config, 'item_hint'));
    setEncounter(getConfigString(node.config, 'encounter'));
    setConfigErrors({});
  }, [node]);

  const configValues: GraphNodeConfigValues = {
    scene,
    speaker,
    mapHint,
    skill,
    dc,
    itemHint,
    encounter
  };

  const handleConfigFieldChange = (field: GraphNodeConfigField, value: string) => {
    const setters: Record<GraphNodeConfigField, (next: string) => void> = {
      scene: setScene,
      speaker: setSpeaker,
      mapHint: setMapHint,
      skill: setSkill,
      dc: setDc,
      itemHint: setItemHint,
      encounter: setEncounter
    };

    setters[field](value);
    setConfigErrors((current) => {
      if (!current[field]) return current;

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateTextField = (
    errors: GraphNodeConfigErrors,
    field: GraphNodeConfigField,
    value: string,
    max: number
  ) => {
    if (value.trim().length > max) {
      errors[field] = `Максимум ${max} символов`;
    }
  };

  const buildConfig = (): ScenarioNodeConfig | null => {
    const errors: GraphNodeConfigErrors = {};

    if (type === 'description') {
      validateTextField(errors, 'scene', scene, 120);
      if (Object.keys(errors).length > 0) {
        setConfigErrors(errors);
        return null;
      }
      return scene.trim() ? { scene: scene.trim() } : {};
    }
    if (type === 'dialog') {
      validateTextField(errors, 'speaker', speaker, 120);
      if (Object.keys(errors).length > 0) {
        setConfigErrors(errors);
        return null;
      }
      return speaker.trim() ? { speaker: speaker.trim() } : {};
    }
    if (type === 'location') {
      validateTextField(errors, 'mapHint', mapHint, 120);
      if (Object.keys(errors).length > 0) {
        setConfigErrors(errors);
        return null;
      }
      return mapHint.trim() ? { map_hint: mapHint.trim() } : {};
    }
    if (type === 'loot') {
      validateTextField(errors, 'itemHint', itemHint, 120);
      if (Object.keys(errors).length > 0) {
        setConfigErrors(errors);
        return null;
      }
      return itemHint.trim() ? { item_hint: itemHint.trim() } : {};
    }
    if (type === 'combat') {
      validateTextField(errors, 'encounter', encounter, 120);
      if (Object.keys(errors).length > 0) {
        setConfigErrors(errors);
        return null;
      }
      return encounter.trim() ? { encounter: encounter.trim() } : {};
    }

    const config: { skill?: string; dc?: number } = {};
    validateTextField(errors, 'skill', skill, 64);
    if (skill.trim()) config.skill = skill.trim();
    if (dc.trim()) {
      const parsedDc = Number(dc);
      if (!Number.isInteger(parsedDc) || parsedDc < 1 || parsedDc > 40) {
        errors.dc = 'Целое число 1-40';
      } else {
        config.dc = parsedDc;
      }
    }

    if (Object.keys(errors).length > 0) {
      setConfigErrors(errors);
      return null;
    }
    return config;
  };

  const handleSave = async () => {
    if (!node || busy) return;

    const config = buildConfig();
    if (!config) {
      return;
    }

    setConfigErrors({});
    await onUpdateNode(node.id, { type, title, content, config });
  };

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

  if (!node) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-60">
        <span className="mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          Создайте или выберите узел сценария
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mono text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest">УЗЕЛ #{node.orderIndex + 1}</div>
          <h3 className="text-2xl font-black uppercase text-[var(--text-main)] mt-2">ДЕТАЛИ УЗЛА</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="accent-red" onClick={handleSave} disabled={busy}>
            <Save size={14} /> Сохранить
          </Button>
          <Button variant="accent-red" inverted onClick={() => onDeleteNode(node.id)} disabled={busy}>
            <Trash2 size={14} /> Удалить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-4">
        <div className="space-y-2">
          <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black">Тип</label>
          <Select
            value={type}
            onChange={(value) => setType(value as ScenarioNodeType)}
            options={NODE_TYPE_OPTIONS}
            accentColor="var(--col-red)"
          />
        </div>
        <div className="space-y-2">
          <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black">Название</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={busy}
            className="w-full h-10 bg-[var(--input-bg)] border-2 border-[var(--border-color)] px-4 mono text-[10px] uppercase font-black text-[var(--text-main)] focus:border-[var(--col-red)] focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black">Содержание</label>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={busy}
          className="w-full min-h-[220px] bg-[var(--input-bg)] border-2 border-[var(--border-color)] p-4 mono text-xs text-[var(--text-main)] focus:border-[var(--col-red)] focus:outline-none resize-y leading-relaxed"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black">Поля узла</label>
          <span className="mono text-[8px] text-[var(--text-muted)] uppercase">
            Данные типа
          </span>
        </div>
        <GraphNodeConfigFields
          type={type}
          values={node ? configValues : EMPTY_CONFIG_VALUES}
          errors={configErrors}
          disabled={busy}
          onChange={handleConfigFieldChange}
        />
      </div>

      {showEntityLinks && (
      <div className="space-y-4 border-t border-[var(--border-color)] pt-6">
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

        <div className="grid grid-cols-1 xl:grid-cols-[150px_1fr_1fr_auto] gap-3">
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
            <Plus size={14} />
          </Button>
        </div>

        {entityLinks.length === 0 ? (
          <div className="border border-dashed border-[var(--border-color)] p-5 text-center mono text-[9px] uppercase text-[var(--text-muted)]">
            У узла пока нет связанных материалов
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
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
                <button
                  onClick={() => onDeleteEntityLink(link.id)}
                  disabled={busy}
                  className="text-[var(--col-red)] hover:text-[var(--text-main)] disabled:opacity-40 shrink-0"
                  title="Удалить связь"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
};
