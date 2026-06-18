import React, { createContext, useContext } from 'react';
import {
  AdminContentItem,
  Asset,
  AssetCollection,
  AssetCollectionAssignmentMap,
  AssetCollectionCreatePayload,
  AssetCollectionTargetType,
  AssetCollectionUpdatePayload,
  AssetFolder,
  AssetFolderCreatePayload,
  AssetFolderUpdatePayload,
  AssetUpdatePayload,
  AssetUploadPayload,
  Campaign,
  Character,
  CharacterGroup,
  Chronicle,
  ChroniclePayload,
  ChronicleUpdatePayload,
  EntityLink,
  EntityLinkAssignmentMap,
  EntityLinkCreatePayload,
  EntityLinkTargetType,
  EntityLinkUpdatePayload,
  Faction,
  Item,
  ItemGroup,
  MapData,
  PublishedContent,
  PublicationAssignmentMap,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload,
  Scenario,
  ScenarioGroup,
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
} from '../../types';

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export interface AppViewData {
  currentUser: UserProfile | null;
  campaigns: Campaign[];
  scenarios: Scenario[];
  scenarioGroups: ScenarioGroup[];
  maps: MapData[];
  characters: Character[];
  characterGroups: CharacterGroup[];
  items: Item[];
  itemGroups: ItemGroup[];
  assets: Asset[];
  assetFolders: AssetFolder[];
  assetCollections: AssetCollection[];
  assetCollectionAssignments: AssetCollectionAssignmentMap;
  locations: WorldLocation[];
  factions: Faction[];
  chronicles: Chronicle[];
  worldEvents: WorldEvent[];
  tags: Tag[];
  tagAssignments: TagAssignmentMap;
  entityLinks: EntityLinkAssignmentMap;
  publicationAssignments: PublicationAssignmentMap;
}

export interface AppViewActions {
  setScenarios: SetState<Scenario[]>;
  setMaps: SetState<MapData[]>;
  setCharacters: SetState<Character[]>;
  setItems: SetState<Item[]>;
  openScenarioFromDashboard: (scenarioId?: string) => Promise<void>;
  openMapFromDashboard: (mapId?: string) => Promise<void>;
  openCampaignFromDashboard: (campaignId?: string) => void;
  openCampaignEditor: (campaign?: Campaign) => void;
  deleteCampaign: (id: string) => Promise<void>;
  createScenarioGroup: () => Promise<ScenarioGroup>;
  updateScenarioGroup: (id: string, payload: Partial<ScenarioGroup>) => Promise<ScenarioGroup>;
  deleteScenarioGroup: (id: string) => Promise<void>;
  createItem: (payload: Omit<Item, 'id'>) => Promise<Item>;
  updateItem: (id: string, payload: Omit<Item, 'id'>) => Promise<Item>;
  deleteItem: (id: string) => Promise<void>;
  createCharacterGroup: () => Promise<CharacterGroup>;
  updateCharacterGroup: (id: string, payload: Partial<CharacterGroup>) => Promise<CharacterGroup>;
  deleteCharacterGroup: (id: string) => Promise<void>;
  createItemGroup: () => Promise<ItemGroup>;
  updateItemGroup: (id: string, payload: Partial<ItemGroup>) => Promise<ItemGroup>;
  deleteItemGroup: (id: string) => Promise<void>;
  uploadAsset: (payload: AssetUploadPayload) => Promise<Asset>;
  updateAsset: (id: string, payload: AssetUpdatePayload) => Promise<Asset>;
  deleteAsset: (id: string) => Promise<void>;
  createAssetFolder: (payload: AssetFolderCreatePayload) => Promise<AssetFolder>;
  updateAssetFolder: (id: string, payload: AssetFolderUpdatePayload) => Promise<AssetFolder>;
  deleteAssetFolder: (id: string) => Promise<void>;
  createAssetCollection: (payload: AssetCollectionCreatePayload) => Promise<AssetCollection>;
  updateAssetCollection: (id: string, payload: AssetCollectionUpdatePayload) => Promise<AssetCollection>;
  deleteAssetCollection: (id: string) => Promise<void>;
  replaceAssetCollections: (type: AssetCollectionTargetType, id: string, collectionIds: string[]) => Promise<AssetCollection[]>;
  createLocation: (payload: WorldEntityPayload) => Promise<WorldLocation>;
  updateLocation: (id: string, payload: WorldEntityUpdatePayload) => Promise<WorldLocation>;
  deleteLocation: (id: string) => Promise<void>;
  createFaction: (payload: WorldEntityPayload) => Promise<Faction>;
  updateFaction: (id: string, payload: WorldEntityUpdatePayload) => Promise<Faction>;
  deleteFaction: (id: string) => Promise<void>;
  createChronicle: (payload: ChroniclePayload) => Promise<Chronicle>;
  updateChronicle: (id: string, payload: ChronicleUpdatePayload) => Promise<Chronicle>;
  deleteChronicle: (id: string) => Promise<void>;
  createWorldEvent: (payload: WorldEventPayload) => Promise<WorldEvent>;
  updateWorldEvent: (id: string, payload: WorldEventUpdatePayload) => Promise<WorldEvent>;
  deleteWorldEvent: (id: string) => Promise<void>;
  replaceTargetTags: (type: TaggableTargetType, id: string, tagIds: string[], newTags?: string[]) => Promise<Tag[]>;
  updateTag: (id: string, name: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  createMaterialLink: (sourceType: EntityLinkTargetType, sourceId: string, payload: EntityLinkCreatePayload) => Promise<EntityLink>;
  updateMaterialLink: (id: string, payload: EntityLinkUpdatePayload) => Promise<EntityLink>;
  deleteMaterialLink: (id: string) => Promise<void>;
  upsertPublication: (type: PublicationTargetType, id: string, payload: PublicationUpsertPayload) => Promise<PublishedContent>;
  updatePublication: (id: string, payload: PublicationUpdatePayload) => Promise<PublishedContent>;
  deletePublication: (id: string) => Promise<void>;
  updateProfile: (payload: {
    name: string;
    email: string;
    bio?: string | null;
    avatarFile?: File | null;
    bannerFile?: File | null;
    removeAvatar?: boolean;
    removeBanner?: boolean;
  }) => Promise<UserProfile>;
  requestEnableTwoFactor: () => Promise<{ challengeToken: string; expiresIn: number; retryAfter: number; devCode?: string | null }>;
  confirmEnableTwoFactor: (challengeToken: string, code: string) => Promise<string[]>;
  requestDisableTwoFactor: () => Promise<{ challengeToken: string; expiresIn: number; retryAfter: number; devCode?: string | null }>;
  confirmDisableTwoFactor: (challengeToken: string, code: string) => Promise<void>;
  resendTwoFactorCode: (challengeToken: string) => Promise<{ challengeToken: string; expiresIn: number; retryAfter: number; devCode?: string | null }>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  adminContentDeleted: (payload: { type: AdminContentItem['type']; id: number }) => void;
}

interface AppDataStoreContextValue {
  data: AppViewData;
  actions: AppViewActions;
}

const AppDataStoreContext = createContext<AppDataStoreContextValue | null>(null);

export const AppDataStoreProvider: React.FC<AppDataStoreContextValue & { children: React.ReactNode }> = ({
  data,
  actions,
  children
}) => (
  <AppDataStoreContext.Provider value={{ data, actions }}>
    {children}
  </AppDataStoreContext.Provider>
);

const useAppDataStore = (): AppDataStoreContextValue => {
  const context = useContext(AppDataStoreContext);
  if (!context) {
    throw new Error('AppDataStore hooks must be used inside AppDataStoreProvider');
  }

  return context;
};

export const useAppViewData = (): AppViewData => useAppDataStore().data;
export const useAppViewActions = (): AppViewActions => useAppDataStore().actions;
