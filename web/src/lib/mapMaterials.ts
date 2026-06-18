import type {
  Asset,
  Character,
  EffectiveMapMaterial,
  EntityLinkAssignmentMap,
  Item,
  MapMaterialContext,
  MapObject,
  MapObjectSourceType,
  Scenario
} from '../types';
import { entityLinkAssignmentKey } from './mappers';
import { findAssetUsageLink } from './assetUsage';

const CHARACTER_COLOR = '#FFC300';
const ITEM_COLOR = '#8338EC';
const ASSET_COLOR = '#2A9D8F';

const materialKey = (materialType: 'character' | 'item', id: string): string =>
  `${materialType}:${id}`;

export const getMapMaterialInitials = (name: string): string => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
};

const characterAssetId = (
  characterId: string,
  entityLinks: EntityLinkAssignmentMap
): string | null => {
  const links = entityLinks[entityLinkAssignmentKey('character', characterId)] ?? [];
  return findAssetUsageLink(links, 'token')?.targetId
    ?? findAssetUsageLink(links, 'portrait')?.targetId
    ?? null;
};

const itemAssetId = (
  itemId: string,
  entityLinks: EntityLinkAssignmentMap
): string | null => {
  const links = entityLinks[entityLinkAssignmentKey('item', itemId)] ?? [];
  return findAssetUsageLink(links, 'item_image')?.targetId ?? null;
};

interface ResolveMapMaterialContextOptions {
  mapId: string;
  scenarios: Scenario[];
  characters: Character[];
  items: Item[];
  assets: Asset[];
  entityLinks: EntityLinkAssignmentMap;
}

export const resolveMapMaterialContext = ({
  mapId,
  scenarios,
  characters,
  items,
  assets,
  entityLinks
}: ResolveMapMaterialContextOptions): MapMaterialContext => {
  const characterById = new Map(characters.map((character) => [character.id, character]));
  const itemById = new Map(items.map((item) => [item.id, item]));
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const linkedScenarios = scenarios.filter((scenario) =>
    (entityLinks[entityLinkAssignmentKey('scenario', scenario.id)] ?? []).some((link) =>
      link.targetType === 'map'
      && link.targetId === mapId
      && link.relationType === 'uses'
    )
  );
  const entries = new Map<string, {
    materialType: 'character' | 'item';
    id: string;
    local: boolean;
    scenarioSources: Map<string, Scenario>;
  }>();

  const ensureEntry = (
    materialType: 'character' | 'item',
    id: string
  ) => {
    const key = materialKey(materialType, id);
    const existing = entries.get(key);
    if (existing) return existing;

    const next = {
      materialType,
      id,
      local: false,
      scenarioSources: new Map<string, Scenario>()
    };
    entries.set(key, next);
    return next;
  };

  const localLinks = entityLinks[entityLinkAssignmentKey('map', mapId)] ?? [];
  localLinks.forEach((link) => {
    if (
      (link.targetType === 'character' || link.targetType === 'item')
      && (link.relationType === 'related' || link.relationType === 'uses')
    ) {
      ensureEntry(link.targetType, link.targetId).local = true;
    }
  });

  linkedScenarios.forEach((scenario) => {
    const scenarioLinks = entityLinks[entityLinkAssignmentKey('scenario', scenario.id)] ?? [];
    scenarioLinks.forEach((link) => {
      if (
        (link.targetType === 'character' || link.targetType === 'item')
        && link.relationType === 'uses'
      ) {
        ensureEntry(link.targetType, link.targetId).scenarioSources.set(scenario.id, scenario);
      }
    });
  });

  const materials = Array.from(entries.values())
    .map((entry): EffectiveMapMaterial | null => {
      const material = entry.materialType === 'character'
        ? characterById.get(entry.id)
        : itemById.get(entry.id);
      if (!material) return null;

      const assetId = entry.materialType === 'character'
        ? characterAssetId(entry.id, entityLinks)
        : itemAssetId(entry.id, entityLinks);
      const asset = assetId ? assetById.get(assetId) : undefined;

      return {
        key: materialKey(entry.materialType, entry.id),
        materialType: entry.materialType,
        id: entry.id,
        name: material.name,
        local: entry.local,
        scenarioSources: Array.from(entry.scenarioSources.values())
          .map((scenario) => ({ id: scenario.id, title: scenario.title }))
          .sort((left, right) => left.title.localeCompare(right.title, 'ru')),
        assetId,
        imageUrl: asset?.url ?? null,
        color: entry.materialType === 'character' ? CHARACTER_COLOR : ITEM_COLOR,
        initials: getMapMaterialInitials(material.name)
      };
    })
    .filter((material): material is EffectiveMapMaterial => Boolean(material))
    .sort((left, right) => {
      if (left.materialType !== right.materialType) {
        return left.materialType === 'character' ? -1 : 1;
      }
      return left.name.localeCompare(right.name, 'ru');
    });

  return {
    linkedScenarios,
    characters: materials.filter((material) => material.materialType === 'character'),
    items: materials.filter((material) => material.materialType === 'item'),
    materials
  };
};

export interface ResolvedMapObjectDisplay {
  label: string;
  color: string;
  assetId: string | null;
  initials: string | null;
  detached: boolean;
}

interface CreateMapObjectDisplayResolverOptions {
  characters: Character[];
  items: Item[];
  assets: Asset[];
  entityLinks: EntityLinkAssignmentMap;
}

export type MapObjectDisplayResolver = (object: MapObject) => ResolvedMapObjectDisplay;

export const createMapObjectDisplayResolver = ({
  characters,
  items,
  assets,
  entityLinks
}: CreateMapObjectDisplayResolverOptions): MapObjectDisplayResolver => {
  const characterById = new Map(characters.map((character) => [character.id, character]));
  const itemById = new Map(items.map((item) => [item.id, item]));
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));

  return (object) => {
    const sourceType = object.sourceType;
    const sourceId = object.sourceId;

    if (sourceType === 'character' && sourceId) {
      const character = characterById.get(sourceId);
      if (character) {
        return {
          label: character.name,
          color: object.color || CHARACTER_COLOR,
          assetId: characterAssetId(sourceId, entityLinks),
          initials: getMapMaterialInitials(character.name),
          detached: false
        };
      }
    }

    if (sourceType === 'item' && sourceId) {
      const item = itemById.get(sourceId);
      if (item) {
        return {
          label: item.name,
          color: object.color || ITEM_COLOR,
          assetId: itemAssetId(sourceId, entityLinks),
          initials: getMapMaterialInitials(item.name),
          detached: false
        };
      }
    }

    if (sourceType === 'asset' && sourceId) {
      const asset = assetById.get(sourceId);
      if (asset) {
        return {
          label: asset.name,
          color: object.color || ASSET_COLOR,
          assetId: asset.id,
          initials: null,
          detached: false
        };
      }
    }

    return {
      label: object.label,
      color: object.color,
      assetId: object.assetId ?? null,
      initials: sourceType === 'character' || sourceType === 'item'
        ? getMapMaterialInitials(object.label)
        : null,
      detached: Boolean((sourceType === 'character' || sourceType === 'item') && sourceId)
    };
  };
};

export const mapObjectSourceIdentity = (
  sourceType?: MapObjectSourceType | null,
  sourceId?: string | null,
  type?: string,
  assetId?: string | null
): string => sourceType && sourceId
  ? `${sourceType}:${sourceId}`
  : `${type ?? ''}:${assetId ?? ''}`;
