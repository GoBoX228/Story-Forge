import {
  Asset,
  AssetType,
  AssetUpdatePayload,
  Campaign,
  Character,
  EntityLink,
  EntityLinkCreatePayload,
  EntityLinkRelationType,
  EntityLinkTargetType,
  EntityLinkUpdatePayload,
  Faction,
  Item,
  MapData,
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
const ASSET_TYPES: AssetType[] = ['image', 'token', 'document', 'other'];
const PUBLICATION_STATUSES: PublicationStatus[] = ['draft', 'published', 'archived'];
const PUBLICATION_VISIBILITIES: PublicationVisibility[] = ['private', 'unlisted', 'public'];

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

export const mapMapFromApi = (api: any): MapData => ({
  id: String(api.id),
  name: api.name,
  width: api.width,
  height: api.height,
  cellSize: api.cell_size,
  objects: (api.data?.objects ?? []).map((object: any) => ({
    ...object,
    assetId: object.assetId ?? object.asset_id ?? null
  })),
  backgroundAssetId: api.data?.backgroundAssetId ?? api.data?.background_asset_id ?? null,
  createdAt: api.created_at ?? new Date().toISOString(),
  updatedAt: api.updated_at ?? api.created_at ?? new Date().toISOString(),
  scenarioId: api.scenario_id ? String(api.scenario_id) : null,
  campaignId: api.campaign_id ? String(api.campaign_id) : null
});

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
  campaignId: api.campaign_id ? String(api.campaign_id) : null
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
});

export const mapItemToApiPayload = (item: Omit<Item, 'id'>) => ({
  name: item.name,
  type: item.type,
  rarity: item.rarity,
  description: item.description ?? '',
  modifiers: item.modifiers ?? [],
  weight: Number(item.weight ?? 0),
  value: Number(item.value ?? 0),
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
  campaignId: api.campaign_id ? String(api.campaign_id) : null,
  type: toAssetType(api.type),
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
  ...(payload.campaignId !== undefined ? { campaign_id: payload.campaignId } : {})
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

export const mapWorldEventFromApi = (api: any): WorldEvent => ({
  id: String(api.id),
  userId: String(api.user_id),
  campaignId: api.campaign_id ? String(api.campaign_id) : null,
  title: api.title ?? '',
  description: api.description ?? '',
  startsAt: api.starts_at ?? null,
  endsAt: api.ends_at ?? null,
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

export const mapWorldEventToApiPayload = (payload: WorldEventPayload | WorldEventUpdatePayload) => ({
  ...(payload.title !== undefined ? { title: payload.title } : {}),
  ...(payload.description !== undefined ? { description: payload.description } : {}),
  ...(payload.startsAt !== undefined ? { starts_at: payload.startsAt } : {}),
  ...(payload.endsAt !== undefined ? { ends_at: payload.endsAt } : {}),
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
