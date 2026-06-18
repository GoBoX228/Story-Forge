import type { Page, Route } from '@playwright/test';

const now = '2026-06-17T12:00:00.000Z';

type ApiRecord = Record<string, any>;

const user = {
  id: 1,
  name: 'E2E User',
  email: 'e2e@example.test',
  role: 'user',
  status: 'active',
  created_at: now,
  updated_at: now
};

const svgDataUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23d73a31"/%3E%3C/svg%3E';

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item';

const parseBody = (route: Route): ApiRecord => {
  const raw = route.request().postData();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ApiRecord;
  } catch {
    return {};
  }
};

const respondJson = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body)
  });
};

const respondNoContent = async (route: Route) => {
  await route.fulfill({ status: 204 });
};

export async function setupLibraryApiMocks(page: Page) {
  let nextIdValue = 900;
  const nextId = () => String(nextIdValue++);

  let scenarios: ApiRecord[] = [
    { id: '101', title: 'Root Scenario', description: 'Root scenario', scenario_group_id: null, created_at: now, updated_at: now },
    { id: '102', title: 'Grouped Scenario', description: 'Grouped scenario', scenario_group_id: '201', created_at: now, updated_at: now }
  ];
  let scenarioGroups: ApiRecord[] = [
    { id: '201', user_id: '1', name: 'Scenario Group', slug: 'scenario-group', description: null, order_index: 0, created_at: now, updated_at: now }
  ];

  let maps: ApiRecord[] = [
    { id: '301', name: 'Root Map', width: 12, height: 8, cell_size: 48, data: { layers: [] }, created_at: now, updated_at: now }
  ];

  let characterGroups: ApiRecord[] = [
    { id: '411', user_id: '1', name: 'Character Group', slug: 'character-group', description: null, order_index: 0, created_at: now, updated_at: now }
  ];
  let characters: ApiRecord[] = [
    { id: '401', name: 'Root Hero', role: 'NPC', race: '', description: 'Root hero', stats: { str: 1, dex: 1, int: 1 }, inventory: [], character_group_id: null },
    { id: '402', name: 'Grouped Hero', role: 'NPC', race: '', description: 'Grouped hero', stats: { str: 2, dex: 2, int: 2 }, inventory: [], character_group_id: '411' }
  ];

  let itemGroups: ApiRecord[] = [
    { id: '511', user_id: '1', name: 'Item Group', slug: 'item-group', description: null, order_index: 0, created_at: now, updated_at: now }
  ];
  let items: ApiRecord[] = [
    { id: '501', name: 'Root Item', type: 'Gear', rarity: 'common', description: 'Root item', modifiers: [], weight: 1, value: 10, item_group_id: null },
    { id: '502', name: 'Grouped Item', type: 'Gear', rarity: 'rare', description: 'Grouped item', modifiers: [], weight: 2, value: 20, item_group_id: '511' }
  ];

  let assetFolders: ApiRecord[] = [
    { id: '611', user_id: '1', name: 'Asset Folder', slug: 'asset-folder', asset_ids: ['602'], created_at: now, updated_at: now }
  ];
  let assetCollections: ApiRecord[] = [
    { id: '701', user_id: '1', name: 'Asset Set', slug: 'asset-set', description: 'E2E set', asset_ids: ['601'], created_at: now, updated_at: now }
  ];
  let assets: ApiRecord[] = [
    {
      id: '601',
      user_id: '1',
      name: 'Root Asset',
      type: 'image',
      kind: 'portrait',
      asset_folder_id: null,
      collection_ids: ['701'],
      url: svgDataUrl,
      mime_type: 'image/svg+xml',
      size: 128,
      metadata: {},
      created_at: now,
      updated_at: now
    },
    {
      id: '602',
      user_id: '1',
      name: 'Folder Asset',
      type: 'image',
      kind: 'map',
      asset_folder_id: '611',
      collection_ids: [],
      url: svgDataUrl,
      mime_type: 'image/svg+xml',
      size: 128,
      metadata: {},
      created_at: now,
      updated_at: now
    }
  ];

  const syncAssetContainers = () => {
    assetFolders = assetFolders.map((folder) => ({
      ...folder,
      asset_ids: assets.filter((asset) => asset.asset_folder_id === folder.id).map((asset) => asset.id)
    }));
    assetCollections = assetCollections.map((collection) => ({
      ...collection,
      asset_ids: assets.filter((asset) => Array.isArray(asset.collection_ids) && asset.collection_ids.includes(collection.id)).map((asset) => asset.id)
    }));
  };

  const createGroup = (groups: ApiRecord[], body: ApiRecord, fallbackName: string) => ({
    id: nextId(),
    user_id: '1',
    name: body.name ?? fallbackName,
    slug: slugify(body.name ?? fallbackName),
    description: body.description ?? null,
    order_index: Number(body.order_index ?? groups.length),
    created_at: now,
    updated_at: now
  });

  const updateById = (records: ApiRecord[], id: string, patch: ApiRecord) =>
    records.map((record) => record.id === id ? { ...record, ...patch, updated_at: now } : record);

  await page.route('**/*', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api')) {
      return route.continue();
    }
    const path = url.pathname.startsWith('/api') ? (url.pathname.slice(4) || '/') : url.pathname;
    const body = parseBody(route);

    if (method === 'GET' && path === '/auth/csrf') return respondJson(route, { csrf_token: 'e2e-csrf' });
    if (method === 'POST' && path === '/auth/login') return respondJson(route, { user });
    if (method === 'POST' && path === '/auth/refresh') return respondJson(route, { user });
    if (method === 'GET' && path === '/me') return respondJson(route, user);
    if (method === 'PATCH' && path === '/me') return respondJson(route, { ...user, ...body });

    if (method === 'GET' && path === '/campaigns') return respondJson(route, []);
    if (method === 'GET' && path === '/scenarios') return respondJson(route, scenarios);
    if (method === 'GET' && path === '/scenario-groups') return respondJson(route, scenarioGroups);
    if (method === 'GET' && path === '/maps') return respondJson(route, maps);
    if (method === 'GET' && path === '/characters') return respondJson(route, characters);
    if (method === 'GET' && path === '/character-groups') return respondJson(route, characterGroups);
    if (method === 'GET' && path === '/items') return respondJson(route, items);
    if (method === 'GET' && path === '/item-groups') return respondJson(route, itemGroups);
    if (method === 'GET' && path === '/assets') return respondJson(route, assets);
    if (method === 'GET' && path === '/asset-folders') return respondJson(route, assetFolders);
    if (method === 'GET' && path === '/asset-collections') return respondJson(route, assetCollections);
    if (method === 'GET' && ['/locations', '/factions', '/chronicles', '/events', '/tags', '/broadcasts', '/publications'].includes(path)) return respondJson(route, []);
    if (method === 'GET' && (path.startsWith('/tag-targets/') || path.startsWith('/entity-links/') || path.startsWith('/asset-collection-targets/') || path.startsWith('/publication-targets/'))) return respondJson(route, []);

    const scenarioGraphMatch = path.match(/^\/scenarios\/([^/]+)\/(nodes|transitions)$/);
    if (method === 'GET' && scenarioGraphMatch) return respondJson(route, []);

    const scenarioMatch = path.match(/^\/scenarios\/([^/]+)$/);
    if (path === '/scenarios' && method === 'POST') {
      const created = {
        id: nextId(),
        title: body.title ?? 'New Scenario',
        description: body.description ?? '',
        scenario_group_id: body.scenario_group_id ?? body.group_id ?? null,
        created_at: now,
        updated_at: now
      };
      scenarios = [...scenarios, created];
      return respondJson(route, created, 201);
    }
    if (scenarioMatch) {
      const id = scenarioMatch[1];
      if (method === 'GET') return respondJson(route, scenarios.find((record) => record.id === id) ?? {}, scenarios.some((record) => record.id === id) ? 200 : 404);
      if (method === 'PATCH') {
        const patch = {
          ...body,
          scenario_group_id: body.scenario_group_id ?? body.group_id ?? body.scenarioGroupId ?? body.scenario_group_id
        };
        scenarios = updateById(scenarios, id, patch);
        return respondJson(route, scenarios.find((record) => record.id === id) ?? {});
      }
      if (method === 'DELETE') {
        scenarios = scenarios.filter((record) => record.id !== id);
        return respondNoContent(route);
      }
    }

    if (path === '/scenario-groups' && method === 'POST') {
      const created = createGroup(scenarioGroups, body, 'New Scenario Group');
      scenarioGroups = [...scenarioGroups, created];
      return respondJson(route, created, 201);
    }
    const scenarioGroupMatch = path.match(/^\/scenario-groups\/([^/]+)$/);
    if (scenarioGroupMatch) {
      const id = scenarioGroupMatch[1];
      if (method === 'PATCH') {
        scenarioGroups = updateById(scenarioGroups, id, { ...body, slug: body.name ? slugify(body.name) : undefined });
        return respondJson(route, scenarioGroups.find((group) => group.id === id) ?? {});
      }
      if (method === 'DELETE') {
        scenarioGroups = scenarioGroups.filter((group) => group.id !== id);
        scenarios = scenarios.map((scenario) => scenario.scenario_group_id === id ? { ...scenario, scenario_group_id: null } : scenario);
        return respondNoContent(route);
      }
    }

    if (path === '/maps' && method === 'POST') {
      const created = {
        id: nextId(),
        name: body.name ?? 'New Map',
        width: Number(body.width ?? 12),
        height: Number(body.height ?? 8),
        cell_size: Number(body.cell_size ?? body.cellSize ?? 48),
        data: body.data ?? { layers: [] },
        created_at: now,
        updated_at: now
      };
      maps = [...maps, created];
      return respondJson(route, created, 201);
    }
    const mapMatch = path.match(/^\/maps\/([^/]+)$/);
    if (mapMatch) {
      const id = mapMatch[1];
      if (method === 'GET') return respondJson(route, maps.find((record) => record.id === id) ?? {});
      if (method === 'PATCH') {
        maps = updateById(maps, id, body);
        return respondJson(route, maps.find((record) => record.id === id) ?? {});
      }
      if (method === 'DELETE') {
        maps = maps.filter((record) => record.id !== id);
        return respondNoContent(route);
      }
    }

    if (path === '/character-groups' && method === 'POST') {
      const created = createGroup(characterGroups, body, 'New Character Group');
      characterGroups = [...characterGroups, created];
      return respondJson(route, created, 201);
    }
    const characterGroupMatch = path.match(/^\/character-groups\/([^/]+)$/);
    if (characterGroupMatch) {
      const id = characterGroupMatch[1];
      if (method === 'PATCH') {
        characterGroups = updateById(characterGroups, id, { ...body, slug: body.name ? slugify(body.name) : undefined });
        return respondJson(route, characterGroups.find((group) => group.id === id) ?? {});
      }
      if (method === 'DELETE') {
        characterGroups = characterGroups.filter((group) => group.id !== id);
        characters = characters.map((character) => character.character_group_id === id ? { ...character, character_group_id: null } : character);
        return respondNoContent(route);
      }
    }
    if (path === '/characters' && method === 'POST') {
      const created = { id: nextId(), name: body.name ?? 'New Character', role: body.role ?? 'NPC', description: body.description ?? '', stats: body.stats ?? {}, inventory: body.inventory ?? [], character_group_id: body.character_group_id ?? body.group_id ?? null };
      characters = [...characters, created];
      return respondJson(route, created, 201);
    }
    const characterMatch = path.match(/^\/characters\/([^/]+)$/);
    if (characterMatch) {
      const id = characterMatch[1];
      if (method === 'PATCH') {
        const patch = { ...body, character_group_id: body.character_group_id ?? body.group_id ?? body.groupId ?? body.characterGroupId ?? body.character_group_id };
        characters = updateById(characters, id, patch);
        return respondJson(route, characters.find((record) => record.id === id) ?? {});
      }
      if (method === 'DELETE') {
        characters = characters.filter((record) => record.id !== id);
        return respondNoContent(route);
      }
    }

    if (path === '/item-groups' && method === 'POST') {
      const created = createGroup(itemGroups, body, 'New Item Group');
      itemGroups = [...itemGroups, created];
      return respondJson(route, created, 201);
    }
    const itemGroupMatch = path.match(/^\/item-groups\/([^/]+)$/);
    if (itemGroupMatch) {
      const id = itemGroupMatch[1];
      if (method === 'PATCH') {
        itemGroups = updateById(itemGroups, id, { ...body, slug: body.name ? slugify(body.name) : undefined });
        return respondJson(route, itemGroups.find((group) => group.id === id) ?? {});
      }
      if (method === 'DELETE') {
        itemGroups = itemGroups.filter((group) => group.id !== id);
        items = items.map((item) => item.item_group_id === id ? { ...item, item_group_id: null } : item);
        return respondNoContent(route);
      }
    }
    if (path === '/items' && method === 'POST') {
      const created = { id: nextId(), name: body.name ?? 'New Item', type: body.type ?? 'Gear', rarity: body.rarity ?? 'common', description: body.description ?? '', modifiers: body.modifiers ?? [], weight: body.weight ?? 0, value: body.value ?? 0, item_group_id: body.item_group_id ?? body.group_id ?? null };
      items = [...items, created];
      return respondJson(route, created, 201);
    }
    const itemMatch = path.match(/^\/items\/([^/]+)$/);
    if (itemMatch) {
      const id = itemMatch[1];
      if (method === 'PATCH') {
        const patch = { ...body, item_group_id: body.item_group_id ?? body.group_id ?? body.groupId ?? body.itemGroupId ?? body.item_group_id };
        items = updateById(items, id, patch);
        return respondJson(route, items.find((record) => record.id === id) ?? {});
      }
      if (method === 'DELETE') {
        items = items.filter((record) => record.id !== id);
        return respondNoContent(route);
      }
    }

    if (path === '/asset-folders' && method === 'POST') {
      const created = { id: nextId(), user_id: '1', name: body.name ?? 'New Folder', slug: slugify(body.name ?? 'New Folder'), asset_ids: [], created_at: now, updated_at: now };
      assetFolders = [...assetFolders, created];
      return respondJson(route, created, 201);
    }
    const folderMatch = path.match(/^\/asset-folders\/([^/]+)$/);
    if (folderMatch) {
      const id = folderMatch[1];
      if (method === 'PATCH') {
        assetFolders = updateById(assetFolders, id, { ...body, slug: body.name ? slugify(body.name) : undefined });
        return respondJson(route, assetFolders.find((folder) => folder.id === id) ?? {});
      }
      if (method === 'DELETE') {
        assetFolders = assetFolders.filter((folder) => folder.id !== id);
        assets = assets.map((asset) => asset.asset_folder_id === id ? { ...asset, asset_folder_id: null } : asset);
        syncAssetContainers();
        return respondNoContent(route);
      }
    }

    if (path === '/asset-collections' && method === 'POST') {
      const created = { id: nextId(), user_id: '1', name: body.name ?? 'New Set', slug: slugify(body.name ?? 'New Set'), description: body.description ?? null, asset_ids: [], created_at: now, updated_at: now };
      assetCollections = [...assetCollections, created];
      return respondJson(route, created, 201);
    }
    const collectionMatch = path.match(/^\/asset-collections\/([^/]+)$/);
    if (collectionMatch) {
      const id = collectionMatch[1];
      if (method === 'PATCH') {
        assetCollections = updateById(assetCollections, id, { ...body, slug: body.name ? slugify(body.name) : undefined });
        return respondJson(route, assetCollections.find((collection) => collection.id === id) ?? {});
      }
      if (method === 'DELETE') {
        assetCollections = assetCollections.filter((collection) => collection.id !== id);
        assets = assets.map((asset) => ({ ...asset, collection_ids: (asset.collection_ids ?? []).filter((collectionId: string) => collectionId !== id) }));
        syncAssetContainers();
        return respondNoContent(route);
      }
    }

    if (path === '/assets' && method === 'POST') {
      const created = { id: nextId(), user_id: '1', name: 'Uploaded Asset', type: 'image', kind: 'illustration', asset_folder_id: null, collection_ids: [], url: svgDataUrl, mime_type: 'image/svg+xml', size: 128, metadata: {}, created_at: now, updated_at: now };
      assets = [...assets, created];
      syncAssetContainers();
      return respondJson(route, created, 201);
    }
    const assetMatch = path.match(/^\/assets\/([^/]+)$/);
    if (assetMatch) {
      const id = assetMatch[1];
      if (method === 'PATCH') {
        const folderId = body.folder_id ?? body.asset_folder_id ?? body.folderId;
        const collectionIds = body.collection_ids ?? body.collectionIds;
        assets = updateById(assets, id, {
          ...body,
          ...(folderId !== undefined ? { asset_folder_id: folderId } : {}),
          ...(collectionIds !== undefined ? { collection_ids: collectionIds } : {})
        });
        syncAssetContainers();
        return respondJson(route, assets.find((asset) => asset.id === id) ?? {});
      }
      if (method === 'DELETE') {
        assets = assets.filter((asset) => asset.id !== id);
        syncAssetContainers();
        return respondNoContent(route);
      }
    }

    if (method === 'DELETE') return respondNoContent(route);
    return respondJson(route, method === 'GET' ? [] : {});
  });
}
