export interface Scenario {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  campaignId?: string;
  relatedMapIds?: string[];
  relatedCharacterIds?: string[];
  relatedItemIds?: string[];
}

export type ScenarioNodeType = 'description' | 'dialog' | 'location' | 'check' | 'loot' | 'combat';

export type ScenarioTransitionType = 'linear' | 'choice' | 'success' | 'failure';

export type ScenarioNodeEntityTargetType = 'map' | 'character' | 'item' | 'asset' | 'location' | 'faction' | 'event';

export type ScenarioNodeConfig =
  | { scene?: string }
  | { speaker?: string }
  | { map_hint?: string }
  | { skill?: string; dc?: number }
  | { item_hint?: string }
  | { encounter?: string };

export type ScenarioTransitionCondition =
  | Record<string, never>
  | { dc?: number; outcome: 'success' | 'failure' };

export interface ScenarioTransitionWaypoint {
  x: number;
  y: number;
}

export interface ScenarioTransitionMetadata {
  visual?: {
    waypoints?: ScenarioTransitionWaypoint[];
  };
}

export interface ScenarioNode {
  id: string;
  scenarioId: string;
  type: ScenarioNodeType;
  title?: string | null;
  content?: string | null;
  position: Record<string, unknown>;
  config: ScenarioNodeConfig;
  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScenarioTransition {
  id: string;
  scenarioId: string;
  fromNodeId: string;
  toNodeId: string;
  type: ScenarioTransitionType;
  label?: string | null;
  condition: ScenarioTransitionCondition;
  metadata: ScenarioTransitionMetadata;
  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScenarioNodeCreatePayload {
  type: ScenarioNodeType;
  title?: string | null;
  content?: string | null;
  position?: Record<string, unknown>;
  config?: ScenarioNodeConfig;
  orderIndex?: number;
}

export type ScenarioNodeUpdatePayload = Partial<ScenarioNodeCreatePayload>;

export interface ScenarioNodeEntityLink {
  id: string;
  sourceType: 'scenario_node';
  sourceId: string;
  targetType: ScenarioNodeEntityTargetType;
  targetId: string;
  relationType: 'related';
  label?: string | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScenarioNodeEntityLinkCreatePayload {
  targetType: ScenarioNodeEntityTargetType;
  targetId: string;
  label?: string | null;
}

export interface ScenarioTransitionCreatePayload {
  fromNodeId: string;
  toNodeId: string;
  type?: ScenarioTransitionType | null;
  label?: string | null;
  condition?: ScenarioTransitionCondition;
  metadata?: ScenarioTransitionMetadata;
  orderIndex?: number;
}

export type ScenarioTransitionUpdatePayload = Partial<ScenarioTransitionCreatePayload>;

export interface MapObject {
  id: string;
  x: number;
  y: number;
  type: string;
  label: string;
  color: string;
  assetId?: string | null;
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  cellSize: number;
  objects: MapObject[];
  backgroundAssetId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  scenarioId?: string | null;
  campaignId?: string | null;
}

export type StatKey = string;

export type TaggableTargetType = 'scenario' | 'map' | 'character' | 'item' | 'asset' | 'location' | 'faction' | 'event';

export type EntityLinkTargetType = TaggableTargetType;

export type EntityLinkRelationType = 'related' | 'uses' | 'located_in' | 'member_of' | 'rewards' | 'mentions';
export type AssetUsageRole = 'portrait' | 'token' | 'item_image' | 'map_background' | 'map_token';

export type EntityLinkMetadata = Record<string, unknown> & {
  role?: AssetUsageRole;
};

export interface EntityLink {
  id: string;
  sourceType: EntityLinkTargetType;
  sourceId: string;
  targetType: EntityLinkTargetType;
  targetId: string;
  relationType: EntityLinkRelationType;
  label?: string | null;
  metadata: EntityLinkMetadata;
  createdAt?: string;
  updatedAt?: string;
}

export type EntityLinkAssignmentMap = Record<string, EntityLink[]>;

export type PublicationTargetType = TaggableTargetType;

export type PublicationStatus = 'draft' | 'published' | 'archived';

export type PublicationVisibility = 'private' | 'unlisted' | 'public';

export interface PublicationMetadata {
  summary?: string;
}

export interface PublishedContent {
  id: string;
  contentType: PublicationTargetType;
  contentId: string;
  userId: string;
  status: PublicationStatus;
  visibility: PublicationVisibility;
  slug?: string | null;
  metadata: PublicationMetadata;
  publishedAt?: string | null;
  targetTitle?: string | null;
  targetMissing?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PublicationAssignmentMap = Record<string, PublishedContent | undefined>;

export interface PublicationListParams {
  scope?: 'own' | 'public';
  type?: PublicationTargetType | '';
  status?: PublicationStatus | '';
  visibility?: PublicationVisibility | '';
  search?: string;
}

export interface PublicationUpsertPayload {
  status?: PublicationStatus;
  visibility?: PublicationVisibility;
  metadata?: PublicationMetadata;
}

export type PublicationUpdatePayload = PublicationUpsertPayload;

export interface EntityLinkCreatePayload {
  targetType: EntityLinkTargetType;
  targetId: string;
  relationType?: EntityLinkRelationType;
  label?: string | null;
  metadata?: EntityLinkMetadata;
}

export interface EntityLinkUpdatePayload {
  relationType?: EntityLinkRelationType;
  label?: string | null;
  metadata?: EntityLinkMetadata;
}

export interface Tag {
  id: string;
  userId?: string | null;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TagAssignmentMap = Record<string, Tag[]>;

export interface TagCreatePayload {
  name: string;
}

export interface TagUpdatePayload {
  name: string;
}

export interface TagAssignmentPayload {
  tagIds: string[];
  newTags?: string[];
}

export interface Character {
  id: string;
  name: string;
  role: string;
  race: string;
  description: string;
  level: number;
  baseStats: Record<StatKey, number>;
  inventory: string[];
  scenarioId?: string | null;
  campaignId?: string | null;
}

export type ItemRarity = string;
export type ItemType = string;

export interface StatModifier {
  stat: StatKey;
  value: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  modifiers: StatModifier[];
  weight: number;
  value: number;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  tags: string[];
  resources: string[];
  scenarioIds: string[];
  mapIds: string[];
  characterIds: string[];
  progress: number;
  lastPlayed: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AssetType = 'image' | 'token' | 'document' | 'other';

export interface Asset {
  id: string;
  userId: string;
  campaignId?: string | null;
  type: AssetType;
  name: string;
  path?: string | null;
  url?: string | null;
  mimeType?: string | null;
  size?: number | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetUploadPayload {
  file: File;
  name?: string;
  type?: AssetType;
  campaignId?: string | null;
}

export interface AssetUpdatePayload {
  name?: string;
  type?: AssetType;
  campaignId?: string | null;
}

export interface WorldLocation {
  id: string;
  userId: string;
  campaignId?: string | null;
  name: string;
  description?: string | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Faction {
  id: string;
  userId: string;
  campaignId?: string | null;
  name: string;
  description?: string | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorldEvent {
  id: string;
  userId: string;
  campaignId?: string | null;
  title: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorldEntityPayload {
  name: string;
  description?: string | null;
  campaignId?: string | null;
  metadata?: Record<string, unknown>;
}

export type WorldEntityUpdatePayload = Partial<WorldEntityPayload>;

export interface WorldEventPayload {
  title: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  campaignId?: string | null;
  metadata?: Record<string, unknown>;
}

export type WorldEventUpdatePayload = Partial<WorldEventPayload>;

export type UserRole = 'user' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'muted' | 'banned';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  twoFactorEnabled?: boolean;
  twoFactorEnabledAt?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  reports_count: number;
}

export type AdminReportStatus = 'open' | 'resolved' | 'dismissed';

export interface AdminReportItem {
  id: string;
  target_type: 'user' | 'scenario' | 'map' | 'character' | 'item' | 'campaign';
  target_id: number;
  reason: string;
  description: string | null;
  status: AdminReportStatus;
  reporter: {
    id: number | null;
    name: string;
    email: string | null;
  };
  reviewed_by: {
    id: number | null;
    name: string | null;
    email: string | null;
  };
  reviewed_at: string | null;
  created_at: string;
}

export interface AdminContentItem {
  type: 'scenario' | 'map' | 'character' | 'item' | 'campaign';
  id: number;
  title: string;
  author: string;
  author_id: number | null;
  reports_total: number;
  reports_open: number;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLogItem {
  id: number;
  action: string;
  details: string | null;
  context: Record<string, unknown>;
  created_at: string;
  user: {
    id: number | null;
    name: string;
    email: string | null;
  };
}

export interface AdminBroadcastItem {
  id: number;
  type: 'info' | 'warning' | 'critical';
  message: string;
  created_at: string;
  author: string;
}

export interface AdminOverview {
  stats: {
    users_total: number;
    users_active: number;
    users_muted: number;
    users_banned: number;
    reports_open: number;
    scenarios_total: number;
    maps_total: number;
    characters_total: number;
    items_total: number;
    campaigns_total: number;
  };
  logs: AdminAuditLogItem[];
  broadcasts: AdminBroadcastItem[];
}
