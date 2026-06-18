import { useCallback, useEffect, useState } from 'react';
import { AppView, WorldEditorTarget } from '../appTypes';
import { EntityLinkTargetType, ScenarioNodeEntityTargetType } from '../types';

const GRAPH_RETURN_VIEWS: AppView[] = ['maps', 'characters', 'items', 'assets'];

export const useAppNavigation = () => {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [campaignEditorTargetId, setCampaignEditorTargetId] = useState<string | null>(null);
  const [scenarioEditorTargetId, setScenarioEditorTargetId] = useState<string | null>(null);
  const [mapEditorTargetId, setMapEditorTargetId] = useState<string | null>(null);
  const [characterEditorTargetId, setCharacterEditorTargetId] = useState<string | null>(null);
  const [itemEditorTargetId, setItemEditorTargetId] = useState<string | null>(null);
  const [assetEditorTargetId, setAssetEditorTargetId] = useState<string | null>(null);
  const [worldEditorTarget, setWorldEditorTarget] = useState<WorldEditorTarget | null>(null);
  const [graphReturnScenarioId, setGraphReturnScenarioId] = useState<string | null>(null);

  useEffect(() => {
    if (activeView !== 'scenarios') setScenarioEditorTargetId(null);
    if (activeView !== 'campaigns') setCampaignEditorTargetId(null);
    if (activeView !== 'maps') setMapEditorTargetId(null);
    if (activeView !== 'characters') setCharacterEditorTargetId(null);
    if (activeView !== 'items') setItemEditorTargetId(null);
    if (activeView !== 'assets') setAssetEditorTargetId(null);
    if (activeView !== 'world') setWorldEditorTarget(null);
    if (!GRAPH_RETURN_VIEWS.includes(activeView)) setGraphReturnScenarioId(null);
  }, [activeView]);

  const openScenario = useCallback((id?: string | null) => {
    setScenarioEditorTargetId(id ?? null);
    setActiveView('scenarios');
  }, []);

  const openCampaign = useCallback((id?: string | null) => {
    setCampaignEditorTargetId(id ?? null);
    setActiveView('campaigns');
  }, []);

  const openMap = useCallback((id?: string | null) => {
    setMapEditorTargetId(id ?? null);
    setActiveView('maps');
  }, []);

  const openCharacter = useCallback((id?: string | null) => {
    setCharacterEditorTargetId(id ?? null);
    setActiveView('characters');
  }, []);

  const openItem = useCallback((id?: string | null) => {
    setItemEditorTargetId(id ?? null);
    setActiveView('items');
  }, []);

  const openAsset = useCallback((id?: string | null) => {
    setAssetEditorTargetId(id ?? null);
    setActiveView('assets');
  }, []);

  const openWorldTarget = useCallback((_target: WorldEditorTarget) => {
    setWorldEditorTarget(null);
  }, []);

  const returnToGraphScenario = useCallback(() => {
    if (!graphReturnScenarioId) return;
    setScenarioEditorTargetId(graphReturnScenarioId);
    setActiveView('scenarios');
    setGraphReturnScenarioId(null);
  }, [graphReturnScenarioId]);

  const openGraphEntityLink = useCallback((
    targetType: ScenarioNodeEntityTargetType,
    targetId: string,
    sourceScenarioId: string
  ) => {
    if (targetType === 'map') {
      setGraphReturnScenarioId(sourceScenarioId);
      openMap(targetId);
      return;
    }

    if (targetType === 'character') {
      setGraphReturnScenarioId(sourceScenarioId);
      openCharacter(targetId);
      return;
    }

    if (targetType === 'item') {
      setGraphReturnScenarioId(sourceScenarioId);
      openItem(targetId);
      return;
    }

    if (targetType === 'asset') {
      setGraphReturnScenarioId(sourceScenarioId);
      openAsset(targetId);
      return;
    }

    if (targetType === 'location' || targetType === 'faction' || targetType === 'event') {
      return;
    }
  }, [openAsset, openCharacter, openItem, openMap]);

  const openMaterialLink = useCallback((targetType: EntityLinkTargetType, targetId: string) => {
    if (targetType === 'scenario') {
      openScenario(targetId);
      return;
    }

    if (targetType === 'map') {
      openMap(targetId);
      return;
    }

    if (targetType === 'character') {
      openCharacter(targetId);
      return;
    }

    if (targetType === 'item') {
      openItem(targetId);
      return;
    }

    if (targetType === 'asset') {
      openAsset(targetId);
      return;
    }

    if (targetType === 'location' || targetType === 'faction' || targetType === 'event') {
      return;
    }
  }, [openAsset, openCharacter, openItem, openMap, openScenario]);

  return {
    activeView,
    setActiveView,
    campaignEditorTargetId,
    scenarioEditorTargetId,
    mapEditorTargetId,
    characterEditorTargetId,
    itemEditorTargetId,
    assetEditorTargetId,
    worldEditorTarget,
    graphReturnScenarioId,
    openScenario,
    openCampaign,
    openMap,
    openCharacter,
    openItem,
    openAsset,
    openWorldTarget,
    openMaterialLink,
    openGraphEntityLink,
    returnToGraphScenario
  };
};

export type AppNavigation = ReturnType<typeof useAppNavigation>;
