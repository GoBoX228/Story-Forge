'use client';

import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { COLORS, ICONS } from './constants';
import { Button, AddTile, SectionHeader } from './components/UI';
import { BaseCard } from './components/BaseCard';
import { CampaignEditorModal } from './components/CampaignEditorModal';
import { ArrowLeft, Edit3, Loader2, Plus } from 'lucide-react';
import {
  AdminBroadcastItem,
  AdminContentItem,
  Asset,
  AssetUpdatePayload,
  AssetUploadPayload,
  Campaign,
  Character,
  EntityLink,
  EntityLinkAssignmentMap,
  EntityLinkCreatePayload,
  EntityLinkTargetType,
  EntityLinkUpdatePayload,
  Faction,
  Item,
  MapData,
  PublishedContent,
  PublicationAssignmentMap,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload,
  Scenario,
  ScenarioNodeEntityTargetType,
  Tag,
  TagAssignmentMap,
  TaggableTargetType,
  UserProfile,
  WorldEntityPayload,
  WorldEntityUpdatePayload,
  WorldEvent,
  WorldEventPayload,
  WorldEventUpdatePayload,
  WorldLocation
} from './types';
import { apiRequest, clearAccessToken, getAccessToken } from './lib/api';
import {
  entityLinkAssignmentKey,
  mapCampaignFromApi,
  mapCampaignToApiPayload,
  mapCharacterFromApi,
  mapItemFromApi,
  mapItemToApiPayload,
  mapMapFromApi,
  mapScenarioSummary,
  publicationAssignmentKey,
  tagAssignmentKey
} from './lib/mappers';
import { deleteAsset, listAssets, updateAsset, uploadAsset } from './lib/assetApi';
import {
  createFaction,
  createLocation,
  createWorldEvent,
  deleteFaction,
  deleteLocation,
  deleteWorldEvent,
  listFactions,
  listLocations,
  listWorldEvents,
  updateFaction,
  updateLocation,
  updateWorldEvent
} from './lib/worldApi';
import { deleteTag, listTags, listTargetTags, replaceTargetTags, updateTag } from './lib/tagApi';
import { createEntityLink, deleteEntityLink, listEntityLinks, updateEntityLink } from './lib/entityLinkApi';
import { entityLinkIdentityKey } from './lib/assetUsage';
import { deletePublication, publishTarget, updatePublication } from './lib/publicationApi';

const lazyWithRetry = <T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  key: string
) =>
  lazy(async () => {
    const reloadFlag = `sf_chunk_reload_${key}`;
    const canUseWindow = typeof window !== 'undefined';
    const alreadyReloaded = canUseWindow && window.sessionStorage.getItem(reloadFlag) === '1';

    try {
      const mod = await importer();
      if (canUseWindow) {
        window.sessionStorage.removeItem(reloadFlag);
      }
      return mod;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isChunkError =
        /ChunkLoadError/i.test(message) ||
        /Loading chunk/i.test(message) ||
        /Failed to fetch dynamically imported module/i.test(message);

      if (canUseWindow && isChunkError && !alreadyReloaded) {
        window.sessionStorage.setItem(reloadFlag, '1');
        window.location.reload();
        await new Promise<never>(() => {});
      }

      throw error;
    }
  });

const ScenarioEditor = lazyWithRetry(() => import('./components/ScenarioEditor'), 'scenario');
const MapEditor = lazyWithRetry(() => import('./components/MapEditor'), 'map');
const ProfileEditor = lazyWithRetry(() => import('./components/ProfileEditor'), 'profile');
const ItemsEditor = lazyWithRetry(() => import('./components/ItemsEditor'), 'items');
const CharactersEditor = lazyWithRetry(() => import('./components/CharactersEditor'), 'characters');
const AssetsEditor = lazyWithRetry(() => import('./components/AssetsEditor'), 'assets');
const WorldEditor = lazyWithRetry(() => import('./components/WorldEditor'), 'world');
const SettingsView = lazyWithRetry(
  () => import('./components/SettingsView').then((module) => ({ default: module.SettingsView })),
  'settings'
);
const GuideView = lazyWithRetry(
  () => import('./components/GuideView').then((module) => ({ default: module.GuideView })),
  'guide'
);
const AdminView = lazyWithRetry(
  () => import('./components/AdminView').then((module) => ({ default: module.AdminView })),
  'admin'
);

const LoadingSpinner = () => (
  <div className="flex h-full w-full items-center justify-center bg-[var(--bg-main)] animate-fade-in">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="animate-spin text-[var(--col-red)]" size={48} />
      <span className="mono text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest animate-pulse">
        ЗАГРУЗКА МОДУЛЯ...
      </span>
    </div>
  </div>
);

const BROADCAST_LABELS: Record<AdminBroadcastItem['type'], string> = {
  info: 'ИНФО',
  warning: 'ПРЕДУПРЕЖДЕНИЕ',
  critical: 'КРИТИЧЕСКОЕ'
};

const getBroadcastAccent = (type: AdminBroadcastItem['type']): string => {
  if (type === 'critical') return 'var(--col-red)';
  if (type === 'warning') return 'var(--col-yellow)';
  return 'var(--col-blue)';
};

interface TagTargetRef {
  type: TaggableTargetType;
  id: string;
}

interface EntityLinkTargetRef {
  type: EntityLinkTargetType;
  id: string;
}

const formatBroadcastTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('ru-RU');
};

const INITIAL_ITEMS: Item[] = [];

const mapUserProfile = (response: any): UserProfile => ({
  id: String(response.id),
  name: response.name ?? '',
  email: response.email ?? '',
  role: response.role ?? 'user',
  status: response.status ?? 'active',
  twoFactorEnabled: Boolean(response.two_factor_enabled ?? false),
  twoFactorEnabledAt: response.two_factor_enabled_at ?? null,
  avatarUrl: response.avatar_url ?? null,
  bannerUrl: response.banner_url ?? null,
  bio: response.bio ?? null,
});

interface TwoFactorChallengePayload {
  challengeToken: string;
  expiresIn: number;
  retryAfter: number;
  devCode?: string | null;
}

function useStickyState<T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [interfaceScale, setInterfaceScale] = useState(1);
  const [currentTheme, setCurrentTheme] = useState<'oled' | 'low-contrast' | 'light'>('oled');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(() => Boolean(getAccessToken()));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [maps, setMaps] = useState<MapData[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [items, setItems] = useStickyState<Item[]>(INITIAL_ITEMS, 'sf_items');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagAssignments, setTagAssignments] = useState<TagAssignmentMap>({});
  const [entityLinks, setEntityLinks] = useState<EntityLinkAssignmentMap>({});
  const [, setPublications] = useState<PublishedContent[]>([]);
  const [publicationAssignments, setPublicationAssignments] = useState<PublicationAssignmentMap>({});
  const [broadcasts, setBroadcasts] = useState<AdminBroadcastItem[]>([]);
  const [dismissedBroadcastIds, setDismissedBroadcastIds] = useStickyState<number[]>(
    [],
    'sf_dismissed_broadcast_ids'
  );
  const [scenarioEditorTargetId, setScenarioEditorTargetId] = useState<string | null>(null);
  const [mapEditorTargetId, setMapEditorTargetId] = useState<string | null>(null);
  const [characterEditorTargetId, setCharacterEditorTargetId] = useState<string | null>(null);
  const [itemEditorTargetId, setItemEditorTargetId] = useState<string | null>(null);
  const [assetEditorTargetId, setAssetEditorTargetId] = useState<string | null>(null);
  const [worldEditorTarget, setWorldEditorTarget] = useState<{
    type: 'location' | 'faction' | 'event';
    id: string;
  } | null>(null);
  const [graphReturnScenarioId, setGraphReturnScenarioId] = useState<string | null>(null);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  const fetchCurrentUser = useCallback(async (): Promise<UserProfile> => {
    const response = await apiRequest<any>('/me');
    return mapUserProfile(response);
  }, []);

  const loadBroadcasts = useCallback(async () => {
    try {
      const data = await apiRequest<AdminBroadcastItem[]>('/broadcasts');
      const dismissed = new Set(dismissedBroadcastIds);
      setBroadcasts(data.filter((item) => !dismissed.has(item.id)));
    } catch {
      setBroadcasts([]);
    }
  }, [dismissedBroadcastIds]);

  const loadTagAssignments = useCallback(async (targets: TagTargetRef[]) => {
    const pairs = await Promise.all(
      targets.map(async (target) => {
        try {
          const targetTags = await listTargetTags(target.type, target.id);
          return [tagAssignmentKey(target.type, target.id), targetTags] as const;
        } catch {
          return [tagAssignmentKey(target.type, target.id), []] as const;
        }
      })
    );

    setTagAssignments(Object.fromEntries(pairs));
  }, []);

  const loadEntityLinkAssignments = useCallback(async (targets: EntityLinkTargetRef[]) => {
    const pairs = await Promise.all(
      targets.map(async (target) => {
        try {
          const targetLinks = await listEntityLinks(target.type, target.id);
          return [entityLinkAssignmentKey(target.type, target.id), targetLinks] as const;
        } catch {
          return [entityLinkAssignmentKey(target.type, target.id), []] as const;
        }
      })
    );

    setEntityLinks(Object.fromEntries(pairs));
  }, []);

  const loadAllData = useCallback(async () => {
    const [
      campaignsResponse,
      scenariosResponse,
      mapsResponse,
      charactersResponse,
      itemsResponse,
      assetsResponse,
      locationsResponse,
      factionsResponse,
      worldEventsResponse,
      tagsResponse
    ] = await Promise.all([
      apiRequest<any[]>('/campaigns'),
      apiRequest<any[]>('/scenarios'),
      apiRequest<any[]>('/maps'),
      apiRequest<any[]>('/characters'),
      apiRequest<any[]>('/items'),
      listAssets(),
      listLocations(),
      listFactions(),
      listWorldEvents(),
      listTags()
    ]);

    setCampaigns(campaignsResponse.map(mapCampaignFromApi));
    setScenarios(scenariosResponse.map(mapScenarioSummary));
    setMaps(mapsResponse.map(mapMapFromApi));
    setCharacters(charactersResponse.map(mapCharacterFromApi));
    setItems(itemsResponse.map(mapItemFromApi));
    setAssets(assetsResponse);
    setLocations(locationsResponse);
    setFactions(factionsResponse);
    setWorldEvents(worldEventsResponse);
    setTags(tagsResponse);
    const materialTargets = [
      ...scenariosResponse.map((scenario) => ({ type: 'scenario' as const, id: String(scenario.id) })),
      ...mapsResponse.map((map) => ({ type: 'map' as const, id: String(map.id) })),
      ...charactersResponse.map((character) => ({ type: 'character' as const, id: String(character.id) })),
      ...itemsResponse.map((item) => ({ type: 'item' as const, id: String(item.id) })),
      ...assetsResponse.map((asset) => ({ type: 'asset' as const, id: asset.id })),
      ...locationsResponse.map((location) => ({ type: 'location' as const, id: location.id })),
      ...factionsResponse.map((faction) => ({ type: 'faction' as const, id: faction.id })),
      ...worldEventsResponse.map((event) => ({ type: 'event' as const, id: event.id }))
    ];
    await loadTagAssignments(materialTargets);
    await loadEntityLinkAssignments(materialTargets);
    await loadBroadcasts();
  }, [loadBroadcasts, loadEntityLinkAssignments, loadTagAssignments, setItems]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      if (!getAccessToken()) {
        if (mounted) {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsBootstrapping(false);
        }
        return;
      }

      try {
        const me = await fetchCurrentUser();
        if (!mounted) return;
        setCurrentUser(me);
        setIsAuthenticated(true);
        await loadAllData();
      } catch {
        if (!mounted) return;
        clearAccessToken();
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        if (mounted) setIsBootstrapping(false);
      }
    };

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [fetchCurrentUser, loadAllData]);

  useEffect(() => {
    if (activeView === 'admin' && currentUser?.role !== 'admin') {
      setActiveView('dashboard');
    }
  }, [activeView, currentUser?.role]);

  useEffect(() => {
    if (activeView !== 'scenarios') {
      setScenarioEditorTargetId(null);
    }
    if (activeView !== 'maps') {
      setMapEditorTargetId(null);
    }
    if (activeView !== 'characters') {
      setCharacterEditorTargetId(null);
    }
    if (activeView !== 'items') {
      setItemEditorTargetId(null);
    }
    if (activeView !== 'assets') {
      setAssetEditorTargetId(null);
    }
    if (activeView !== 'world') {
      setWorldEditorTarget(null);
    }
    if (!['maps', 'characters', 'items', 'assets', 'world'].includes(activeView)) {
      setGraphReturnScenarioId(null);
    }
  }, [activeView]);

  useEffect(() => {
    if (!showNotifications || !isAuthenticated) return;
    void loadBroadcasts();
  }, [showNotifications, isAuthenticated, loadBroadcasts]);

  const handleLogin = async () => {
    try {
      const me = await fetchCurrentUser();
      setCurrentUser(me);
      setIsAuthenticated(true);
      await loadAllData();
    } catch {
      clearAccessToken();
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Завершить сеанс связи?')) return;

    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }

    clearAccessToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveView('dashboard');
    setCampaigns([]);
    setScenarios([]);
    setMaps([]);
    setCharacters([]);
    setItems([]);
    setBroadcasts([]);
  };

  const handleClearNotifications = useCallback(() => {
    if (broadcasts.length === 0) return;
    setDismissedBroadcastIds((prev) => {
      const next = new Set(prev);
      broadcasts.forEach((item) => next.add(item.id));
      return Array.from(next);
    });
    setBroadcasts([]);
  }, [broadcasts, setDismissedBroadcastIds]);

  const handleUpdateProfile = useCallback(
    async (payload: {
      name: string;
      email: string;
      bio?: string | null;
      avatarFile?: File | null;
      bannerFile?: File | null;
      removeAvatar?: boolean;
      removeBanner?: boolean;
    }) => {
      const formData = new FormData();
      formData.append('name', payload.name);
      formData.append('email', payload.email);
      formData.append('bio', payload.bio ?? '');

      if (payload.avatarFile) {
        formData.append('avatar_file', payload.avatarFile);
      }
      if (payload.bannerFile) {
        formData.append('banner_file', payload.bannerFile);
      }
      if (payload.removeAvatar) {
        formData.append('remove_avatar', '1');
      }
      if (payload.removeBanner) {
        formData.append('remove_banner', '1');
      }

      const response = await apiRequest<any>('/me', {
        method: 'PATCH',
        body: formData,
      });

      const mapped = mapUserProfile(response);
      setCurrentUser(mapped);
      return mapped;
    },
    []
  );

  const requestEnableTwoFactor = useCallback(async (): Promise<TwoFactorChallengePayload> => {
    const response = await apiRequest<any>('/auth/2fa/enable', { method: 'POST' });
    return {
      challengeToken: response.challenge_token,
      expiresIn: Number(response.expires_in ?? 0),
      retryAfter: Number(response.retry_after ?? 30),
      devCode: response.dev_code ?? null,
    };
  }, []);

  const confirmEnableTwoFactor = useCallback(async (challengeToken: string, code: string): Promise<string[]> => {
    const response = await apiRequest<any>('/auth/2fa/enable/confirm', {
      method: 'POST',
      body: JSON.stringify({
        challenge_token: challengeToken,
        code,
      }),
    });

    if (response?.user) {
      setCurrentUser(mapUserProfile(response.user));
      return Array.isArray(response.recovery_codes) ? response.recovery_codes : [];
    }

    const me = await fetchCurrentUser();
    setCurrentUser(me);
    return [];
  }, [fetchCurrentUser]);

  const requestDisableTwoFactor = useCallback(async (): Promise<TwoFactorChallengePayload> => {
    const response = await apiRequest<any>('/auth/2fa/disable', { method: 'POST' });
    return {
      challengeToken: response.challenge_token,
      expiresIn: Number(response.expires_in ?? 0),
      retryAfter: Number(response.retry_after ?? 30),
      devCode: response.dev_code ?? null,
    };
  }, []);

  const confirmDisableTwoFactor = useCallback(async (challengeToken: string, code: string) => {
    const response = await apiRequest<any>('/auth/2fa/disable/confirm', {
      method: 'POST',
      body: JSON.stringify({
        challenge_token: challengeToken,
        code,
      }),
    });

    if (response?.user) {
      setCurrentUser(mapUserProfile(response.user));
      return;
    }

    const me = await fetchCurrentUser();
    setCurrentUser(me);
  }, [fetchCurrentUser]);

  const resendTwoFactorChallenge = useCallback(async (challengeToken: string): Promise<TwoFactorChallengePayload> => {
    const response = await apiRequest<any>('/auth/2fa/resend', {
      method: 'POST',
      body: JSON.stringify({ challenge_token: challengeToken }),
    });

    return {
      challengeToken: response.challenge_token ?? challengeToken,
      expiresIn: Number(response.expires_in ?? 0),
      retryAfter: Number(response.retry_after ?? 30),
      devCode: response.dev_code ?? null,
    };
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<void> => {
      await apiRequest('/auth/password/change', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });
    },
    []
  );

  const handleCreateItem = useCallback(
    async (payload: Omit<Item, 'id'>) => {
      const response = await apiRequest<any>('/items', {
        method: 'POST',
        body: JSON.stringify(mapItemToApiPayload(payload)),
      });
      const mapped = mapItemFromApi(response);
      setItems((prev) => [mapped, ...prev]);
      return mapped;
    },
    [setItems]
  );

  const handleUpdateItem = useCallback(
    async (id: string, payload: Omit<Item, 'id'>) => {
      const response = await apiRequest<any>(`/items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(mapItemToApiPayload(payload)),
      });
      const mapped = mapItemFromApi(response);
      setItems((prev) => prev.map((item) => (item.id === id ? mapped : item)));
      return mapped;
    },
    [setItems]
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      await apiRequest(`/items/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [setItems]
  );

  const handleUploadAsset = useCallback(async (payload: AssetUploadPayload) => {
    const uploaded = await uploadAsset(payload);
    setAssets((prev) => [uploaded, ...prev]);
    return uploaded;
  }, []);

  const handleUpdateAsset = useCallback(async (id: string, payload: AssetUpdatePayload) => {
    const updated = await updateAsset(id, payload);
    setAssets((prev) => prev.map((asset) => (asset.id === id ? updated : asset)));
    return updated;
  }, []);

  const handleDeleteAsset = useCallback(async (id: string) => {
    await deleteAsset(id);
    setAssets((prev) => prev.filter((asset) => asset.id !== id));
  }, []);

  const handleCreateLocation = useCallback(async (payload: WorldEntityPayload) => {
    const created = await createLocation(payload);
    setLocations((prev) => [created, ...prev]);
    return created;
  }, []);

  const handleUpdateLocation = useCallback(async (id: string, payload: WorldEntityUpdatePayload) => {
    const updated = await updateLocation(id, payload);
    setLocations((prev) => prev.map((location) => (location.id === id ? updated : location)));
    return updated;
  }, []);

  const handleDeleteLocation = useCallback(async (id: string) => {
    await deleteLocation(id);
    setLocations((prev) => prev.filter((location) => location.id !== id));
  }, []);

  const handleCreateFaction = useCallback(async (payload: WorldEntityPayload) => {
    const created = await createFaction(payload);
    setFactions((prev) => [created, ...prev]);
    return created;
  }, []);

  const handleUpdateFaction = useCallback(async (id: string, payload: WorldEntityUpdatePayload) => {
    const updated = await updateFaction(id, payload);
    setFactions((prev) => prev.map((faction) => (faction.id === id ? updated : faction)));
    return updated;
  }, []);

  const handleDeleteFaction = useCallback(async (id: string) => {
    await deleteFaction(id);
    setFactions((prev) => prev.filter((faction) => faction.id !== id));
  }, []);

  const handleCreateWorldEvent = useCallback(async (payload: WorldEventPayload) => {
    const created = await createWorldEvent(payload);
    setWorldEvents((prev) => [created, ...prev]);
    return created;
  }, []);

  const handleUpdateWorldEvent = useCallback(async (id: string, payload: WorldEventUpdatePayload) => {
    const updated = await updateWorldEvent(id, payload);
    setWorldEvents((prev) => prev.map((event) => (event.id === id ? updated : event)));
    return updated;
  }, []);

  const handleDeleteWorldEvent = useCallback(async (id: string) => {
    await deleteWorldEvent(id);
    setWorldEvents((prev) => prev.filter((event) => event.id !== id));
  }, []);

  const handleReplaceTargetTags = useCallback(async (
    type: TaggableTargetType,
    id: string,
    tagIds: string[],
    newTags: string[] = []
  ) => {
    const nextTags = await replaceTargetTags(type, id, { tagIds, newTags });
    const key = tagAssignmentKey(type, id);
    setTagAssignments((prev) => ({ ...prev, [key]: nextTags }));
    setTags((prev) => {
      const byId = new Map(prev.map((tag) => [tag.id, tag]));
      nextTags.forEach((tag) => byId.set(tag.id, tag));
      return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name));
    });
    return nextTags;
  }, []);

  const handleUpdateTag = useCallback(async (id: string, name: string) => {
    const updated = await updateTag(id, { name });
    setTags((prev) => prev.map((tag) => (tag.id === id ? updated : tag)).sort((left, right) => left.name.localeCompare(right.name)));
    setTagAssignments((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([key, assignedTags]) => [
          key,
          assignedTags.map((tag) => (tag.id === id ? updated : tag)),
        ])
      )
    );
    return updated;
  }, []);

  const handleDeleteTag = useCallback(async (id: string) => {
    await deleteTag(id);
    setTags((prev) => prev.filter((tag) => tag.id !== id));
    setTagAssignments((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([key, assignedTags]) => [
          key,
          assignedTags.filter((tag) => tag.id !== id),
        ])
      )
    );
  }, []);

  const handleCreateMaterialLink = useCallback(async (
    sourceType: EntityLinkTargetType,
    sourceId: string,
    payload: EntityLinkCreatePayload
  ) => {
    const nextLink = await createEntityLink(sourceType, sourceId, payload);
    const key = entityLinkAssignmentKey(sourceType, sourceId);
    setEntityLinks((prev) => {
      const current = prev[key] ?? [];
      const withoutSame = current.filter((link) =>
        link.id !== nextLink.id && entityLinkIdentityKey(link) !== entityLinkIdentityKey(nextLink)
      );
      return { ...prev, [key]: [...withoutSame, nextLink] };
    });
    return nextLink;
  }, []);

  const handleUpdateMaterialLink = useCallback(async (id: string, payload: EntityLinkUpdatePayload) => {
    const updated = await updateEntityLink(id, payload);
    setEntityLinks((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([key, links]) => [
          key,
          links.map((link) => (link.id === id ? updated : link)),
        ])
      )
    );
    return updated;
  }, []);

  const handleDeleteMaterialLink = useCallback(async (id: string) => {
    await deleteEntityLink(id);
    setEntityLinks((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([key, links]) => [
          key,
          links.filter((link) => link.id !== id),
        ])
      )
    );
  }, []);

  const upsertPublicationState = useCallback((publication: PublishedContent) => {
    setPublications((prev) => {
      const withoutCurrent = prev.filter((item) => item.id !== publication.id);
      return [publication, ...withoutCurrent];
    });
    setPublicationAssignments((prev) => ({
      ...prev,
      [publicationAssignmentKey(publication.contentType, publication.contentId)]: publication,
    }));
  }, []);

  const handleUpsertPublication = useCallback(async (
    type: PublicationTargetType,
    id: string,
    payload: PublicationUpsertPayload
  ) => {
    const publication = await publishTarget(type, id, payload);
    upsertPublicationState(publication);
    return publication;
  }, [upsertPublicationState]);

  const handleUpdatePublication = useCallback(async (id: string, payload: PublicationUpdatePayload) => {
    const publication = await updatePublication(id, payload);
    upsertPublicationState(publication);
    return publication;
  }, [upsertPublicationState]);

  const handleDeletePublication = useCallback(async (id: string) => {
    await deletePublication(id);
    setPublications((prev) => prev.filter((publication) => publication.id !== id));
    setPublicationAssignments((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([, publication]) => publication?.id !== id)
      )
    );
  }, []);

  const handleOpenEditor = (campaign?: Campaign) => {
    setEditingCampaign(
      campaign || {
        title: '',
        description: '',
        tags: [],
        resources: [],
        scenarioIds: [],
        mapIds: [],
        characterIds: []
      }
    );
    setIsEditorOpen(true);
  };

  const syncCampaignLinks = useCallback(
    (campaignId: string, nextScenarioIds: string[], nextMapIds: string[], nextCharacterIds: string[]) => {
      setScenarios((prev) =>
        prev.map((scenario) => {
          const shouldAttach = nextScenarioIds.includes(scenario.id);
          if (shouldAttach) return { ...scenario, campaignId };
          if (scenario.campaignId === campaignId && !shouldAttach) return { ...scenario, campaignId: undefined };
          return scenario;
        })
      );

      setMaps((prev) =>
        prev.map((map) => {
          const shouldAttach = nextMapIds.includes(map.id);
          if (shouldAttach) return { ...map, campaignId };
          if (map.campaignId === campaignId && !shouldAttach) return { ...map, campaignId: null };
          return map;
        })
      );

      setCharacters((prev) =>
        prev.map((character) => {
          const shouldAttach = nextCharacterIds.includes(character.id);
          if (shouldAttach) return { ...character, campaignId };
          if (character.campaignId === campaignId && !shouldAttach) return { ...character, campaignId: null };
          return character;
        })
      );
    },
    []
  );

  const handleSaveCampaign = async (updated: Campaign) => {
    try {
      const payload = mapCampaignToApiPayload(updated);
      const response = updated.id
        ? await apiRequest(`/campaigns/${updated.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          })
        : await apiRequest('/campaigns', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

      const mapped = mapCampaignFromApi(response);

      setCampaigns((prev) => {
        if (updated.id) {
          return prev.map((campaign) => (campaign.id === mapped.id ? mapped : campaign));
        }
        return [...prev, mapped];
      });

      syncCampaignLinks(mapped.id, mapped.scenarioIds ?? [], mapped.mapIds ?? [], mapped.characterIds ?? []);
      setIsEditorOpen(false);
    } catch {
      // ignore
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот мир?')) return;

    try {
      await apiRequest(`/campaigns/${id}`, { method: 'DELETE' });
      setCampaigns((prev) => prev.filter((campaign) => campaign.id !== id));
      syncCampaignLinks(id, [], [], []);
    } catch {
      // ignore
    }
  };

  const handleAdminContentDeleted = useCallback(
    ({ type, id }: { type: AdminContentItem['type']; id: number }) => {
      const contentId = String(id);

      if (type === 'scenario') {
        setScenarios((prev) => prev.filter((scenario) => scenario.id !== contentId));
        setCampaigns((prev) =>
          prev.map((campaign) => ({
            ...campaign,
            scenarioIds: campaign.scenarioIds.filter((scenarioId) => scenarioId !== contentId),
          }))
        );
        setMaps((prev) =>
          prev.map((map) => (map.scenarioId === contentId ? { ...map, scenarioId: null } : map))
        );
        setCharacters((prev) =>
          prev.map((character) => (character.scenarioId === contentId ? { ...character, scenarioId: null } : character))
        );
      }

      if (type === 'map') {
        setMaps((prev) => prev.filter((map) => map.id !== contentId));
        setCampaigns((prev) =>
          prev.map((campaign) => ({
            ...campaign,
            mapIds: campaign.mapIds.filter((mapId) => mapId !== contentId),
          }))
        );
        setScenarios((prev) =>
          prev.map((scenario) => ({
            ...scenario,
            relatedMapIds: (scenario.relatedMapIds ?? []).filter((mapId) => mapId !== contentId),
          }))
        );
      }

      if (type === 'character') {
        setCharacters((prev) => prev.filter((character) => character.id !== contentId));
        setCampaigns((prev) =>
          prev.map((campaign) => ({
            ...campaign,
            characterIds: campaign.characterIds.filter((characterId) => characterId !== contentId),
          }))
        );
        setScenarios((prev) =>
          prev.map((scenario) => ({
            ...scenario,
            relatedCharacterIds: (scenario.relatedCharacterIds ?? []).filter((characterId) => characterId !== contentId),
          }))
        );
      }

      if (type === 'item') {
        setItems((prev) => prev.filter((item) => item.id !== contentId));
        setCharacters((prev) =>
          prev.map((character) => ({
            ...character,
            inventory: character.inventory.filter((itemId) => itemId !== contentId),
          }))
        );
        setScenarios((prev) =>
          prev.map((scenario) => ({
            ...scenario,
            relatedItemIds: (scenario.relatedItemIds ?? []).filter((itemId) => itemId !== contentId),
          }))
        );
      }

      if (type === 'campaign') {
        setCampaigns((prev) => prev.filter((campaign) => campaign.id !== contentId));
        setScenarios((prev) =>
          prev.map((scenario) => (scenario.campaignId === contentId ? { ...scenario, campaignId: undefined } : scenario))
        );
        setMaps((prev) =>
          prev.map((map) => (map.campaignId === contentId ? { ...map, campaignId: null } : map))
        );
        setCharacters((prev) =>
          prev.map((character) => (character.campaignId === contentId ? { ...character, campaignId: null } : character))
        );
      }
    },
    [setItems]
  );

  const toTimestamp = (value?: string | null): number => {
    if (!value) return 0;
    const ts = new Date(value).getTime();
    return Number.isNaN(ts) ? 0 : ts;
  };

  const handleOpenScenarioEditorFromDashboard = async (scenarioId?: string) => {
    let targetId = scenarioId;

    if (!targetId && scenarios.length > 0) {
      targetId = [...scenarios]
        .sort(
          (a, b) =>
            Math.max(toTimestamp(b.updatedAt), toTimestamp(b.createdAt)) -
            Math.max(toTimestamp(a.updatedAt), toTimestamp(a.createdAt))
        )[0]
        ?.id;
    }

    if (!targetId) {
      try {
        const created = await apiRequest('/scenarios', {
          method: 'POST',
          body: JSON.stringify({ title: 'НОВЫЙ СЦЕНАРИЙ', description: '' }),
        });
        const scenario = mapScenarioSummary(created);
        setScenarios((prev) => [scenario, ...prev.filter((item) => item.id !== scenario.id)]);
        targetId = scenario.id;
      } catch {
        setActiveView('scenarios');
        return;
      }
    }

    setScenarioEditorTargetId(targetId);
    setActiveView('scenarios');
  };

  const handleOpenMapEditorFromDashboard = async (mapId?: string) => {
    let targetId = mapId;

    if (!targetId && maps.length > 0) {
      targetId = [...maps]
        .sort(
          (a, b) =>
            Math.max(toTimestamp(b.updatedAt), toTimestamp(b.createdAt)) -
            Math.max(toTimestamp(a.updatedAt), toTimestamp(a.createdAt))
        )[0]?.id;
    }

    if (!targetId) {
      try {
        const created = await apiRequest('/maps', {
          method: 'POST',
          body: JSON.stringify({
            name: 'НОВАЯ КАРТА',
            width: 20,
            height: 20,
            cell_size: 32,
            data: { objects: [] },
          }),
        });
        const map = mapMapFromApi(created);
        setMaps((prev) => [map, ...prev.filter((item) => item.id !== map.id)]);
        targetId = map.id;
      } catch {
        setActiveView('maps');
        return;
      }
    }

    setMapEditorTargetId(targetId);
    setActiveView('maps');
  };

  const handleOpenCampaignEditorFromDashboard = (campaignId?: string) => {
    const targetCampaign = campaignId
      ? campaigns.find((campaign) => campaign.id === campaignId) ?? null
      : [...campaigns].sort(
          (a, b) =>
            Math.max(toTimestamp(b.updatedAt), toTimestamp(b.createdAt), toTimestamp(b.lastPlayed)) -
            Math.max(toTimestamp(a.updatedAt), toTimestamp(a.createdAt), toTimestamp(a.lastPlayed))
        )[0] ?? null;

    setActiveView('campaigns');
    if (targetCampaign) {
      handleOpenEditor(targetCampaign);
      return;
    }
    handleOpenEditor();
  };

  const handleReturnToGraphScenario = useCallback(() => {
    if (!graphReturnScenarioId) return;
    setScenarioEditorTargetId(graphReturnScenarioId);
    setActiveView('scenarios');
    setGraphReturnScenarioId(null);
  }, [graphReturnScenarioId]);

  const handleOpenGraphEntityLink = useCallback((
    targetType: ScenarioNodeEntityTargetType,
    targetId: string,
    sourceScenarioId: string
  ) => {
    setGraphReturnScenarioId(sourceScenarioId);

    if (targetType === 'map') {
      setMapEditorTargetId(targetId);
      setActiveView('maps');
      return;
    }

    if (targetType === 'character') {
      setCharacterEditorTargetId(targetId);
      setActiveView('characters');
      return;
    }

    if (targetType === 'item') {
      setItemEditorTargetId(targetId);
      setActiveView('items');
      return;
    }

    if (targetType === 'asset') {
      setAssetEditorTargetId(targetId);
      setActiveView('assets');
      return;
    }

    if (targetType === 'location' || targetType === 'faction' || targetType === 'event') {
      setWorldEditorTarget({ type: targetType, id: targetId });
      setActiveView('world');
    }
  }, []);

  const handleOpenMaterialLink = useCallback((targetType: EntityLinkTargetType, targetId: string) => {
    if (targetType === 'scenario') {
      setScenarioEditorTargetId(targetId);
      setActiveView('scenarios');
      return;
    }

    if (targetType === 'map') {
      setMapEditorTargetId(targetId);
      setActiveView('maps');
      return;
    }

    if (targetType === 'character') {
      setCharacterEditorTargetId(targetId);
      setActiveView('characters');
      return;
    }

    if (targetType === 'item') {
      setItemEditorTargetId(targetId);
      setActiveView('items');
      return;
    }

    if (targetType === 'asset') {
      setAssetEditorTargetId(targetId);
      setActiveView('assets');
      return;
    }

    if (targetType === 'location' || targetType === 'faction' || targetType === 'event') {
      setWorldEditorTarget({ type: targetType, id: targetId });
      setActiveView('world');
    }
  }, []);

  const graphReturnScenarioTitle = graphReturnScenarioId
    ? scenarios.find((scenario) => scenario.id === graphReturnScenarioId)?.title
    : null;

  const graphReturnBanner = graphReturnScenarioId ? (
    <div className="shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-6 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="mono text-[8px] uppercase font-black text-[var(--text-muted)] tracking-widest">
          ОТКРЫТО ИЗ УЗЛА ГРАФА
        </div>
        <div className="mono text-[10px] uppercase font-black text-[var(--text-main)] truncate">
          {graphReturnScenarioTitle ?? 'СЦЕНАРИЙ'}
        </div>
      </div>
      <Button variant="accent-red" size="sm" inverted onClick={handleReturnToGraphScenario}>
        <ArrowLeft size={13} /> ВЕРНУТЬСЯ К СЦЕНАРИЮ
      </Button>
    </div>
  ) : null;

  const renderView = (
      <div key={activeView} className="h-full w-full animate-fade-in">
        {(() => {
          switch (activeView) {
            case 'dashboard':
              return (
                <Dashboard
                  onOpenEditor={setActiveView}
                  onOpenScenarioEditor={handleOpenScenarioEditorFromDashboard}
                  onOpenMapEditor={handleOpenMapEditorFromDashboard}
                  onOpenCampaignEditor={handleOpenCampaignEditorFromDashboard}
                  scenarios={scenarios}
                  maps={maps}
                  characters={characters}
                  campaigns={campaigns}
                />
              );
            case 'campaigns':
              return (
                <div className="p-12 h-full overflow-auto bauhaus-bg">
                  <div className="max-w-7xl mx-auto space-y-12">
                    <SectionHeader
                      title="МЕНЕДЖЕР КАМПАНИЙ"
                      subtitle="УПРАВЛЕНИЕ МИРАМИ"
                      accentColor={COLORS.accentPurple}
                      actions={
                        <Button color="purple" size="lg" onClick={() => handleOpenEditor()}>
                          <Plus size={18} /> НОВАЯ КАМПАНИЯ
                        </Button>
                      }
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                      {campaigns.map((campaign) => (
                        <BaseCard key={campaign.id} title={campaign.title} accentColor={COLORS.accentPurple}>
                          <div className="space-y-6 flex flex-col h-full">
                            <p className="text-[10px] mono uppercase" style={{ color: 'var(--text-muted)' }}>
                              Последняя сессия: {campaign.lastPlayed}
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                              <button
                                onClick={() => setActiveView('scenarios')}
                                className="flex items-center justify-between p-3 border border-[var(--border-color)] hover:border-[var(--col-red)]"
                              >
                                <div className="flex items-center gap-3">
                                  {ICONS.Scenario}
                                  <span className="mono text-[10px] uppercase font-bold">
                                    Сценарии ({campaign.scenarioIds?.length || 0})
                                  </span>
                                </div>
                              </button>
                              <button
                                onClick={() => setActiveView('maps')}
                                className="flex items-center justify-between p-3 border border-[var(--border-color)] hover:border-[var(--col-white)]"
                              >
                                <div className="flex items-center gap-3">
                                  {ICONS.Map}
                                  <span className="mono text-[10px] uppercase font-bold">
                                    Карты ({campaign.mapIds?.length || 0})
                                  </span>
                                </div>
                              </button>
                            </div>
                            <div className="flex-1" />
                            <div className="flex flex-col gap-2">
                              <Button
                                inverted
                                color="purple"
                                className="w-full h-12"
                                onClick={() => handleOpenEditor(campaign)}
                              >
                                <Edit3 size={14} /> РЕДАКТИРОВАТЬ
                              </Button>
                              <button
                                onClick={() => handleDeleteCampaign(campaign.id)}
                                className="py-2 mono text-[8px] uppercase font-black text-[var(--text-muted)] hover:text-[var(--col-red)] self-center"
                              >
                                УДАЛИТЬ КАМПАНИЮ
                              </button>
                            </div>
                          </div>
                        </BaseCard>
                      ))}
                      <AddTile
                        label="СОЗДАТЬ КАМПАНИЮ"
                        accentColor={COLORS.accentPurple}
                        onClick={() => handleOpenEditor()}
                        minHeight="h-[420px]"
                      />
                    </div>
                  </div>
                </div>
              );
            case 'scenarios':
              return (
                <ScenarioEditor
                  data={scenarios}
                  onUpdate={setScenarios}
                  campaigns={campaigns}
                  characters={characters}
                  items={items}
                  maps={maps}
                  assets={assets}
                  locations={locations}
                  factions={factions}
                  events={worldEvents}
                  onUpdateCharacters={setCharacters}
                  onUpdateMaps={setMaps}
                  tags={tags}
                  tagAssignments={tagAssignments}
                  entityLinks={entityLinks}
                  publicationAssignments={publicationAssignments}
                  onReplaceTargetTags={handleReplaceTargetTags}
                  onUpdateTag={handleUpdateTag}
                  onDeleteTag={handleDeleteTag}
                  onCreateMaterialLink={handleCreateMaterialLink}
                  onUpdateMaterialLink={handleUpdateMaterialLink}
                  onDeleteMaterialLink={handleDeleteMaterialLink}
                  onUpsertPublication={handleUpsertPublication}
                  onUpdatePublication={handleUpdatePublication}
                  onDeletePublication={handleDeletePublication}
                  onOpenMaterialLink={handleOpenMaterialLink}
                  initialScenarioId={scenarioEditorTargetId}
                  onOpenEntityLink={handleOpenGraphEntityLink}
                />
              );
            case 'maps':
              return (
                <div className="h-full w-full flex flex-col">
                  {graphReturnBanner}
                  <div className="flex-1 min-h-0">
                    <MapEditor
                      data={maps}
                      onUpdate={setMaps}
                      scenarios={scenarios}
                      characters={characters}
                      items={items}
                      assetsLibrary={assets}
                      locations={locations}
                      factions={factions}
                      events={worldEvents}
                      tags={tags}
                      tagAssignments={tagAssignments}
                      entityLinks={entityLinks}
                      publicationAssignments={publicationAssignments}
                      onReplaceTargetTags={handleReplaceTargetTags}
                      onUpdateTag={handleUpdateTag}
                      onDeleteTag={handleDeleteTag}
                      onCreateMaterialLink={handleCreateMaterialLink}
                      onUpdateMaterialLink={handleUpdateMaterialLink}
                      onDeleteMaterialLink={handleDeleteMaterialLink}
                      onUpsertPublication={handleUpsertPublication}
                      onUpdatePublication={handleUpdatePublication}
                      onDeletePublication={handleDeletePublication}
                      onOpenMaterialLink={handleOpenMaterialLink}
                      initialMapId={mapEditorTargetId}
                    />
                  </div>
                </div>
              );
            case 'items':
              return (
                <div className="h-full w-full flex flex-col">
                  {graphReturnBanner}
                  <div className="flex-1 min-h-0">
                    <ItemsEditor
                      data={items}
                      onUpdate={setItems}
                      onCreateItem={handleCreateItem}
                      onUpdateItem={handleUpdateItem}
                      onDeleteItem={handleDeleteItem}
                      scenarios={scenarios}
                      maps={maps}
                      characters={characters}
                      assets={assets}
                      locations={locations}
                      factions={factions}
                      events={worldEvents}
                      tags={tags}
                      tagAssignments={tagAssignments}
                      entityLinks={entityLinks}
                      publicationAssignments={publicationAssignments}
                      onReplaceTargetTags={handleReplaceTargetTags}
                      onUpdateTag={handleUpdateTag}
                      onDeleteTag={handleDeleteTag}
                      onCreateMaterialLink={handleCreateMaterialLink}
                      onUpdateMaterialLink={handleUpdateMaterialLink}
                      onDeleteMaterialLink={handleDeleteMaterialLink}
                      onUpsertPublication={handleUpsertPublication}
                      onUpdatePublication={handleUpdatePublication}
                      onDeletePublication={handleDeletePublication}
                      onOpenMaterialLink={handleOpenMaterialLink}
                      initialItemId={itemEditorTargetId}
                    />
                  </div>
                </div>
              );
            case 'characters':
              return (
                <div className="h-full w-full flex flex-col">
                  {graphReturnBanner}
                  <div className="flex-1 min-h-0">
                    <CharactersEditor
                      data={characters}
                      onUpdate={setCharacters}
                      items={items}
                      scenarios={scenarios}
                      maps={maps}
                      assets={assets}
                      locations={locations}
                      factions={factions}
                      events={worldEvents}
                      tags={tags}
                      tagAssignments={tagAssignments}
                      entityLinks={entityLinks}
                      publicationAssignments={publicationAssignments}
                      onReplaceTargetTags={handleReplaceTargetTags}
                      onUpdateTag={handleUpdateTag}
                      onDeleteTag={handleDeleteTag}
                      onCreateMaterialLink={handleCreateMaterialLink}
                      onUpdateMaterialLink={handleUpdateMaterialLink}
                      onDeleteMaterialLink={handleDeleteMaterialLink}
                      onUpsertPublication={handleUpsertPublication}
                      onUpdatePublication={handleUpdatePublication}
                      onDeletePublication={handleDeletePublication}
                      onOpenMaterialLink={handleOpenMaterialLink}
                      initialCharacterId={characterEditorTargetId}
                    />
                  </div>
                </div>
              );
            case 'assets':
              return (
                <div className="h-full w-full flex flex-col">
                  {graphReturnBanner}
                  <div className="flex-1 min-h-0">
                    <AssetsEditor
                      data={assets}
                      campaigns={campaigns}
                      scenarios={scenarios}
                      maps={maps}
                      characters={characters}
                      items={items}
                      locations={locations}
                      factions={factions}
                      events={worldEvents}
                      onUploadAsset={handleUploadAsset}
                      onUpdateAsset={handleUpdateAsset}
                      onDeleteAsset={handleDeleteAsset}
                      tags={tags}
                      tagAssignments={tagAssignments}
                      entityLinks={entityLinks}
                      publicationAssignments={publicationAssignments}
                      onReplaceTargetTags={handleReplaceTargetTags}
                      onUpdateTag={handleUpdateTag}
                      onDeleteTag={handleDeleteTag}
                      onCreateMaterialLink={handleCreateMaterialLink}
                      onUpdateMaterialLink={handleUpdateMaterialLink}
                      onDeleteMaterialLink={handleDeleteMaterialLink}
                      onUpsertPublication={handleUpsertPublication}
                      onUpdatePublication={handleUpdatePublication}
                      onDeletePublication={handleDeletePublication}
                      onOpenMaterialLink={handleOpenMaterialLink}
                      initialAssetId={assetEditorTargetId}
                    />
                  </div>
                </div>
              );
            case 'world':
              return (
                <div className="h-full w-full flex flex-col">
                  {graphReturnBanner}
                  <div className="flex-1 min-h-0">
                    <WorldEditor
                      locations={locations}
                      factions={factions}
                      events={worldEvents}
                      campaigns={campaigns}
                      scenarios={scenarios}
                      maps={maps}
                      characters={characters}
                      items={items}
                      assets={assets}
                      onCreateLocation={handleCreateLocation}
                      onUpdateLocation={handleUpdateLocation}
                      onDeleteLocation={handleDeleteLocation}
                      onCreateFaction={handleCreateFaction}
                      onUpdateFaction={handleUpdateFaction}
                      onDeleteFaction={handleDeleteFaction}
                      onCreateEvent={handleCreateWorldEvent}
                      onUpdateEvent={handleUpdateWorldEvent}
                      onDeleteEvent={handleDeleteWorldEvent}
                      tags={tags}
                      tagAssignments={tagAssignments}
                      entityLinks={entityLinks}
                      publicationAssignments={publicationAssignments}
                      onReplaceTargetTags={handleReplaceTargetTags}
                      onUpdateTag={handleUpdateTag}
                      onDeleteTag={handleDeleteTag}
                      onCreateMaterialLink={handleCreateMaterialLink}
                      onUpdateMaterialLink={handleUpdateMaterialLink}
                      onDeleteMaterialLink={handleDeleteMaterialLink}
                      onUpsertPublication={handleUpsertPublication}
                      onUpdatePublication={handleUpdatePublication}
                      onDeletePublication={handleDeletePublication}
                      onOpenMaterialLink={handleOpenMaterialLink}
                      initialTarget={worldEditorTarget}
                    />
                  </div>
                </div>
              );
            case 'profile':
              return (
                <ProfileEditor
                  user={currentUser}
                  scenariosCount={scenarios.length}
                  mapsCount={maps.length}
                  onSaveProfile={handleUpdateProfile}
                />
              );
            case 'settings':
              return (
                <SettingsView
                  scale={interfaceScale}
                  setScale={setInterfaceScale}
                  currentTheme={currentTheme}
                  setTheme={setCurrentTheme}
                  twoFactorEnabled={Boolean(currentUser?.twoFactorEnabled)}
                  onRequestEnableTwoFactor={requestEnableTwoFactor}
                  onConfirmEnableTwoFactor={confirmEnableTwoFactor}
                  onRequestDisableTwoFactor={requestDisableTwoFactor}
                  onConfirmDisableTwoFactor={confirmDisableTwoFactor}
                  onResendTwoFactorCode={resendTwoFactorChallenge}
                  onChangePassword={changePassword}
                />
              );
            case 'guide':
              return <GuideView />;
            case 'admin':
              return currentUser?.role === 'admin' ? (
                <AdminView currentUser={currentUser} onContentDeleted={handleAdminContentDeleted} />
              ) : (
                <Dashboard
                  onOpenEditor={setActiveView}
                  onOpenScenarioEditor={handleOpenScenarioEditorFromDashboard}
                  onOpenMapEditor={handleOpenMapEditorFromDashboard}
                  onOpenCampaignEditor={handleOpenCampaignEditorFromDashboard}
                  scenarios={scenarios}
                  maps={maps}
                  characters={characters}
                  campaigns={campaigns}
                />
              );
            default:
              return (
                <Dashboard
                  onOpenEditor={setActiveView}
                  onOpenScenarioEditor={handleOpenScenarioEditorFromDashboard}
                  onOpenMapEditor={handleOpenMapEditorFromDashboard}
                  onOpenCampaignEditor={handleOpenCampaignEditorFromDashboard}
                  scenarios={scenarios}
                  maps={maps}
                  characters={characters}
                  campaigns={campaigns}
                />
              );
          }
        })()}
      </div>
  );

  if (isBootstrapping) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <LandingPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-main)] text-[var(--text-main)] selection:bg-[var(--col-red)] selection:text-white overflow-hidden relative">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        onLogout={handleLogout}
        isAdmin={currentUser?.role === 'admin'}
      />

      <main
        className="flex-1 relative flex flex-col h-full overflow-hidden transition-colors duration-300"
        style={{ zoom: interfaceScale }}
      >
        {showNotifications && (
          <div className="absolute top-6 left-6 w-96 z-[200] perspective-1000">
            <div className="bg-[var(--bg-surface)] border-2 border-[var(--col-red)] shadow-[10px_10px_0px_rgba(var(--col-red),0.2)] animate-appear origin-top-left">
              <div className="flex justify-between items-center p-4 border-b border-[var(--col-red)] bg-[var(--bg-main)] relative overflow-hidden">
                <div className="relative flex items-center gap-3">
                  <div className="w-2 h-2 bg-[var(--col-red)] animate-pulse" />
                  <span className="mono text-[10px] uppercase font-black tracking-[0.2em] text-[var(--col-red)]">
                    СИСТЕМНЫЕ УВЕДОМЛЕНИЯ
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearNotifications}
                  disabled={broadcasts.length === 0}
                  className="mono text-[9px] uppercase font-black tracking-[0.15em] border border-[var(--col-red)] px-3 py-1 text-[var(--col-red)] transition-all hover:bg-[var(--col-red)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--col-red)]"
                >
                  ОЧИСТИТЬ
                </button>
              </div>
              <div className="max-h-[320px] overflow-y-auto p-4 space-y-3">
                {broadcasts.length === 0 && (
                  <p className="text-[11px] text-[var(--text-muted)]">УВЕДОМЛЕНИЙ НЕТ.</p>
                )}
                {broadcasts.map((item) => (
                  <div key={item.id} className="border border-[var(--border-color)] p-3 bg-[var(--bg-main)]">
                    <div className="flex justify-between items-center">
                      <span
                        className="mono text-[9px] uppercase font-black"
                        style={{ color: getBroadcastAccent(item.type) }}
                      >
                        {BROADCAST_LABELS[item.type]}
                      </span>
                      <span className="mono text-[9px] text-[var(--text-muted)]">
                        {formatBroadcastTime(item.created_at)}
                      </span>
                    </div>
                    <p className="mono text-[10px] text-[var(--text-main)] mt-2">{item.message}</p>
                    <p className="mono text-[8px] text-[var(--text-muted)] mt-2">{item.author}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <Suspense fallback={<LoadingSpinner />}>{renderView}</Suspense>

        {isEditorOpen && editingCampaign && (
          <CampaignEditorModal
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            campaign={editingCampaign}
            onSave={handleSaveCampaign}
            allScenarios={scenarios}
            allMaps={maps}
            allCharacters={characters}
            allItems={items}
          />
        )}
      </main>
    </div>
  );
};

export default App;


