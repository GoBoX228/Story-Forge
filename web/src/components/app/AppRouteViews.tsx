import React, { lazy } from 'react';
import { ArrowLeft } from 'lucide-react';
import Dashboard from '../Dashboard';
import { Button } from '../UI';
import { CampaignsView } from './CampaignsView';
import { useAppViewActions, useAppViewData } from './AppDataStoreContext';
import { AppNavigation } from '../../hooks/useAppNavigation';
import { Scenario } from '../../types';

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

const ScenarioEditor = lazyWithRetry(() => import('../ScenarioEditor'), 'scenario');
const MapEditor = lazyWithRetry(() => import('../MapEditor'), 'map');
const ProfileEditor = lazyWithRetry(() => import('../ProfileEditor'), 'profile');
const ItemsEditor = lazyWithRetry(() => import('../ItemsEditor'), 'items');
const CharactersEditor = lazyWithRetry(() => import('../CharactersEditor'), 'characters');
const AssetsEditor = lazyWithRetry(() => import('../AssetsEditor'), 'assets');
const WorldEditor = lazyWithRetry(() => import('../WorldEditor'), 'world');
const SettingsView = lazyWithRetry(
  () => import('../SettingsView').then((module) => ({ default: module.SettingsView })),
  'settings'
);
const GuideView = lazyWithRetry(
  () => import('../GuideView').then((module) => ({ default: module.GuideView })),
  'guide'
);
const AdminView = lazyWithRetry(
  () => import('../AdminView').then((module) => ({ default: module.AdminView })),
  'admin'
);

export type ThemeName = 'oled' | 'low-contrast' | 'light';

interface NavigationRouteProps {
  navigation: AppNavigation;
}

interface SettingsRouteProps {
  interfaceScale: number;
  setInterfaceScale: (scale: number) => void;
  currentTheme: ThemeName;
  setCurrentTheme: (theme: ThemeName) => void;
}

interface GraphReturnBannerProps {
  graphReturnScenarioId: string | null;
  scenarios: Scenario[];
  onReturn: () => void;
}

const GraphReturnBanner: React.FC<GraphReturnBannerProps> = ({
  graphReturnScenarioId,
  scenarios,
  onReturn
}) => {
  if (!graphReturnScenarioId) {
    return null;
  }

  const scenarioTitle = scenarios.find((scenario) => scenario.id === graphReturnScenarioId)?.title;

  return (
    <div className="shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-6 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="mono text-[8px] uppercase font-black text-[var(--text-muted)] tracking-widest">
          ОТКРЫТО ИЗ УЗЛА ГРАФА
        </div>
        <div className="mono text-[10px] uppercase font-black text-[var(--text-main)] truncate">
          {scenarioTitle ?? 'СЦЕНАРИЙ'}
        </div>
      </div>
      <Button variant="accent-red" size="sm" inverted onClick={onReturn}>
        <ArrowLeft size={13} /> ВЕРНУТЬСЯ К СЦЕНАРИЮ
      </Button>
    </div>
  );
};

const GraphReturnLayout: React.FC<NavigationRouteProps & { children: React.ReactNode }> = ({
  navigation,
  children
}) => {
  const data = useAppViewData();

  return (
    <div className="h-full w-full flex flex-col">
      <GraphReturnBanner
        graphReturnScenarioId={navigation.graphReturnScenarioId}
        scenarios={data.scenarios}
        onReturn={navigation.returnToGraphScenario}
      />
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
};

export const DashboardRoute: React.FC<NavigationRouteProps> = ({ navigation }) => {
  const data = useAppViewData();
  const actions = useAppViewActions();

  return (
    <Dashboard
      onOpenEditor={navigation.setActiveView}
      onOpenScenarioEditor={actions.openScenarioFromDashboard}
      onOpenMapEditor={actions.openMapFromDashboard}
      onOpenCampaignEditor={actions.openCampaignFromDashboard}
      scenarios={data.scenarios}
      maps={data.maps}
      characters={data.characters}
      campaigns={data.campaigns}
    />
  );
};

export const CampaignsRoute: React.FC<NavigationRouteProps> = ({ navigation }) => {
  const data = useAppViewData();
  const actions = useAppViewActions();

  return (
    <CampaignsView
      campaigns={data.campaigns}
      scenarios={data.scenarios}
      maps={data.maps}
      characters={data.characters}
      items={data.items}
      tags={data.tags}
      tagAssignments={data.tagAssignments}
      entityLinks={data.entityLinks}
      initialCampaignId={navigation.campaignEditorTargetId}
      onCreateCampaign={actions.createCampaign}
      onUpdateCampaign={actions.updateCampaign}
      onDeleteCampaign={actions.deleteCampaign}
      onUpdateScenarioCampaign={actions.updateScenarioCampaign}
      onReplaceTargetTags={actions.replaceTargetTags}
      onUpdateTag={actions.updateTag}
      onDeleteTag={actions.deleteTag}
      onCreateMaterialLink={actions.createMaterialLink}
      onDeleteMaterialLink={actions.deleteMaterialLink}
      onOpenScenario={(id) => navigation.openScenario(id)}
      onOpenMap={(id) => navigation.openMap(id)}
      onOpenCharacter={(id) => navigation.openCharacter(id)}
      onOpenItem={(id) => navigation.openItem(id)}
    />
  );
};

export const ScenariosRoute: React.FC<NavigationRouteProps> = ({ navigation }) => {
  const data = useAppViewData();
  const actions = useAppViewActions();

  return (
    <ScenarioEditor
      data={data.scenarios}
      onUpdate={actions.setScenarios}
      scenarioGroups={data.scenarioGroups}
      onCreateScenarioGroup={actions.createScenarioGroup}
      onUpdateScenarioGroup={actions.updateScenarioGroup}
      onDeleteScenarioGroup={actions.deleteScenarioGroup}
      campaigns={data.campaigns}
      characters={data.characters}
      items={data.items}
      maps={data.maps}
      assets={data.assets}
      locations={data.locations}
      factions={data.factions}
      events={data.worldEvents}
      onUpdateCharacters={actions.setCharacters}
      onUpdateMaps={actions.setMaps}
      tags={data.tags}
      tagAssignments={data.tagAssignments}
      entityLinks={data.entityLinks}
      publicationAssignments={data.publicationAssignments}
      onReplaceTargetTags={actions.replaceTargetTags}
      onUpdateTag={actions.updateTag}
      onDeleteTag={actions.deleteTag}
      onCreateMaterialLink={actions.createMaterialLink}
      onUpdateMaterialLink={actions.updateMaterialLink}
      onDeleteMaterialLink={actions.deleteMaterialLink}
      onUpsertPublication={actions.upsertPublication}
      onUpdatePublication={actions.updatePublication}
      onDeletePublication={actions.deletePublication}
      onOpenMaterialLink={navigation.openMaterialLink}
      initialScenarioId={navigation.scenarioEditorTargetId}
      onOpenEntityLink={navigation.openGraphEntityLink}
    />
  );
};

export const MapsRoute: React.FC<NavigationRouteProps> = ({ navigation }) => {
  const data = useAppViewData();
  const actions = useAppViewActions();

  return (
    <GraphReturnLayout navigation={navigation}>
      <MapEditor
        data={data.maps}
        onUpdate={actions.setMaps}
        scenarios={data.scenarios}
        characters={data.characters}
        items={data.items}
        assetsLibrary={data.assets}
        assetCollections={data.assetCollections}
        assetCollectionAssignments={data.assetCollectionAssignments}
        locations={data.locations}
        factions={data.factions}
        events={data.worldEvents}
        tags={data.tags}
        tagAssignments={data.tagAssignments}
        entityLinks={data.entityLinks}
        publicationAssignments={data.publicationAssignments}
        onReplaceTargetTags={actions.replaceTargetTags}
        onUpdateTag={actions.updateTag}
        onDeleteTag={actions.deleteTag}
        onCreateMaterialLink={actions.createMaterialLink}
        onUpdateMaterialLink={actions.updateMaterialLink}
        onDeleteMaterialLink={actions.deleteMaterialLink}
        onUpsertPublication={actions.upsertPublication}
        onUpdatePublication={actions.updatePublication}
        onDeletePublication={actions.deletePublication}
        onOpenMaterialLink={navigation.openMaterialLink}
        onReplaceAssetCollections={actions.replaceAssetCollections}
        initialMapId={navigation.mapEditorTargetId}
      />
    </GraphReturnLayout>
  );
};

export const ItemsRoute: React.FC<NavigationRouteProps> = ({ navigation }) => {
  const data = useAppViewData();
  const actions = useAppViewActions();

  return (
    <GraphReturnLayout navigation={navigation}>
      <ItemsEditor
        data={data.items}
        onUpdate={actions.setItems}
        onCreateItem={actions.createItem}
        onUpdateItem={actions.updateItem}
        onDeleteItem={actions.deleteItem}
        itemGroups={data.itemGroups}
        onCreateItemGroup={actions.createItemGroup}
        onUpdateItemGroup={actions.updateItemGroup}
        onDeleteItemGroup={actions.deleteItemGroup}
        assets={data.assets}
        assetCollections={data.assetCollections}
        assetCollectionAssignments={data.assetCollectionAssignments}
        tags={data.tags}
        tagAssignments={data.tagAssignments}
        entityLinks={data.entityLinks}
        publicationAssignments={data.publicationAssignments}
        onReplaceTargetTags={actions.replaceTargetTags}
        onUpdateTag={actions.updateTag}
        onDeleteTag={actions.deleteTag}
        onCreateMaterialLink={actions.createMaterialLink}
        onDeleteMaterialLink={actions.deleteMaterialLink}
        onUpsertPublication={actions.upsertPublication}
        onUpdatePublication={actions.updatePublication}
        onDeletePublication={actions.deletePublication}
        onReplaceAssetCollections={actions.replaceAssetCollections}
        initialItemId={navigation.itemEditorTargetId}
      />
    </GraphReturnLayout>
  );
};

export const CharactersRoute: React.FC<NavigationRouteProps> = ({ navigation }) => {
  const data = useAppViewData();
  const actions = useAppViewActions();

  return (
    <GraphReturnLayout navigation={navigation}>
      <CharactersEditor
        data={data.characters}
        onUpdate={actions.setCharacters}
        characterGroups={data.characterGroups}
        onCreateCharacterGroup={actions.createCharacterGroup}
        onUpdateCharacterGroup={actions.updateCharacterGroup}
        onDeleteCharacterGroup={actions.deleteCharacterGroup}
        items={data.items}
        assets={data.assets}
        assetCollections={data.assetCollections}
        assetCollectionAssignments={data.assetCollectionAssignments}
        tags={data.tags}
        tagAssignments={data.tagAssignments}
        entityLinks={data.entityLinks}
        publicationAssignments={data.publicationAssignments}
        onReplaceTargetTags={actions.replaceTargetTags}
        onUpdateTag={actions.updateTag}
        onDeleteTag={actions.deleteTag}
        onCreateMaterialLink={actions.createMaterialLink}
        onDeleteMaterialLink={actions.deleteMaterialLink}
        onUpsertPublication={actions.upsertPublication}
        onUpdatePublication={actions.updatePublication}
        onDeletePublication={actions.deletePublication}
        onReplaceAssetCollections={actions.replaceAssetCollections}
        initialCharacterId={navigation.characterEditorTargetId}
      />
    </GraphReturnLayout>
  );
};

export const AssetsRoute: React.FC<NavigationRouteProps> = ({ navigation }) => {
  const data = useAppViewData();
  const actions = useAppViewActions();

  return (
    <GraphReturnLayout navigation={navigation}>
      <AssetsEditor
        data={data.assets}
        folders={data.assetFolders}
        collections={data.assetCollections}
        scenarios={data.scenarios}
        maps={data.maps}
        characters={data.characters}
        items={data.items}
        locations={data.locations}
        factions={data.factions}
        events={data.worldEvents}
        onUploadAsset={actions.uploadAsset}
        onUpdateAsset={actions.updateAsset}
        onDeleteAsset={actions.deleteAsset}
        onCreateFolder={actions.createAssetFolder}
        onUpdateFolder={actions.updateAssetFolder}
        onDeleteFolder={actions.deleteAssetFolder}
        onCreateCollection={actions.createAssetCollection}
        onUpdateCollection={actions.updateAssetCollection}
        onDeleteCollection={actions.deleteAssetCollection}
        tags={data.tags}
        tagAssignments={data.tagAssignments}
        entityLinks={data.entityLinks}
        publicationAssignments={data.publicationAssignments}
        onReplaceTargetTags={actions.replaceTargetTags}
        onUpdateTag={actions.updateTag}
        onDeleteTag={actions.deleteTag}
        onCreateMaterialLink={actions.createMaterialLink}
        onUpdateMaterialLink={actions.updateMaterialLink}
        onDeleteMaterialLink={actions.deleteMaterialLink}
        onUpsertPublication={actions.upsertPublication}
        onUpdatePublication={actions.updatePublication}
        onDeletePublication={actions.deletePublication}
        onOpenMaterialLink={navigation.openMaterialLink}
        initialAssetId={navigation.assetEditorTargetId}
      />
    </GraphReturnLayout>
  );
};

export const WorldRoute: React.FC<NavigationRouteProps> = ({ navigation }) => {
  const data = useAppViewData();
  const actions = useAppViewActions();

  return (
    <GraphReturnLayout navigation={navigation}>
      <WorldEditor
        locations={data.locations}
        factions={data.factions}
        chronicles={data.chronicles}
        events={data.worldEvents}
        campaigns={data.campaigns}
        scenarios={data.scenarios}
        maps={data.maps}
        characters={data.characters}
        items={data.items}
        assets={data.assets}
        onCreateLocation={actions.createLocation}
        onUpdateLocation={actions.updateLocation}
        onDeleteLocation={actions.deleteLocation}
        onCreateFaction={actions.createFaction}
        onUpdateFaction={actions.updateFaction}
        onDeleteFaction={actions.deleteFaction}
        onCreateChronicle={actions.createChronicle}
        onUpdateChronicle={actions.updateChronicle}
        onDeleteChronicle={actions.deleteChronicle}
        onCreateEvent={actions.createWorldEvent}
        onUpdateEvent={actions.updateWorldEvent}
        onDeleteEvent={actions.deleteWorldEvent}
        tags={data.tags}
        tagAssignments={data.tagAssignments}
        entityLinks={data.entityLinks}
        publicationAssignments={data.publicationAssignments}
        onReplaceTargetTags={actions.replaceTargetTags}
        onUpdateTag={actions.updateTag}
        onDeleteTag={actions.deleteTag}
        onCreateMaterialLink={actions.createMaterialLink}
        onUpdateMaterialLink={actions.updateMaterialLink}
        onDeleteMaterialLink={actions.deleteMaterialLink}
        onUpsertPublication={actions.upsertPublication}
        onUpdatePublication={actions.updatePublication}
        onDeletePublication={actions.deletePublication}
        onOpenMaterialLink={navigation.openMaterialLink}
        initialTarget={navigation.worldEditorTarget}
      />
    </GraphReturnLayout>
  );
};

export const ProfileRoute: React.FC = () => {
  const data = useAppViewData();
  const actions = useAppViewActions();

  return (
    <ProfileEditor
      user={data.currentUser}
      scenariosCount={data.scenarios.length}
      mapsCount={data.maps.length}
      onSaveProfile={actions.updateProfile}
    />
  );
};

export const SettingsRoute: React.FC<SettingsRouteProps> = ({
  interfaceScale,
  setInterfaceScale,
  currentTheme,
  setCurrentTheme
}) => {
  const data = useAppViewData();
  const actions = useAppViewActions();

  return (
    <SettingsView
      scale={interfaceScale}
      setScale={setInterfaceScale}
      currentTheme={currentTheme}
      setTheme={setCurrentTheme}
      twoFactorEnabled={Boolean(data.currentUser?.twoFactorEnabled)}
      onRequestEnableTwoFactor={actions.requestEnableTwoFactor}
      onConfirmEnableTwoFactor={actions.confirmEnableTwoFactor}
      onRequestDisableTwoFactor={actions.requestDisableTwoFactor}
      onConfirmDisableTwoFactor={actions.confirmDisableTwoFactor}
      onResendTwoFactorCode={actions.resendTwoFactorCode}
      onChangePassword={actions.changePassword}
    />
  );
};

export const GuideRoute: React.FC = () => <GuideView />;

export const AdminRoute: React.FC<NavigationRouteProps> = ({ navigation }) => {
  const data = useAppViewData();
  const actions = useAppViewActions();

  if (data.currentUser?.role !== 'admin') {
    return <DashboardRoute navigation={navigation} />;
  }

  return <AdminView currentUser={data.currentUser} onContentDeleted={actions.adminContentDeleted} />;
};
