import {
  Asset,
  AssetCollection,
  AssetCollectionCreatePayload,
  AssetCollectionUpdatePayload,
  AssetFolder,
  AssetFolderCreatePayload,
  AssetFolderUpdatePayload,
  AssetKind,
  AssetType,
  AssetUpdatePayload,
  Campaign,
  Character,
  CharacterGroup,
  CharacterGroupPayload,
  Chronicle,
  ChroniclePayload,
  ChronicleUpdatePayload,
  EntityLink,
  EntityLinkCreatePayload,
  EntityLinkRelationType,
  EntityLinkTargetType,
  EntityLinkUpdatePayload,
  Faction,
  Item,
  ItemGroup,
  ItemGroupPayload,
  MapData,
  MapLayer,
  MapLayerType,
  MapObject,
  PublishedContent,
  PublicationListParams,
  PublicationStatus,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload,
  PublicationVisibility,
  Scenario,
  ScenarioNode,
  ScenarioNodeConfig,
  ScenarioNodeEntityLink,
  ScenarioNodeEntityLinkCreatePayload,
  ScenarioNodeEntityTargetType,
  ScenarioNodeCreatePayload,
  ScenarioNodeType,
  ScenarioNodeUpdatePayload,
  ScenarioTransition,
  ScenarioTransitionCondition,
  ScenarioTransitionCreatePayload,
  ScenarioTransitionMetadata,
  ScenarioTransitionType,
  ScenarioTransitionUpdatePayload,
  StatKey,
  Tag,
  TagAssignmentPayload,
  TagCreatePayload,
  TagUpdatePayload,
  WorldEntityPayload,
  WorldEntityUpdatePayload,
  WorldEvent,
  WorldEventPayload,
  WorldEventUpdatePayload,
  WorldLocation
} from '../types';

const DEFAULT_STATS: Record<StatKey, number> = {
  АТК: 10,
  ЗАЩ: 10,
  СИЛ: 10,
  ЛОВ: 10,
  ВЫН: 10,
  ИНТ: 10,
  МДР: 10,
  ХАР: 10,
  УДЧ: 10
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
};

const toApiDate = (value?: string | null): string | null => {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const ddmmyyyy = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

export const tagAssignmentKey = (type: string, id: string): string => `${type}:${id}`;

export const entityLinkAssignmentKey = (type: string, id: string): string => `${type}:${id}`;

export const assetCollectionAssignmentKey = (type: string, id: string): string => `${type}:${id}`;

const NODE_TYPES: ScenarioNodeType[] = ['description', 'dialog', 'location', 'check', 'loot', 'combat'];
const TRANSITION_TYPES: ScenarioTransitionType[] = ['linear', 'choice', 'success', 'failure'];
const ENTITY_TARGET_TYPES: ScenarioNodeEntityTargetType[] = [
  'map',
  'character',
  'item',
  'asset',
  'location',
  'faction',
  'event'
];
const UNIVERSAL_ENTITY_TARGET_TYPES: EntityLinkTargetType[] = [
  'scenario',
  'map',
  'character',
  'item',
  'asset',
  'location',
  'faction',
  'event'
];
const ENTITY_RELATION_TYPES: EntityLinkRelationType[] = [
  'related',
  'uses',
  'located_in',
  'member_of',
  'rewards',
  'mentions'
];
const ASSET_TYPES: AssetType[] = ['image', 'document', 'other'];
const ASSET_KINDS: AssetKind[] = [
  'tile',
  'token',
  'portrait',
  'background',
  'item_image',
  'handout',
  'document',
  'icon',
  'other'
];
const PUBLICATION_STATUSES: PublicationStatus[] = ['draft', 'published', 'archived'];
const PUBLICATION_VISIBILITIES: PublicationVisibility[] = ['private', 'unlisted', 'public'];
const MAP_LAYER_TYPES: MapLayerType[] = ['background', 'tiles', 'tokens'];

const clampUnit = (value: unknown, fallback = 1): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
};

const positiveNumber = (value: unknown, fallback = 1): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
};

const toMapLayerType = (value: unknown): MapLayerType => {
  const type = String(value ?? 'tiles');
  return MAP_LAYER_TYPES.includes(type as MapLayerType) ? (type as MapLayerType) : 'tiles';
};

const mapMapObjectFromApi = (object: any, layerId?: string | null, index = 0): MapObject => {
  const x = Number(object?.x ?? 0);
  const y = Number(object?.y ?? 0);
  const type = String(object?.type ?? 'floor');

  return {
    ...object,
    id: String(object?.id ?? `${layerId ?? 'object'}-${index}-${x}-${y}-${type}`),
    x,
    y,
    type,
    label: String(object?.label ?? object?.type ?? 'Object'),
    color: String(object?.color ?? '#888888'),
    assetId: object?.assetId ?? object?.asset_id ?? null,
    width: positiveNumber(object?.width, 1),
    height: positiveNumber(object?.height, 1),
    rotation: Number.isFinite(Number(object?.rotation)) ? Number(object.rotation) : 0,
    opacity: clampUnit(object?.opacity, 1),
    layerId: object?.layerId ?? object?.layer_id ?? layerId ?? null
  };
};

const buildDefaultMapLayers = (
  legacyObjects: MapObject[],
  backgroundAssetId?: string | null
): MapLayer[] => {
  const layers: MapLayer[] = [
    {
      id: 'background',
      type: 'background',
      name: 'Background',
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
      objects: []
    },
    {
      id: 'tiles',
      type: 'tiles',
      name: 'Tiles',
      visible: true,
      locked: false,
      opacity: 1,
      order: 1,
      objects: legacyObjects
        .filter((object) => !object.assetId)
        .map((object) => ({ ...object, layerId: 'tiles' }))
    },
    {
      id: 'tokens',
      type: 'tokens',
      name: 'Tokens',
      visible: true,
      locked: false,
      opacity: 1,
      order: 2,
      objects: legacyObjects
        .filter((object) => Boolean(object.assetId))
        .map((object) => ({ ...object, layerId: 'tokens' }))
    }
  ];

  return layers.map((layer) => ({
    ...layer,
    opacity: layer.type === 'background' && !backgroundAssetId ? 1 : layer.opacity
  }));
};

const normalizeMapLayers = (data: any, legacyObjects: MapObject[], backgroundAssetId?: string | null): MapLayer[] => {
  if (!Array.isArray(data?.layers)) {
    return buildDefaultMapLayers(legacyObjects, backgroundAssetId);
  }

  const layers = data.layers.map((layer: any, index: number): MapLayer => {
    const id = String(layer?.id ?? `${toMapLayerType(layer?.type)}-${index}`);
    const type = toMapLayerType(layer?.type);
    return {
      id,
      type,
      name: String(layer?.name ?? (type === 'background' ? 'Background' : type === 'tokens' ? 'Tokens' : 'Tiles')),
      visible: layer?.visible !== false,
      locked: Boolean(layer?.locked),
      opacity: clampUnit(layer?.opacity, 1),
      order: Number.isFinite(Number(layer?.order)) ? Number(layer.order) : index,
      objects: Array.isArray(layer?.objects)
        ? layer.objects.map((object: any, objectIndex: number) => mapMapObjectFromApi(object, id, objectIndex))
        : []
    };
  });

  const withRequiredLayers = [...layers];
  const ensureLayer = (type: MapLayerType, id: string, name: string, order: number) => {
    if (!withRequiredLayers.some((layer) => layer.type === type)) {
      withRequiredLayers.push({ id, type, name, visible: true, locked: false, opacity: 1, order, objects: [] });
    }
  };

  ensureLayer('background', 'background', 'Background', 0);
  ensureLayer('tiles', 'tiles', 'Tiles', 1);
  ensureLayer('tokens', 'tokens', 'Tokens', 2);

  return withRequiredLayers.sort((a, b) => a.order - b.order);
};

const flattenMapLayers = (layers: MapLayer[]): MapObject[] =>
  layers
    .filter((layer) => layer.type !== 'background')
    .sort((a, b) => a.order - b.order)
    .flatMap((layer) => layer.objects.map((object) => ({ ...object, layerId: layer.id })));

const toScenarioNodeType = (value: unknown): ScenarioNodeType => {
  const type = String(value ?? 'description');
  return NODE_TYPES.includes(type as ScenarioNodeType) ? (type as ScenarioNodeType) : 'description';
};

const toScenarioTransitionType = (value: unknown): ScenarioTransitionType => {
  const type = String(value ?? 'linear');
  return TRANSITION_TYPES.includes(type as ScenarioTransitionType) ? (type as ScenarioTransitionType) : 'linear';
};

const toScenarioNodeEntityTargetType = (value: unknown): ScenarioNodeEntityTargetType => {
  const type = String(value ?? 'map');
  return ENTITY_TARGET_TYPES.includes(type as ScenarioNodeEntityTargetType) ? (type as ScenarioNodeEntityTargetType) : 'map';
};

const toEntityLinkTargetType = (value: unknown): EntityLinkTargetType => {
  const type = String(value ?? 'scenario');
  return UNIVERSAL_ENTITY_TARGET_TYPES.includes(type as EntityLinkTargetType) ? (type as EntityLinkTargetType) : 'scenario';
};

const toEntityLinkRelationType = (value: unknown): EntityLinkRelationType => {
  const type = String(value ?? 'related');
  return ENTITY_RELATION_TYPES.includes(type as EntityLinkRelationType) ? (type as EntityLinkRelationType) : 'related';
};

const toAssetType = (value: unknown): AssetType => {
  const type = String(value ?? 'other');
  return ASSET_TYPES.includes(type as AssetType) ? (type as AssetType) : 'other';
};

const toAssetKind = (value: unknown): AssetKind => {
  const kind = String(value ?? 'other');
  return ASSET_KINDS.includes(kind as AssetKind) ? (kind as AssetKind) : 'other';
};

const toPublicationStatus = (value: unknown): PublicationStatus => {
  const status = String(value ?? 'draft');
  return PUBLICATION_STATUSES.includes(status as PublicationStatus) ? (status as PublicationStatus) : 'draft';
};

const toPublicationVisibility = (value: unknown): PublicationVisibility => {
  const visibility = String(value ?? 'private');
  return PUBLICATION_VISIBILITIES.includes(visibility as PublicationVisibility)
    ? (visibility as PublicationVisibility)
    : 'private';
};

export const mapScenarioSummary = (api: any): Scenario => ({
  id: String(api.id),
  title: api.title,
  description: api.description ?? '',
  createdAt: api.created_at ?? new Date().toISOString(),
  updatedAt: api.updated_at ?? api.created_at ?? new Date().toISOString(),
  campaignId: api.campaign_id ? String(api.campaign_id) : undefined
});

export const mapScenarioDetail = (api: any): Scenario => ({
  id: String(api.id),
  title: api.title,
  description: api.description ?? '',
  createdAt: api.created_at ?? new Date().toISOString(),
  updatedAt: api.updated_at ?? api.created_at ?? new Date().toISOString(),
  campaignId: api.campaign_id ? String(api.campaign_id) : undefined
});

export const mapScenarioNodeFromApi = (api: any): ScenarioNode => ({
  id: String(api.id),
  scenarioId: String(api.scenario_id),
  type: toScenarioNodeType(api.type),
  title: api.title ?? '',
  content: api.content ?? '',
  position: toRecord(api.position),
  config: toRecord(api.config) as ScenarioNodeConfig,
  orderIndex: api.order_index ?? 0,
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapScenarioTransitionFromApi = (api: any): ScenarioTransition => ({
  id: String(api.id),
  scenarioId: String(api.scenario_id),
  fromNodeId: String(api.from_node_id),
  toNodeId: String(api.to_node_id),
  type: toScenarioTransitionType(api.type),
  label: api.label ?? '',
  condition: toRecord(api.condition) as ScenarioTransitionCondition,
  metadata: toRecord(api.metadata) as ScenarioTransitionMetadata,
  orderIndex: api.order_index ?? 0,
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapScenarioNodeToApiPayload = (payload: ScenarioNodeCreatePayload | ScenarioNodeUpdatePayload) => ({
  ...(payload.type !== undefined ? { type: payload.type } : {}),
  ...(payload.title !== undefined ? { title: payload.title } : {}),
  ...(payload.content !== undefined ? { content: payload.content } : {}),
  ...(payload.position !== undefined ? { position: payload.position } : {}),
  ...(payload.config !== undefined ? { config: payload.config } : {}),
  ...(payload.orderIndex !== undefined ? { order_index: payload.orderIndex } : {})
});

export const mapScenarioNodeEntityLinkFromApi = (api: any): ScenarioNodeEntityLink => ({
  id: String(api.id),
  sourceType: api.source_type ?? 'scenario_node',
  sourceId: String(api.source_id),
  targetType: toScenarioNodeEntityTargetType(api.target_type),
  targetId: String(api.target_id),
  relationType: api.relation_type ?? 'related',
  label: api.label ?? '',
  metadata: toRecord(api.metadata),
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapScenarioNodeEntityLinkToApiPayload = (payload: ScenarioNodeEntityLinkCreatePayload) => ({
  target_type: payload.targetType,
  target_id: Number(payload.targetId),
  ...(payload.label !== undefined ? { label: payload.label } : {})
});

export const mapEntityLinkFromApi = (api: any): EntityLink => ({
  id: String(api.id),
  sourceType: toEntityLinkTargetType(api.source_type),
  sourceId: String(api.source_id),
  targetType: toEntityLinkTargetType(api.target_type),
  targetId: String(api.target_id),
  relationType: toEntityLinkRelationType(api.relation_type),
  label: api.label ?? '',
  metadata: toRecord(api.metadata),
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapEntityLinkToApiPayload = (payload: EntityLinkCreatePayload | EntityLinkUpdatePayload) => ({
  ...('targetType' in payload && payload.targetType !== undefined ? { target_type: payload.targetType } : {}),
  ...('targetId' in payload && payload.targetId !== undefined ? { target_id: Number(payload.targetId) } : {}),
  ...(payload.relationType !== undefined ? { relation_type: payload.relationType } : {}),
  ...(payload.label !== undefined ? { label: payload.label } : {}),
  ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {})
});

export const publicationAssignmentKey = (type: string, id: string): string => `${type}:${id}`;

export const mapPublishedContentFromApi = (api: any): PublishedContent => ({
  id: String(api.id),
  contentType: toEntityLinkTargetType(api.content_type) as PublicationTargetType,
  contentId: String(api.content_id),
  userId: String(api.user_id),
  status: toPublicationStatus(api.status),
  visibility: toPublicationVisibility(api.visibility),
  slug: api.slug ?? null,
  metadata: toRecord(api.metadata) as PublishedContent['metadata'],
  publishedAt: api.published_at ?? null,
  targetTitle: api.target_title ?? null,
  targetMissing: Boolean(api.target_missing ?? false),
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapPublicationToApiPayload = (payload: PublicationUpsertPayload | PublicationUpdatePayload) => ({
  ...(payload.status !== undefined ? { status: payload.status } : {}),
  ...(payload.visibility !== undefined ? { visibility: payload.visibility } : {}),
  ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {})
});

export const mapPublicationListParamsToQuery = (params: PublicationListParams = {}): string => {
  const query = new URLSearchParams();
  if (params.scope) query.set('scope', params.scope);
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  if (params.visibility) query.set('visibility', params.visibility);
  if (params.search) query.set('search', params.search);
  const value = query.toString();
  return value ? `?${value}` : '';
};

export const mapScenarioTransitionToApiPayload = (
  payload: ScenarioTransitionCreatePayload | ScenarioTransitionUpdatePayload
) => ({
  ...(payload.fromNodeId !== undefined ? { from_node_id: payload.fromNodeId } : {}),
  ...(payload.toNodeId !== undefined ? { to_node_id: payload.toNodeId } : {}),
  ...(payload.type !== undefined ? { type: payload.type } : {}),
  ...(payload.label !== undefined ? { label: payload.label } : {}),
  ...(payload.condition !== undefined ? { condition: payload.condition } : {}),
  ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
  ...(payload.orderIndex !== undefined ? { order_index: payload.orderIndex } : {})
});

export const mapMapFromApi = (api: any): MapData => {
  const data = toRecord(api.data);
  const legacyObjects = Array.isArray(data.objects)
    ? data.objects.map((object: any, objectIndex: number) => mapMapObjectFromApi(object, null, objectIndex))
    : [];
  const backgroundAssetId = data.backgroundAssetId ?? data.background_asset_id ?? null;
  const layers = normalizeMapLayers(data, legacyObjects, backgroundAssetId as string | null);

  return {
    id: String(api.id),
    name: api.name,
    width: api.width,
    height: api.height,
    cellSize: api.cell_size,
    objects: flattenMapLayers(layers),
    layers,
    backgroundAssetId: backgroundAssetId as string | null,
    createdAt: api.created_at ?? new Date().toISOString(),
    updatedAt: api.updated_at ?? api.created_at ?? new Date().toISOString(),
    scenarioId: api.scenario_id ? String(api.scenario_id) : null,
    campaignId: api.campaign_id ? String(api.campaign_id) : null
  };
};

export const mapCharacterFromApi = (api: any): Character => ({
  id: String(api.id),
  name: api.name,
  role: api.role ?? 'NPC',
  race: api.race ?? '',
  description: api.description ?? '',
  level: api.level ?? 1,
  baseStats: api.stats ?? { ...DEFAULT_STATS },
  inventory: api.inventory ?? [],
  scenarioId: api.scenario_id ? String(api.scenario_id) : null,
  campaignId: api.campaign_id ? String(api.campaign_id) : null,
  groupId: api.character_group_id || api.group_id ? String(api.character_group_id ?? api.group_id) : null
});

export const mapCharacterGroupFromApi = (api: any): CharacterGroup => ({
  id: String(api.id),
  userId: String(api.user_id),
  name: api.name ?? '',
  slug: api.slug ?? '',
  description: api.description ?? null,
  orderIndex: Number(api.order_index ?? 0),
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapCharacterGroupToApiPayload = (payload: CharacterGroupPayload) => ({
  ...(payload.name !== undefined ? { name: payload.name } : {}),
  ...(payload.description !== undefined ? { description: payload.description } : {}),
  ...(payload.orderIndex !== undefined ? { order_index: payload.orderIndex } : {})
});

export const mapItemFromApi = (api: any): Item => ({
  id: String(api.id),
  name: api.name ?? '',
  type: api.type ?? 'Прочее',
  rarity: api.rarity ?? 'Обычный',
  description: api.description ?? '',
  modifiers: Array.isArray(api.modifiers)
    ? api.modifiers.map((modifier: any) => ({
        stat: String(modifier?.stat ?? ''),
        value: Number(modifier?.value ?? 0),
      }))
    : [],
  weight: Number(api.weight ?? 0),
  value: Number(api.value ?? 0),
  groupId: api.item_group_id || api.group_id ? String(api.item_group_id ?? api.group_id) : null,
});

export const mapItemToApiPayload = (item: Omit<Item, 'id'>) => ({
  name: item.name,
  type: item.type,
  rarity: item.rarity,
  description: item.description ?? '',
  modifiers: item.modifiers ?? [],
  weight: Number(item.weight ?? 0),
  value: Number(item.value ?? 0),
  group_id: item.groupId ?? null,
});

export const mapItemGroupFromApi = (api: any): ItemGroup => ({
  id: String(api.id),
  userId: String(api.user_id),
  name: api.name ?? '',
  slug: api.slug ?? '',
  description: api.description ?? null,
  orderIndex: Number(api.order_index ?? 0),
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapItemGroupToApiPayload = (payload: ItemGroupPayload) => ({
  ...(payload.name !== undefined ? { name: payload.name } : {}),
  ...(payload.description !== undefined ? { description: payload.description } : {}),
  ...(payload.orderIndex !== undefined ? { order_index: payload.orderIndex } : {})
});

export const mapCampaignFromApi = (api: any): Campaign => ({
  id: String(api.id),
  title: api.title ?? '',
  description: api.description ?? '',
  tags: toStringArray(api.tags),
  resources: toStringArray(api.resources),
  scenarioIds: toStringArray(api.scenario_ids),
  mapIds: toStringArray(api.map_ids),
  characterIds: toStringArray(api.character_ids),
  progress: Number.isFinite(api.progress) ? Number(api.progress) : 0,
  lastPlayed: api.last_played ?? new Date().toISOString().slice(0, 10),
  createdAt: api.created_at ?? new Date().toISOString(),
  updatedAt: api.updated_at ?? api.created_at ?? new Date().toISOString()
});

export const mapAssetFromApi = (api: any): Asset => ({
  id: String(api.id),
  userId: String(api.user_id),
  type: toAssetType(api.type),
  kind: toAssetKind(api.kind),
  folderId: api.asset_folder_id ? String(api.asset_folder_id) : null,
  collectionIds: toStringArray(api.collection_ids),
  name: api.name ?? '',
  path: api.path ?? null,
  url: api.url ?? null,
  mimeType: api.mime_type ?? null,
  size: api.size ?? null,
  metadata: toRecord(api.metadata),
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapAssetToApiPayload = (payload: AssetUpdatePayload) => ({
  ...(payload.name !== undefined ? { name: payload.name } : {}),
  ...(payload.type !== undefined ? { type: payload.type } : {}),
  ...(payload.kind !== undefined ? { kind: payload.kind } : {}),
  ...(payload.folderId !== undefined ? { folder_id: payload.folderId } : {}),
  ...(payload.collectionIds !== undefined ? { collection_ids: payload.collectionIds } : {})
});

export const mapAssetFolderFromApi = (api: any): AssetFolder => ({
  id: String(api.id),
  userId: String(api.user_id),
  name: api.name ?? '',
  slug: api.slug ?? '',
  assetIds: toStringArray(api.asset_ids),
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapAssetFolderToApiPayload = (
  payload: AssetFolderCreatePayload | AssetFolderUpdatePayload
) => ({
  ...(payload.name !== undefined ? { name: payload.name } : {})
});

export const mapAssetCollectionFromApi = (api: any): AssetCollection => ({
  id: String(api.id),
  userId: String(api.user_id),
  name: api.name ?? '',
  slug: api.slug ?? '',
  description: api.description ?? null,
  assetIds: toStringArray(api.asset_ids),
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapAssetCollectionToApiPayload = (
  payload: AssetCollectionCreatePayload | AssetCollectionUpdatePayload
) => ({
  ...(payload.name !== undefined ? { name: payload.name } : {}),
  ...(payload.description !== undefined ? { description: payload.description } : {})
});

export const mapWorldLocationFromApi = (api: any): WorldLocation => ({
  id: String(api.id),
  userId: String(api.user_id),
  campaignId: api.campaign_id ? String(api.campaign_id) : null,
  name: api.name ?? '',
  description: api.description ?? '',
  metadata: toRecord(api.metadata),
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapFactionFromApi = (api: any): Faction => ({
  id: String(api.id),
  userId: String(api.user_id),
  campaignId: api.campaign_id ? String(api.campaign_id) : null,
  name: api.name ?? '',
  description: api.description ?? '',
  metadata: toRecord(api.metadata),
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapChronicleFromApi = (api: any): Chronicle => ({
  id: String(api.id),
  userId: String(api.user_id),
  campaignId: api.campaign_id ? String(api.campaign_id) : null,
  title: api.title ?? '',
  description: api.description ?? '',
  startLabel: api.start_label ?? null,
  endLabel: api.end_label ?? null,
  stepSize: Number(api.step_size ?? 10),
  metadata: toRecord(api.metadata),
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapWorldEventFromApi = (api: any): WorldEvent => ({
  id: String(api.id),
  userId: String(api.user_id),
  campaignId: api.campaign_id ? String(api.campaign_id) : null,
  chronicleId: api.chronicle_id ? String(api.chronicle_id) : null,
  title: api.title ?? '',
  description: api.description ?? '',
  startsAt: api.starts_at ?? null,
  endsAt: api.ends_at ?? null,
  position: Number(api.position ?? 0),
  endPosition: api.end_position === null || api.end_position === undefined ? null : Number(api.end_position),
  startLabel: api.start_label ?? null,
  endLabel: api.end_label ?? null,
  metadata: toRecord(api.metadata),
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapWorldEntityToApiPayload = (payload: WorldEntityPayload | WorldEntityUpdatePayload) => ({
  ...(payload.name !== undefined ? { name: payload.name } : {}),
  ...(payload.description !== undefined ? { description: payload.description } : {}),
  ...(payload.campaignId !== undefined ? { campaign_id: payload.campaignId } : {}),
  ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {})
});

export const mapChronicleToApiPayload = (payload: ChroniclePayload | ChronicleUpdatePayload) => ({
  ...(payload.title !== undefined ? { title: payload.title } : {}),
  ...(payload.description !== undefined ? { description: payload.description } : {}),
  ...(payload.startLabel !== undefined ? { start_label: payload.startLabel } : {}),
  ...(payload.endLabel !== undefined ? { end_label: payload.endLabel } : {}),
  ...(payload.stepSize !== undefined ? { step_size: payload.stepSize } : {}),
  ...(payload.campaignId !== undefined ? { campaign_id: payload.campaignId } : {}),
  ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {})
});

export const mapWorldEventToApiPayload = (payload: WorldEventPayload | WorldEventUpdatePayload) => ({
  ...(payload.title !== undefined ? { title: payload.title } : {}),
  ...(payload.description !== undefined ? { description: payload.description } : {}),
  ...(payload.chronicleId !== undefined ? { chronicle_id: payload.chronicleId } : {}),
  ...(payload.startsAt !== undefined ? { starts_at: payload.startsAt } : {}),
  ...(payload.endsAt !== undefined ? { ends_at: payload.endsAt } : {}),
  ...(payload.position !== undefined ? { position: payload.position } : {}),
  ...(payload.endPosition !== undefined ? { end_position: payload.endPosition } : {}),
  ...(payload.startLabel !== undefined ? { start_label: payload.startLabel } : {}),
  ...(payload.endLabel !== undefined ? { end_label: payload.endLabel } : {}),
  ...(payload.campaignId !== undefined ? { campaign_id: payload.campaignId } : {}),
  ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {})
});

export const mapCampaignToApiPayload = (campaign: Partial<Campaign>) => ({
  title: campaign.title ?? '',
  description: campaign.description ?? '',
  tags: campaign.tags ?? [],
  resources: campaign.resources ?? [],
  progress: campaign.progress ?? 0,
  last_played: toApiDate(campaign.lastPlayed),
  scenario_ids: (campaign.scenarioIds ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id)),
  map_ids: (campaign.mapIds ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id)),
  character_ids: (campaign.characterIds ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id))
});

export const mapTagFromApi = (api: any): Tag => ({
  id: String(api.id),
  userId: api.user_id ? String(api.user_id) : null,
  name: api.name ?? '',
  slug: api.slug ?? '',
  createdAt: api.created_at ?? undefined,
  updatedAt: api.updated_at ?? undefined
});

export const mapTagToApiPayload = (payload: TagCreatePayload | TagUpdatePayload) => ({
  name: payload.name
});

export const mapTagAssignmentToApiPayload = (payload: TagAssignmentPayload) => ({
  tag_ids: payload.tagIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)),
  new_tags: payload.newTags ?? []
});

export const mapScenarioToApiUpdate = (scenario: Scenario) => ({
  title: scenario.title,
  description: scenario.description,
  campaign_id: scenario.campaignId ?? null
});
