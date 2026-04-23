'use client';

import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { COLORS, ICONS } from './constants';
import { Button, AddTile, SectionHeader } from './components/UI';
import { BaseCard } from './components/BaseCard';
import { CampaignEditorModal } from './components/CampaignEditorModal';
import { Edit3, Loader2, Plus } from 'lucide-react';
import {
  AdminBroadcastItem,
  AdminContentItem,
  Campaign,
  Character,
  Item,
  MapData,
  Scenario,
  UserProfile
} from './types';
import { apiRequest, clearAccessToken, getAccessToken } from './lib/api';
import {
  mapCampaignFromApi,
  mapCampaignToApiPayload,
  mapChapterFromApi,
  mapCharacterFromApi,
  mapItemFromApi,
  mapItemToApiPayload,
  mapMapFromApi,
  mapScenarioSummary
} from './lib/mappers';

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
const CommunityView = lazyWithRetry(
  () => import('./components/CommunityView').then((module) => ({ default: module.CommunityView })),
  'community'
);
const FriendsView = lazyWithRetry(
  () => import('./components/FriendsView').then((module) => ({ default: module.FriendsView })),
  'friends'
);
const MessagesView = lazyWithRetry(
  () => import('./components/MessagesView').then((module) => ({ default: module.MessagesView })),
  'messages'
);
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
  const [broadcasts, setBroadcasts] = useState<AdminBroadcastItem[]>([]);
  const [dismissedBroadcastIds, setDismissedBroadcastIds] = useStickyState<number[]>(
    [],
    'sf_dismissed_broadcast_ids'
  );
  const [scenarioEditorTargetId, setScenarioEditorTargetId] = useState<string | null>(null);
  const [mapEditorTargetId, setMapEditorTargetId] = useState<string | null>(null);

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

  const loadAllData = useCallback(async () => {
    const [campaignsResponse, scenariosResponse, mapsResponse, charactersResponse, itemsResponse] = await Promise.all([
      apiRequest<any[]>('/campaigns'),
      apiRequest<any[]>('/scenarios'),
      apiRequest<any[]>('/maps'),
      apiRequest<any[]>('/characters'),
      apiRequest<any[]>('/items')
    ]);

    setCampaigns(campaignsResponse.map(mapCampaignFromApi));
    setScenarios(scenariosResponse.map(mapScenarioSummary));
    setMaps(mapsResponse.map(mapMapFromApi));
    setCharacters(charactersResponse.map(mapCharacterFromApi));
    setItems(itemsResponse.map(mapItemFromApi));
    await loadBroadcasts();
  }, [loadBroadcasts, setItems]);

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
        let createdScenario: Scenario = scenario;

        try {
          const chapterResponse = await apiRequest(`/scenarios/${scenario.id}/chapters`, {
            method: 'POST',
            body: JSON.stringify({ title: 'ГЛАВА 1', order_index: 0 }),
          });
          const chapter = mapChapterFromApi(chapterResponse);
          createdScenario = { ...scenario, chapters: [chapter] };
        } catch {
          // ignore chapter bootstrap failure
        }

        setScenarios((prev) => [createdScenario, ...prev.filter((item) => item.id !== createdScenario.id)]);
        targetId = createdScenario.id;
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

  const renderView = useMemo(() => {
    return (
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
                  maps={maps}
                  onUpdateCharacters={setCharacters}
                  onUpdateMaps={setMaps}
                  initialScenarioId={scenarioEditorTargetId}
                />
              );
            case 'maps':
              return <MapEditor data={maps} onUpdate={setMaps} initialMapId={mapEditorTargetId} />;
            case 'items':
              return (
                <ItemsEditor
                  data={items}
                  onUpdate={setItems}
                  onCreateItem={handleCreateItem}
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={handleDeleteItem}
                />
              );
            case 'characters':
              return <CharactersEditor data={characters} onUpdate={setCharacters} items={items} />;
            case 'profile':
              return (
                <ProfileEditor
                  user={currentUser}
                  scenariosCount={scenarios.length}
                  mapsCount={maps.length}
                  onSaveProfile={handleUpdateProfile}
                />
              );
            case 'community':
              return <CommunityView />;
            case 'friends':
              return <FriendsView />;
            case 'messages':
              return <MessagesView />;
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
  }, [
    activeView,
    campaigns,
    characters,
    currentTheme,
    currentUser,
    interfaceScale,
    items,
    handleCreateItem,
    handleAdminContentDeleted,
    handleDeleteItem,
    confirmDisableTwoFactor,
    confirmEnableTwoFactor,
    changePassword,
    handleUpdateProfile,
    handleUpdateItem,
    mapEditorTargetId,
    maps,
    resendTwoFactorChallenge,
    requestDisableTwoFactor,
    requestEnableTwoFactor,
    scenarioEditorTargetId,
    scenarios
  ]);

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


