'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { AppDataStoreProvider, AppViewData } from './components/app/AppDataStoreContext';
import { AppFrame } from './components/app/AppFrame';
import { AppViewRouter } from './components/app/AppViewRouter';
import { LoadingSpinner } from './components/app/LoadingSpinner';
import { apiRequest, clearAccessToken, refreshAccessToken } from './lib/api';
import { mapUserProfile } from './lib/userProfile';
import { UserProfile } from './types';
import { useAppDataLoading } from './hooks/useAppDataLoading';
import { useAppDomainActions } from './hooks/useAppDomainActions';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useStickyState } from './hooks/useStickyState';

const App: React.FC = () => {
  const navigation = useAppNavigation();
  const { activeView, setActiveView } = navigation;
  const [showNotifications, setShowNotifications] = useState(false);
  const [interfaceScale, setInterfaceScale] = useState(1);
  const [currentTheme, setCurrentTheme] = useState<'oled' | 'low-contrast' | 'light'>('oled');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [dismissedBroadcastIds, setDismissedBroadcastIds] = useStickyState<number[]>(
    [],
    'sf_dismissed_broadcast_ids'
  );

  const appData = useAppDataLoading({ dismissedBroadcastIds });
  const {
    campaigns,
    scenarios,
    scenarioGroups,
    maps,
    characters,
    characterGroups,
    items,
    itemGroups,
    assets,
    assetFolders,
    assetCollections,
    assetCollectionAssignments,
    locations,
    factions,
    chronicles,
    worldEvents,
    tags,
    tagAssignments,
    entityLinks,
    publicationAssignments,
    broadcasts,
    setBroadcasts,
    loadAllData,
    loadBroadcasts,
    resetData,
  } = appData;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  const fetchCurrentUser = useCallback(async (): Promise<UserProfile> => {
    const response = await apiRequest<any>('/me');
    return mapUserProfile(response);
  }, []);

  const { viewActions } = useAppDomainActions({
    data: appData,
    navigation,
    fetchCurrentUser,
    setCurrentUser,
  });

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      if (mounted) {
        setIsBootstrapping(true);
      }

      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        if (mounted) {
          clearAccessToken();
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
      } catch {
        if (!mounted) return;
        clearAccessToken();
        setIsAuthenticated(false);
        setCurrentUser(null);
        setIsBootstrapping(false);
        return;
      }

      try {
        await loadAllData();
      } catch (error) {
        console.error('Failed to load application data after auth bootstrap', error);
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
  }, [activeView, currentUser?.role, setActiveView]);

  useEffect(() => {
    if (!showNotifications || !isAuthenticated) return;
    void loadBroadcasts();
  }, [showNotifications, isAuthenticated, loadBroadcasts]);

  const handleLogin = async () => {
    try {
      const me = await fetchCurrentUser();
      setCurrentUser(me);
      setIsAuthenticated(true);
    } catch {
      clearAccessToken();
      setIsAuthenticated(false);
      setCurrentUser(null);
      return;
    }

    try {
      await loadAllData();
    } catch (error) {
      console.error('Failed to load application data after login', error);
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
    resetData();
  };

  const handleClearNotifications = useCallback(() => {
    if (broadcasts.length === 0) return;
    setDismissedBroadcastIds((prev) => {
      const next = new Set(prev);
      broadcasts.forEach((item) => next.add(item.id));
      return Array.from(next);
    });
    setBroadcasts([]);
  }, [broadcasts, setBroadcasts, setDismissedBroadcastIds]);

  const viewData: AppViewData = {
    currentUser,
    campaigns,
    scenarios,
    scenarioGroups,
    maps,
    characters,
    characterGroups,
    items,
    itemGroups,
    assets,
    assetFolders,
    assetCollections,
    assetCollectionAssignments,
    locations,
    factions,
    chronicles,
    worldEvents,
    tags,
    tagAssignments,
    entityLinks,
    publicationAssignments
  };

  const renderView = (
    <AppDataStoreProvider data={viewData} actions={viewActions}>
      <AppViewRouter
        navigation={navigation}
        interfaceScale={interfaceScale}
        setInterfaceScale={setInterfaceScale}
        currentTheme={currentTheme}
        setCurrentTheme={setCurrentTheme}
      />
    </AppDataStoreProvider>
  );

  if (isBootstrapping) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <LandingPage onLogin={handleLogin} />;
  }

  return (
    <AppFrame
      activeView={activeView}
      setActiveView={setActiveView}
      showNotifications={showNotifications}
      setShowNotifications={setShowNotifications}
      interfaceScale={interfaceScale}
      broadcasts={broadcasts}
      isAdmin={currentUser?.role === 'admin'}
      onLogout={handleLogout}
      onClearNotifications={handleClearNotifications}
      modal={null}
    >
      {renderView}
    </AppFrame>
  );
};

export default App;
