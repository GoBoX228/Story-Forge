export type BlockType = string;

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  order: number;
  difficulty?: number;
}

export interface Chapter {
  id: string;
  title: string;
  orderIndex?: number;
  blocks: Block[];
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  chapters: Chapter[];
  createdAt: string;
  updatedAt?: string;
  campaignId?: string;
  relatedMapIds?: string[];
  relatedCharacterIds?: string[];
  relatedItemIds?: string[];
}

export interface MapObject {
  id: string;
  x: number;
  y: number;
  type: string;
  label: string;
  color: string;
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  cellSize: number;
  objects: MapObject[];
  createdAt?: string;
  updatedAt?: string;
  scenarioId?: string | null;
  campaignId?: string | null;
}

export type StatKey = string;

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
