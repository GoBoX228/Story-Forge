import { Block, Campaign, Chapter, Character, Item, MapData, Scenario, StatKey } from '../types';

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

export const mapScenarioSummary = (api: any): Scenario => ({
  id: String(api.id),
  title: api.title,
  description: api.description ?? '',
  createdAt: api.created_at ?? new Date().toISOString(),
  updatedAt: api.updated_at ?? api.created_at ?? new Date().toISOString(),
  campaignId: api.campaign_id ? String(api.campaign_id) : undefined,
  chapters: Array.isArray(api.chapters) ? api.chapters.map(mapChapterFromApi) : []
});

export const mapScenarioDetail = (api: any): Scenario => {
  const chapters: Chapter[] = Array.isArray(api.chapters) ? api.chapters.map(mapChapterFromApi) : [];
  chapters.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  return {
    id: String(api.id),
    title: api.title,
    description: api.description ?? '',
    createdAt: api.created_at ?? new Date().toISOString(),
    updatedAt: api.updated_at ?? api.created_at ?? new Date().toISOString(),
    campaignId: api.campaign_id ? String(api.campaign_id) : undefined,
    chapters
  };
};

export const mapChapterFromApi = (api: any): Chapter => {
  const blocks: Block[] = Array.isArray(api.blocks) ? api.blocks.map(mapBlockFromApi) : [];
  blocks.sort((a, b) => a.order - b.order);

  return {
    id: String(api.id),
    title: api.title,
    orderIndex: api.order_index ?? 0,
    blocks
  };
};

export const mapBlockFromApi = (api: any): Block => ({
  id: String(api.id),
  type: api.type,
  content: api.content,
  order: api.order_index ?? 0,
  difficulty: api.difficulty ?? undefined
});

export const mapMapFromApi = (api: any): MapData => ({
  id: String(api.id),
  name: api.name,
  width: api.width,
  height: api.height,
  cellSize: api.cell_size,
  objects: api.data?.objects ?? [],
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

export const mapScenarioToApiUpdate = (scenario: Scenario) => ({
  title: scenario.title,
  description: scenario.description,
  campaign_id: scenario.campaignId ?? null
});
