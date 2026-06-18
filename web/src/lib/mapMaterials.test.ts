import { describe, expect, it } from 'vitest';
import type {
  Asset,
  Character,
  EntityLink,
  EntityLinkAssignmentMap,
  AssetUsageRole,
  Item,
  Scenario
} from '../types';
import { entityLinkAssignmentKey } from './mappers';
import { createMapObjectDisplayResolver, resolveMapMaterialContext } from './mapMaterials';

const scenarios: Scenario[] = [
  { id: 's1', title: 'Первый', description: '', createdAt: '' },
  { id: 's2', title: 'Второй', description: '', createdAt: '' }
];
const characters: Character[] = [
  { id: 'c1', name: 'Анна Лис', role: 'NPC', race: '', description: '', baseStats: {}, inventory: [] },
  { id: 'c2', name: 'Бор', role: 'NPC', race: '', description: '', baseStats: {}, inventory: [] }
];
const items: Item[] = [
  { id: 'i1', name: 'Ключ', type: 'quest', rarity: 'common', description: '', modifiers: [], weight: 0, value: 0 }
];
const assets: Asset[] = [
  {
    id: 'a-token',
    userId: '1',
    type: 'image',
    kind: 'token',
    collectionIds: [],
    name: 'Token',
    url: '/token.png',
    metadata: {}
  },
  {
    id: 'a-portrait',
    userId: '1',
    type: 'image',
    kind: 'portrait',
    collectionIds: [],
    name: 'Portrait',
    url: '/portrait.png',
    metadata: {}
  }
];

const link = (
  id: string,
  sourceType: EntityLink['sourceType'],
  sourceId: string,
  targetType: EntityLink['targetType'],
  targetId: string,
  relationType: EntityLink['relationType'] = 'uses',
  role?: AssetUsageRole
): EntityLink => ({
  id,
  sourceType,
  sourceId,
  targetType,
  targetId,
  relationType,
  metadata: role ? { role } : {}
});

const assignments = (links: EntityLink[]): EntityLinkAssignmentMap => {
  const result: EntityLinkAssignmentMap = {};
  links.forEach((entry) => {
    const key = entityLinkAssignmentKey(entry.sourceType, entry.sourceId);
    result[key] = [...(result[key] ?? []), entry];
  });
  return result;
};

describe('resolveMapMaterialContext', () => {
  it('deduplicates one material inherited from two scenarios and keeps both sources', () => {
    const entityLinks = assignments([
      link('sm1', 'scenario', 's1', 'map', 'm1'),
      link('sm2', 'scenario', 's2', 'map', 'm1'),
      link('sc1', 'scenario', 's1', 'character', 'c1'),
      link('sc2', 'scenario', 's2', 'character', 'c1')
    ]);

    const context = resolveMapMaterialContext({
      mapId: 'm1',
      scenarios,
      characters,
      items,
      assets,
      entityLinks
    });

    expect(context.characters).toHaveLength(1);
    expect(context.characters[0].scenarioSources.map((source) => source.id)).toEqual(['s2', 's1']);
  });

  it('merges local and inherited provenance into one entry', () => {
    const entityLinks = assignments([
      link('sm1', 'scenario', 's1', 'map', 'm1'),
      link('sc1', 'scenario', 's1', 'character', 'c1'),
      link('mc1', 'map', 'm1', 'character', 'c1', 'related')
    ]);

    const context = resolveMapMaterialContext({
      mapId: 'm1',
      scenarios,
      characters,
      items,
      assets,
      entityLinks
    });

    expect(context.characters).toHaveLength(1);
    expect(context.characters[0].local).toBe(true);
    expect(context.characters[0].scenarioSources).toEqual([{ id: 's1', title: 'Первый' }]);
  });

  it('drops inherited material when its only scenario is disconnected but keeps local material', () => {
    const inheritedOnly = resolveMapMaterialContext({
      mapId: 'm1',
      scenarios,
      characters,
      items,
      assets,
      entityLinks: assignments([
        link('sc1', 'scenario', 's1', 'character', 'c1')
      ])
    });
    const local = resolveMapMaterialContext({
      mapId: 'm1',
      scenarios,
      characters,
      items,
      assets,
      entityLinks: assignments([
        link('mc1', 'map', 'm1', 'character', 'c1', 'related')
      ])
    });

    expect(inheritedOnly.materials).toHaveLength(0);
    expect(local.characters[0].local).toBe(true);
  });

  it('uses character token before portrait and ignores non-uses scenario links', () => {
    const entityLinks = assignments([
      link('sm1', 'scenario', 's1', 'map', 'm1'),
      link('sc1', 'scenario', 's1', 'character', 'c1'),
      link('sc2', 'scenario', 's1', 'character', 'c2', 'related'),
      link('ca1', 'character', 'c1', 'asset', 'a-portrait', 'uses', 'portrait'),
      link('ca2', 'character', 'c1', 'asset', 'a-token', 'uses', 'token')
    ]);

    const context = resolveMapMaterialContext({
      mapId: 'm1',
      scenarios,
      characters,
      items,
      assets,
      entityLinks
    });

    expect(context.characters.map((character) => character.id)).toEqual(['c1']);
    expect(context.characters[0].assetId).toBe('a-token');
    expect(context.characters[0].imageUrl).toBe('/token.png');
  });
});

describe('createMapObjectDisplayResolver', () => {
  it('uses current card data and falls back to snapshot after card deletion', () => {
    const entityLinks = assignments([
      link('ca1', 'character', 'c1', 'asset', 'a-token', 'uses', 'token')
    ]);
    const liveResolver = createMapObjectDisplayResolver({
      characters,
      items,
      assets,
      entityLinks
    });
    const detachedResolver = createMapObjectDisplayResolver({
      characters: [],
      items,
      assets,
      entityLinks: {}
    });
    const object = {
      id: 'o1',
      x: 0,
      y: 0,
      type: 'character',
      label: 'Старое имя',
      color: '#FFC300',
      sourceType: 'character' as const,
      sourceId: 'c1',
      assetId: 'a-portrait'
    };

    expect(liveResolver(object)).toMatchObject({
      label: 'Анна Лис',
      assetId: 'a-token',
      detached: false
    });
    expect(detachedResolver(object)).toMatchObject({
      label: 'Старое имя',
      assetId: 'a-portrait',
      detached: true
    });
  });
});
