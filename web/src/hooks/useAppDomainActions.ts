import { useCallback, useMemo } from 'react';
import { AppViewActions } from '../components/app/AppDataStoreContext';
import { AppNavigation } from './useAppNavigation';
import { AppDataLoadingState } from './useAppDataLoading';
import {
  AdminContentItem,
  AssetCollectionCreatePayload,
  AssetCollectionTargetType,
  AssetCollectionUpdatePayload,
  AssetFolderCreatePayload,
  AssetFolderUpdatePayload,
  AssetUpdatePayload,
  AssetUploadPayload,
  CampaignPayload,
  CharacterGroup,
  ChroniclePayload,
  ChronicleUpdatePayload,
  EntityLinkCreatePayload,
  EntityLinkTargetType,
  EntityLinkUpdatePayload,
  Item,
  ItemGroup,
  PublishedContent,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload,
  TaggableTargetType,
  ScenarioGroup,
  UserProfile,
  WorldEntityPayload,
  WorldEntityUpdatePayload,
  WorldEventPayload,
  WorldEventUpdatePayload
} from '../types';
import { apiRequest } from '../lib/api';
import {
  mapItemFromApi,
  mapItemToApiPayload,
  mapMapFromApi,
  mapScenarioSummary
} from '../lib/mappers';
import {
  createAssetCollection,
  createAssetFolder,
  deleteAsset,
  deleteAssetCollection,
  deleteAssetFolder,
  replaceTargetAssetCollections,
  updateAsset,
  updateAssetCollection,
  updateAssetFolder,
  uploadAsset
} from '../lib/assetApi';
import {
  createChronicle,
  createFaction,
  createLocation,
  createWorldEvent,
  deleteChronicle,
  deleteFaction,
  deleteLocation,
  deleteWorldEvent,
  updateChronicle,
  updateFaction,
  updateLocation,
  updateWorldEvent
} from '../lib/worldApi';
import { deleteTag, replaceTargetTags, updateTag } from '../lib/tagApi';
import { createEntityLink, deleteEntityLink, updateEntityLink } from '../lib/entityLinkApi';
import { deletePublication, publishTarget, updatePublication } from '../lib/publicationApi';
import {
  createScenarioGroup,
  deleteScenarioGroup,
  createCharacterGroup,
  createItemGroup,
  updateScenarioGroup,
  deleteCharacterGroup,
  deleteItemGroup,
  updateCharacterGroup,
  updateItemGroup
} from '../lib/cardGroupApi';
import { mapUserProfile } from '../lib/userProfile';
import {
  createCampaign,
  deleteCampaign,
  updateCampaign
} from '../lib/campaignApi';
import {
  addAssetToCollectionMembership,
  addAssetToFolderMembership,
  addEntityLinkAssignment,
  appendSortedCharacterGroup,
  appendSortedItemGroup,
  appendSortedScenarioGroup,
  clearCampaignFromScenarios,
  clearAssetFolderFromAssets,
  clearCharacterGroupFromCharacters,
  clearChronicleFromEvents,
  clearItemGroupFromItems,
  clearScenarioGroupFromScenarios,
  mergeTagsById,
  removeAssetCollectionAssignment,
  removeAssetCollectionFromAssets,
  removeAssetCollectionFromAssignments,
  removeAssetFromCollections,
  removeAssetFromFolders,
  removeById,
  removeCharacterFromCampaigns,
  removeCharacterFromScenarios,
  removeEntityLinkEverywhere,
  removeItemFromCharacters,
  removeItemFromScenarios,
  removeMapFromCampaigns,
  removeMapFromScenarios,
  removePublicationAssignment,
  removeScenarioFromCampaigns,
  removeTagEverywhere,
  replaceAssetCollectionAssignment,
  replaceById,
  replaceEntityLinkEverywhere,
  replaceTagAssignment,
  replaceTagEverywhere,
  sortByName,
  syncAssetCollectionMembership,
  syncAssetFolderMembership,
  upsertById,
  upsertCampaign,
  upsertPublication as upsertPublicationList,
  upsertPublicationAssignment
} from '../lib/appOptimisticUpdates';

interface TwoFactorChallengePayload {
  challengeToken: string;
  expiresIn: number;
  retryAfter: number;
  devCode?: string | null;
}

interface UseAppDomainActionsOptions {
  data: AppDataLoadingState;
  navigation: AppNavigation;
  fetchCurrentUser: () => Promise<UserProfile>;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const toTimestamp = (value?: string | null): number => {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
};

const mapTwoFactorChallenge = (response: any, fallbackToken?: string): TwoFactorChallengePayload => ({
  challengeToken: response.challenge_token ?? fallbackToken,
  expiresIn: Number(response.expires_in ?? 0),
  retryAfter: Number(response.retry_after ?? 30),
  devCode: response.dev_code ?? null,
});

const useAccountActions = (
  fetchCurrentUser: () => Promise<UserProfile>,
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>
) => {
  const updateProfile = useCallback(
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

      if (payload.avatarFile) formData.append('avatar_file', payload.avatarFile);
      if (payload.bannerFile) formData.append('banner_file', payload.bannerFile);
      if (payload.removeAvatar) formData.append('remove_avatar', '1');
      if (payload.removeBanner) formData.append('remove_banner', '1');

      const response = await apiRequest<any>('/me', {
        method: 'PATCH',
        body: formData,
      });

      const mapped = mapUserProfile(response);
      setCurrentUser(mapped);
      return mapped;
    },
    [setCurrentUser]
  );

  const requestEnableTwoFactor = useCallback(async (): Promise<TwoFactorChallengePayload> => {
    const response = await apiRequest<any>('/auth/2fa/enable', { method: 'POST' });
    return mapTwoFactorChallenge(response);
  }, []);

  const confirmEnableTwoFactor = useCallback(async (challengeToken: string, code: string): Promise<string[]> => {
    const response = await apiRequest<any>('/auth/2fa/enable/confirm', {
      method: 'POST',
      body: JSON.stringify({ challenge_token: challengeToken, code }),
    });

    if (response?.user) {
      setCurrentUser(mapUserProfile(response.user));
      return Array.isArray(response.recovery_codes) ? response.recovery_codes : [];
    }

    const me = await fetchCurrentUser();
    setCurrentUser(me);
    return [];
  }, [fetchCurrentUser, setCurrentUser]);

  const requestDisableTwoFactor = useCallback(async (): Promise<TwoFactorChallengePayload> => {
    const response = await apiRequest<any>('/auth/2fa/disable', { method: 'POST' });
    return mapTwoFactorChallenge(response);
  }, []);

  const confirmDisableTwoFactor = useCallback(async (challengeToken: string, code: string) => {
    const response = await apiRequest<any>('/auth/2fa/disable/confirm', {
      method: 'POST',
      body: JSON.stringify({ challenge_token: challengeToken, code }),
    });

    if (response?.user) {
      setCurrentUser(mapUserProfile(response.user));
      return;
    }

    const me = await fetchCurrentUser();
    setCurrentUser(me);
  }, [fetchCurrentUser, setCurrentUser]);

  const resendTwoFactorCode = useCallback(async (challengeToken: string): Promise<TwoFactorChallengePayload> => {
    const response = await apiRequest<any>('/auth/2fa/resend', {
      method: 'POST',
      body: JSON.stringify({ challenge_token: challengeToken }),
    });

    return mapTwoFactorChallenge(response, challengeToken);
  }, []);

  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> => {
    await apiRequest('/auth/password/change', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      }),
    });
  }, []);

  return {
    updateProfile,
    requestEnableTwoFactor,
    confirmEnableTwoFactor,
    requestDisableTwoFactor,
    confirmDisableTwoFactor,
    resendTwoFactorCode,
    changePassword,
  };
};

const useScenarioGroupActions = (data: AppDataLoadingState) => {
  const {
    setScenarioGroups,
    setScenarios,
  } = data;

  const createScenarioGroupAction = useCallback(async () => {
    const created = await createScenarioGroup({ name: 'Новая группа', description: '' });
    setScenarioGroups((prev) => appendSortedScenarioGroup(prev, created));
    return created;
  }, [setScenarioGroups]);

  const updateScenarioGroupAction = useCallback(async (id: string, payload: Partial<ScenarioGroup>) => {
    const updated = await updateScenarioGroup(id, {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.orderIndex !== undefined ? { orderIndex: payload.orderIndex } : {})
    });
    setScenarioGroups((prev) => replaceById(prev, id, updated));
    return updated;
  }, [setScenarioGroups]);

  const deleteScenarioGroupAction = useCallback(async (id: string) => {
    await deleteScenarioGroup(id);
    setScenarioGroups((prev) => removeById(prev, id));
    setScenarios((prev) => clearScenarioGroupFromScenarios(prev, id));
  }, [setScenarioGroups, setScenarios]);

  return {
    createScenarioGroup: createScenarioGroupAction,
    updateScenarioGroup: updateScenarioGroupAction,
    deleteScenarioGroup: deleteScenarioGroupAction,
  };
};

const useItemAndGroupActions = (data: AppDataLoadingState) => {
  const {
    setItems,
    setCharacterGroups,
    setCharacters,
    setItemGroups,
    setAssetCollectionAssignments,
  } = data;

  const createItem = useCallback(async (payload: Omit<Item, 'id'>) => {
    const response = await apiRequest<any>('/items', {
      method: 'POST',
      body: JSON.stringify(mapItemToApiPayload(payload)),
    });
    const mapped = mapItemFromApi(response);
    setItems((prev) => [mapped, ...prev]);
    return mapped;
  }, [setItems]);

  const updateItem = useCallback(async (id: string, payload: Omit<Item, 'id'>) => {
    const response = await apiRequest<any>(`/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(mapItemToApiPayload(payload)),
    });
    const mapped = mapItemFromApi(response);
    setItems((prev) => replaceById(prev, id, mapped));
    return mapped;
  }, [setItems]);

  const deleteItem = useCallback(async (id: string) => {
    await apiRequest(`/items/${id}`, { method: 'DELETE' });
    setItems((prev) => removeById(prev, id));
  }, [setItems]);

  const createCharacterGroupAction = useCallback(async () => {
    const created = await createCharacterGroup({ name: 'Новая группа', description: '' });
    setCharacterGroups((prev) => appendSortedCharacterGroup(prev, created));
    return created;
  }, [setCharacterGroups]);

  const updateCharacterGroupAction = useCallback(async (id: string, payload: Partial<CharacterGroup>) => {
    const updated = await updateCharacterGroup(id, {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.orderIndex !== undefined ? { orderIndex: payload.orderIndex } : {})
    });
    setCharacterGroups((prev) => replaceById(prev, id, updated));
    return updated;
  }, [setCharacterGroups]);

  const deleteCharacterGroupAction = useCallback(async (id: string) => {
    await deleteCharacterGroup(id);
    setCharacterGroups((prev) => removeById(prev, id));
    setCharacters((prev) => clearCharacterGroupFromCharacters(prev, id));
    setAssetCollectionAssignments((prev) => removeAssetCollectionAssignment(prev, 'character_group', id));
  }, [setAssetCollectionAssignments, setCharacterGroups, setCharacters]);

  const createItemGroupAction = useCallback(async () => {
    const created = await createItemGroup({ name: 'Новая группа', description: '' });
    setItemGroups((prev) => appendSortedItemGroup(prev, created));
    return created;
  }, [setItemGroups]);

  const updateItemGroupAction = useCallback(async (id: string, payload: Partial<ItemGroup>) => {
    const updated = await updateItemGroup(id, {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.orderIndex !== undefined ? { orderIndex: payload.orderIndex } : {})
    });
    setItemGroups((prev) => replaceById(prev, id, updated));
    return updated;
  }, [setItemGroups]);

  const deleteItemGroupAction = useCallback(async (id: string) => {
    await deleteItemGroup(id);
    setItemGroups((prev) => removeById(prev, id));
    setItems((prev) => clearItemGroupFromItems(prev, id));
    setAssetCollectionAssignments((prev) => removeAssetCollectionAssignment(prev, 'item_group', id));
  }, [setAssetCollectionAssignments, setItemGroups, setItems]);

  return {
    createItem,
    updateItem,
    deleteItem,
    createCharacterGroup: createCharacterGroupAction,
    updateCharacterGroup: updateCharacterGroupAction,
    deleteCharacterGroup: deleteCharacterGroupAction,
    createItemGroup: createItemGroupAction,
    updateItemGroup: updateItemGroupAction,
    deleteItemGroup: deleteItemGroupAction,
  };
};

const useAssetActions = (data: AppDataLoadingState) => {
  const {
    setAssets,
    setAssetFolders,
    setAssetCollections,
    setAssetCollectionAssignments,
  } = data;

  const uploadAssetAction = useCallback(async (payload: AssetUploadPayload) => {
    const uploaded = await uploadAsset(payload);
    setAssets((prev) => [uploaded, ...prev]);
    setAssetFolders((prev) => addAssetToFolderMembership(prev, uploaded));
    setAssetCollections((prev) => addAssetToCollectionMembership(prev, uploaded));
    return uploaded;
  }, [setAssetCollections, setAssetFolders, setAssets]);

  const updateAssetAction = useCallback(async (id: string, payload: AssetUpdatePayload) => {
    const updated = await updateAsset(id, payload);
    setAssets((prev) => replaceById(prev, id, updated));
    setAssetFolders((prev) => syncAssetFolderMembership(prev, updated));
    setAssetCollections((prev) => syncAssetCollectionMembership(prev, updated));
    return updated;
  }, [setAssetCollections, setAssetFolders, setAssets]);

  const deleteAssetAction = useCallback(async (id: string) => {
    await deleteAsset(id);
    setAssets((prev) => removeById(prev, id));
    setAssetFolders((prev) => removeAssetFromFolders(prev, id));
    setAssetCollections((prev) => removeAssetFromCollections(prev, id));
  }, [setAssetCollections, setAssetFolders, setAssets]);

  const createAssetFolderAction = useCallback(async (payload: AssetFolderCreatePayload) => {
    const created = await createAssetFolder(payload);
    setAssetFolders((prev) => sortByName([...prev, created]));
    return created;
  }, [setAssetFolders]);

  const updateAssetFolderAction = useCallback(async (id: string, payload: AssetFolderUpdatePayload) => {
    const updated = await updateAssetFolder(id, payload);
    setAssetFolders((prev) => replaceById(prev, id, updated));
    return updated;
  }, [setAssetFolders]);

  const deleteAssetFolderAction = useCallback(async (id: string) => {
    await deleteAssetFolder(id);
    setAssets((prev) => clearAssetFolderFromAssets(prev, id));
    setAssetFolders((prev) => removeById(prev, id));
  }, [setAssetFolders, setAssets]);

  const createAssetCollectionAction = useCallback(async (payload: AssetCollectionCreatePayload) => {
    const created = await createAssetCollection(payload);
    setAssetCollections((prev) => sortByName([...prev, created]));
    return created;
  }, [setAssetCollections]);

  const updateAssetCollectionAction = useCallback(async (id: string, payload: AssetCollectionUpdatePayload) => {
    const updated = await updateAssetCollection(id, payload);
    setAssetCollections((prev) => replaceById(prev, id, updated));
    return updated;
  }, [setAssetCollections]);

  const deleteAssetCollectionAction = useCallback(async (id: string) => {
    await deleteAssetCollection(id);
    setAssetCollections((prev) => removeById(prev, id));
    setAssets((prev) => removeAssetCollectionFromAssets(prev, id));
    setAssetCollectionAssignments((prev) => removeAssetCollectionFromAssignments(prev, id));
  }, [setAssetCollectionAssignments, setAssetCollections, setAssets]);

  const replaceAssetCollections = useCallback(async (
    type: AssetCollectionTargetType,
    id: string,
    collectionIds: string[]
  ) => {
    const collections = await replaceTargetAssetCollections(type, id, { collectionIds });
    setAssetCollectionAssignments((prev) => replaceAssetCollectionAssignment(prev, type, id, collections));
    return collections;
  }, [setAssetCollectionAssignments]);

  return {
    uploadAsset: uploadAssetAction,
    updateAsset: updateAssetAction,
    deleteAsset: deleteAssetAction,
    createAssetFolder: createAssetFolderAction,
    updateAssetFolder: updateAssetFolderAction,
    deleteAssetFolder: deleteAssetFolderAction,
    createAssetCollection: createAssetCollectionAction,
    updateAssetCollection: updateAssetCollectionAction,
    deleteAssetCollection: deleteAssetCollectionAction,
    replaceAssetCollections,
  };
};

const useAtlasActions = (data: AppDataLoadingState) => {
  const {
    setLocations,
    setFactions,
    setChronicles,
    setWorldEvents,
  } = data;

  const createLocationAction = useCallback(async (payload: WorldEntityPayload) => {
    const created = await createLocation(payload);
    setLocations((prev) => [created, ...prev]);
    return created;
  }, [setLocations]);

  const updateLocationAction = useCallback(async (id: string, payload: WorldEntityUpdatePayload) => {
    const updated = await updateLocation(id, payload);
    setLocations((prev) => replaceById(prev, id, updated));
    return updated;
  }, [setLocations]);

  const deleteLocationAction = useCallback(async (id: string) => {
    await deleteLocation(id);
    setLocations((prev) => removeById(prev, id));
  }, [setLocations]);

  const createFactionAction = useCallback(async (payload: WorldEntityPayload) => {
    const created = await createFaction(payload);
    setFactions((prev) => [created, ...prev]);
    return created;
  }, [setFactions]);

  const updateFactionAction = useCallback(async (id: string, payload: WorldEntityUpdatePayload) => {
    const updated = await updateFaction(id, payload);
    setFactions((prev) => replaceById(prev, id, updated));
    return updated;
  }, [setFactions]);

  const deleteFactionAction = useCallback(async (id: string) => {
    await deleteFaction(id);
    setFactions((prev) => removeById(prev, id));
  }, [setFactions]);

  const createChronicleAction = useCallback(async (payload: ChroniclePayload) => {
    const created = await createChronicle(payload);
    setChronicles((prev) => [created, ...prev]);
    return created;
  }, [setChronicles]);

  const updateChronicleAction = useCallback(async (id: string, payload: ChronicleUpdatePayload) => {
    const updated = await updateChronicle(id, payload);
    setChronicles((prev) => replaceById(prev, id, updated));
    return updated;
  }, [setChronicles]);

  const deleteChronicleAction = useCallback(async (id: string) => {
    await deleteChronicle(id);
    setChronicles((prev) => removeById(prev, id));
    setWorldEvents((prev) => clearChronicleFromEvents(prev, id));
  }, [setChronicles, setWorldEvents]);

  const createWorldEventAction = useCallback(async (payload: WorldEventPayload) => {
    const created = await createWorldEvent(payload);
    setWorldEvents((prev) => [created, ...prev]);
    return created;
  }, [setWorldEvents]);

  const updateWorldEventAction = useCallback(async (id: string, payload: WorldEventUpdatePayload) => {
    const updated = await updateWorldEvent(id, payload);
    setWorldEvents((prev) => replaceById(prev, id, updated));
    return updated;
  }, [setWorldEvents]);

  const deleteWorldEventAction = useCallback(async (id: string) => {
    await deleteWorldEvent(id);
    setWorldEvents((prev) => removeById(prev, id));
  }, [setWorldEvents]);

  return {
    createLocation: createLocationAction,
    updateLocation: updateLocationAction,
    deleteLocation: deleteLocationAction,
    createFaction: createFactionAction,
    updateFaction: updateFactionAction,
    deleteFaction: deleteFactionAction,
    createChronicle: createChronicleAction,
    updateChronicle: updateChronicleAction,
    deleteChronicle: deleteChronicleAction,
    createWorldEvent: createWorldEventAction,
    updateWorldEvent: updateWorldEventAction,
    deleteWorldEvent: deleteWorldEventAction,
  };
};

const useTaxonomyAndPublicationActions = (data: AppDataLoadingState) => {
  const {
    setTags,
    setTagAssignments,
    setEntityLinks,
    setPublications,
    setPublicationAssignments,
  } = data;

  const replaceTargetTagsAction = useCallback(async (
    type: TaggableTargetType,
    id: string,
    tagIds: string[],
    newTags: string[] = []
  ) => {
    const nextTags = await replaceTargetTags(type, id, { tagIds, newTags });
    setTagAssignments((prev) => replaceTagAssignment(prev, type, id, nextTags));
    setTags((prev) => mergeTagsById(prev, nextTags));
    return nextTags;
  }, [setTagAssignments, setTags]);

  const updateTagAction = useCallback(async (id: string, name: string) => {
    const updated = await updateTag(id, { name });
    setTags((prev) => sortByName(replaceById(prev, id, updated)));
    setTagAssignments((prev) => replaceTagEverywhere(prev, updated));
    return updated;
  }, [setTagAssignments, setTags]);

  const deleteTagAction = useCallback(async (id: string) => {
    await deleteTag(id);
    setTags((prev) => removeById(prev, id));
    setTagAssignments((prev) => removeTagEverywhere(prev, id));
  }, [setTagAssignments, setTags]);

  const createMaterialLink = useCallback(async (
    sourceType: EntityLinkTargetType,
    sourceId: string,
    payload: EntityLinkCreatePayload
  ) => {
    const nextLink = await createEntityLink(sourceType, sourceId, payload);
    setEntityLinks((prev) => addEntityLinkAssignment(prev, sourceType, sourceId, nextLink));
    return nextLink;
  }, [setEntityLinks]);

  const updateMaterialLink = useCallback(async (id: string, payload: EntityLinkUpdatePayload) => {
    const updated = await updateEntityLink(id, payload);
    setEntityLinks((prev) => replaceEntityLinkEverywhere(prev, updated));
    return updated;
  }, [setEntityLinks]);

  const deleteMaterialLink = useCallback(async (id: string) => {
    await deleteEntityLink(id);
    setEntityLinks((prev) => removeEntityLinkEverywhere(prev, id));
  }, [setEntityLinks]);

  const upsertPublicationState = useCallback((publication: PublishedContent) => {
    setPublications((prev) => upsertPublicationList(prev, publication));
    setPublicationAssignments((prev) => upsertPublicationAssignment(prev, publication));
  }, [setPublicationAssignments, setPublications]);

  const upsertPublication = useCallback(async (
    type: PublicationTargetType,
    id: string,
    payload: PublicationUpsertPayload
  ) => {
    const publication = await publishTarget(type, id, payload);
    upsertPublicationState(publication);
    return publication;
  }, [upsertPublicationState]);

  const updatePublicationAction = useCallback(async (id: string, payload: PublicationUpdatePayload) => {
    const publication = await updatePublication(id, payload);
    upsertPublicationState(publication);
    return publication;
  }, [upsertPublicationState]);

  const deletePublicationAction = useCallback(async (id: string) => {
    await deletePublication(id);
    setPublications((prev) => removeById(prev, id));
    setPublicationAssignments((prev) => removePublicationAssignment(prev, id));
  }, [setPublicationAssignments, setPublications]);

  return {
    replaceTargetTags: replaceTargetTagsAction,
    updateTag: updateTagAction,
    deleteTag: deleteTagAction,
    createMaterialLink,
    updateMaterialLink,
    deleteMaterialLink,
    upsertPublication,
    updatePublication: updatePublicationAction,
    deletePublication: deletePublicationAction,
  };
};

const useCampaignAndDashboardActions = (
  data: AppDataLoadingState,
  navigation: AppNavigation
) => {
  const {
    campaigns,
    scenarios,
    maps,
    setCampaigns,
    setScenarios,
    setMaps,
    setEntityLinks,
    setTagAssignments,
  } = data;

  const createCampaignAction = useCallback(async (payload: CampaignPayload) => {
    const created = await createCampaign(payload);
    setCampaigns((prev) => upsertCampaign(prev, created));
    return created;
  }, [setCampaigns]);

  const updateCampaignAction = useCallback(async (id: string, payload: CampaignPayload) => {
    const updated = await updateCampaign(id, payload);
    setCampaigns((prev) => upsertCampaign(prev, updated, id));
    return updated;
  }, [setCampaigns]);

  const deleteCampaignAction = useCallback(async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот мир?')) return;

    try {
      await deleteCampaign(id);
      setCampaigns((prev) => removeById(prev, id));
      setScenarios((prev) => clearCampaignFromScenarios(prev, id));
      setEntityLinks((prev) => {
        const next = { ...prev };
        delete next[`campaign:${id}`];
        return next;
      });
      setTagAssignments((prev) => {
        const next = { ...prev };
        delete next[`campaign:${id}`];
        return next;
      });
    } catch {
      // ignore
    }
  }, [setCampaigns, setEntityLinks, setScenarios, setTagAssignments]);

  const updateScenarioCampaign = useCallback(async (scenarioId: string, campaignId: string | null) => {
    const response = await apiRequest(`/scenarios/${scenarioId}`, {
      method: 'PATCH',
      body: JSON.stringify({ campaign_id: campaignId })
    });
    const updated = mapScenarioSummary(response);
    setScenarios((prev) => upsertById(prev, updated));
    setCampaigns((prev) => prev.map((campaign) => ({
      ...campaign,
      scenarioIds: campaign.id === campaignId
        ? Array.from(new Set([...campaign.scenarioIds, scenarioId]))
        : campaign.scenarioIds.filter((id) => id !== scenarioId)
    })));
    return updated;
  }, [setCampaigns, setScenarios]);

  const openScenarioFromDashboard = useCallback(async (scenarioId?: string) => {
    let targetId = scenarioId;

    if (!targetId && scenarios.length > 0) {
      targetId = [...scenarios]
        .sort((a, b) =>
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
        setScenarios((prev) => upsertById(prev, scenario));
        targetId = scenario.id;
      } catch {
        navigation.openScenario();
        return;
      }
    }

    navigation.openScenario(targetId);
  }, [navigation, scenarios, setScenarios]);

  const openMapFromDashboard = useCallback(async (mapId?: string) => {
    let targetId = mapId;

    if (!targetId && maps.length > 0) {
      targetId = [...maps]
        .sort((a, b) =>
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
        setMaps((prev) => upsertById(prev, map));
        targetId = map.id;
      } catch {
        navigation.openMap();
        return;
      }
    }

    navigation.openMap(targetId);
  }, [maps, navigation, setMaps]);

  const openCampaignFromDashboard = useCallback((campaignId?: string) => {
    const targetCampaignId = campaignId
      ?? [...campaigns].sort(
          (a, b) =>
            Math.max(toTimestamp(b.updatedAt), toTimestamp(b.createdAt)) -
            Math.max(toTimestamp(a.updatedAt), toTimestamp(a.createdAt))
        )[0]?.id;

    navigation.openCampaign(targetCampaignId);
  }, [campaigns, navigation]);

  return {
    createCampaign: createCampaignAction,
    updateCampaign: updateCampaignAction,
    deleteCampaign: deleteCampaignAction,
    updateScenarioCampaign,
    openScenarioFromDashboard,
    openMapFromDashboard,
    openCampaignFromDashboard,
  };
};

const useAdminActions = (data: AppDataLoadingState) => {
  const {
    setCampaigns,
    setScenarios,
    setMaps,
    setCharacters,
    setItems,
  } = data;

  const adminContentDeleted = useCallback(({ type, id }: { type: AdminContentItem['type']; id: number }) => {
    const contentId = String(id);

    if (type === 'scenario') {
      setScenarios((prev) => removeById(prev, contentId));
      setCampaigns((prev) => removeScenarioFromCampaigns(prev, contentId));
    }

    if (type === 'map') {
      setMaps((prev) => removeById(prev, contentId));
      setCampaigns((prev) => removeMapFromCampaigns(prev, contentId));
      setScenarios((prev) => removeMapFromScenarios(prev, contentId));
    }

    if (type === 'character') {
      setCharacters((prev) => removeById(prev, contentId));
      setCampaigns((prev) => removeCharacterFromCampaigns(prev, contentId));
      setScenarios((prev) => removeCharacterFromScenarios(prev, contentId));
    }

    if (type === 'item') {
      setItems((prev) => removeById(prev, contentId));
      setCharacters((prev) => removeItemFromCharacters(prev, contentId));
      setScenarios((prev) => removeItemFromScenarios(prev, contentId));
    }

    if (type === 'campaign') {
      setCampaigns((prev) => removeById(prev, contentId));
      setScenarios((prev) => clearCampaignFromScenarios(prev, contentId));
    }
  }, [setCampaigns, setCharacters, setItems, setMaps, setScenarios]);

  return { adminContentDeleted };
};

export function useAppDomainActions({
  data,
  navigation,
  fetchCurrentUser,
  setCurrentUser,
}: UseAppDomainActionsOptions) {
  const accountActions = useAccountActions(fetchCurrentUser, setCurrentUser);
  const scenarioGroupActions = useScenarioGroupActions(data);
  const itemActions = useItemAndGroupActions(data);
  const assetActions = useAssetActions(data);
  const atlasActions = useAtlasActions(data);
  const taxonomyActions = useTaxonomyAndPublicationActions(data);
  const campaignActions = useCampaignAndDashboardActions(data, navigation);
  const adminActions = useAdminActions(data);

  const viewActions: AppViewActions = useMemo(() => ({
    setScenarios: data.setScenarios,
    setMaps: data.setMaps,
    setCharacters: data.setCharacters,
    setItems: data.setItems,
    openScenarioFromDashboard: campaignActions.openScenarioFromDashboard,
    openMapFromDashboard: campaignActions.openMapFromDashboard,
    openCampaignFromDashboard: campaignActions.openCampaignFromDashboard,
    createCampaign: campaignActions.createCampaign,
    updateCampaign: campaignActions.updateCampaign,
    deleteCampaign: campaignActions.deleteCampaign,
    updateScenarioCampaign: campaignActions.updateScenarioCampaign,
    createScenarioGroup: scenarioGroupActions.createScenarioGroup,
    updateScenarioGroup: scenarioGroupActions.updateScenarioGroup,
    deleteScenarioGroup: scenarioGroupActions.deleteScenarioGroup,
    createItem: itemActions.createItem,
    updateItem: itemActions.updateItem,
    deleteItem: itemActions.deleteItem,
    createCharacterGroup: itemActions.createCharacterGroup,
    updateCharacterGroup: itemActions.updateCharacterGroup,
    deleteCharacterGroup: itemActions.deleteCharacterGroup,
    createItemGroup: itemActions.createItemGroup,
    updateItemGroup: itemActions.updateItemGroup,
    deleteItemGroup: itemActions.deleteItemGroup,
    uploadAsset: assetActions.uploadAsset,
    updateAsset: assetActions.updateAsset,
    deleteAsset: assetActions.deleteAsset,
    createAssetFolder: assetActions.createAssetFolder,
    updateAssetFolder: assetActions.updateAssetFolder,
    deleteAssetFolder: assetActions.deleteAssetFolder,
    createAssetCollection: assetActions.createAssetCollection,
    updateAssetCollection: assetActions.updateAssetCollection,
    deleteAssetCollection: assetActions.deleteAssetCollection,
    replaceAssetCollections: assetActions.replaceAssetCollections,
    createLocation: atlasActions.createLocation,
    updateLocation: atlasActions.updateLocation,
    deleteLocation: atlasActions.deleteLocation,
    createFaction: atlasActions.createFaction,
    updateFaction: atlasActions.updateFaction,
    deleteFaction: atlasActions.deleteFaction,
    createChronicle: atlasActions.createChronicle,
    updateChronicle: atlasActions.updateChronicle,
    deleteChronicle: atlasActions.deleteChronicle,
    createWorldEvent: atlasActions.createWorldEvent,
    updateWorldEvent: atlasActions.updateWorldEvent,
    deleteWorldEvent: atlasActions.deleteWorldEvent,
    replaceTargetTags: taxonomyActions.replaceTargetTags,
    updateTag: taxonomyActions.updateTag,
    deleteTag: taxonomyActions.deleteTag,
    createMaterialLink: taxonomyActions.createMaterialLink,
    updateMaterialLink: taxonomyActions.updateMaterialLink,
    deleteMaterialLink: taxonomyActions.deleteMaterialLink,
    upsertPublication: taxonomyActions.upsertPublication,
    updatePublication: taxonomyActions.updatePublication,
    deletePublication: taxonomyActions.deletePublication,
    updateProfile: accountActions.updateProfile,
    requestEnableTwoFactor: accountActions.requestEnableTwoFactor,
    confirmEnableTwoFactor: accountActions.confirmEnableTwoFactor,
    requestDisableTwoFactor: accountActions.requestDisableTwoFactor,
    confirmDisableTwoFactor: accountActions.confirmDisableTwoFactor,
    resendTwoFactorCode: accountActions.resendTwoFactorCode,
    changePassword: accountActions.changePassword,
    adminContentDeleted: adminActions.adminContentDeleted,
  }), [
    accountActions,
    adminActions,
    assetActions,
    atlasActions,
    campaignActions,
    data.setCharacters,
    data.setItems,
    data.setMaps,
    data.setScenarios,
    itemActions,
    scenarioGroupActions,
    taxonomyActions,
  ]);

  return { viewActions };
}
