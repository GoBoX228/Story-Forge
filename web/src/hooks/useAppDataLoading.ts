import { useCallback, useState } from 'react';
import {
  AdminBroadcastItem,
  Asset,
  AssetCollection,
  AssetCollectionAssignmentMap,
  AssetCollectionTargetType,
  AssetFolder,
  Campaign,
  Character,
  CharacterGroup,
  Chronicle,
  EntityLinkAssignmentMap,
  EntityLinkTargetType,
  Faction,
  Item,
  ItemGroup,
  MapData,
  PublishedContent,
  PublicationAssignmentMap,
  Scenario,
  Tag,
  TagAssignmentMap,
  TaggableTargetType,
  WorldEvent,
  WorldLocation
} from '../types';
import { apiRequest } from '../lib/api';
import {
  assetCollectionAssignmentKey,
  entityLinkAssignmentKey,
  mapCampaignFromApi,
  mapCharacterFromApi,
  mapItemFromApi,
  mapMapFromApi,
  mapScenarioSummary,
  tagAssignmentKey
} from '../lib/mappers';
import {
  listAssetCollections,
  listAssetFolders,
  listAssets,
  listTargetAssetCollections
} from '../lib/assetApi';
import {
  listChronicles,
  listFactions,
  listLocations,
  listWorldEvents
} from '../lib/worldApi';
import { listTags, listTargetTags } from '../lib/tagApi';
import { listEntityLinks } from '../lib/entityLinkApi';
import { listCharacterGroups, listItemGroups } from '../lib/cardGroupApi';
import { useStickyState } from './useStickyState';

interface TagTargetRef {
  type: TaggableTargetType;
  id: string;
}

interface EntityLinkTargetRef {
  type: EntityLinkTargetType;
  id: string;
}

interface AssetCollectionTargetRef {
  type: AssetCollectionTargetType;
  id: string;
}

interface UseAppDataLoadingOptions {
  dismissedBroadcastIds: number[];
}

const INITIAL_ITEMS: Item[] = [];

export function useAppDataLoading({ dismissedBroadcastIds }: UseAppDataLoadingOptions) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [maps, setMaps] = useState<MapData[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterGroups, setCharacterGroups] = useState<CharacterGroup[]>([]);
  const [items, setItems] = useStickyState<Item[]>(INITIAL_ITEMS, 'sf_items');
  const [itemGroups, setItemGroups] = useState<ItemGroup[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetFolders, setAssetFolders] = useState<AssetFolder[]>([]);
  const [assetCollections, setAssetCollections] = useState<AssetCollection[]>([]);
  const [assetCollectionAssignments, setAssetCollectionAssignments] = useState<AssetCollectionAssignmentMap>({});
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [chronicles, setChronicles] = useState<Chronicle[]>([]);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagAssignments, setTagAssignments] = useState<TagAssignmentMap>({});
  const [entityLinks, setEntityLinks] = useState<EntityLinkAssignmentMap>({});
  const [, setPublications] = useState<PublishedContent[]>([]);
  const [publicationAssignments, setPublicationAssignments] = useState<PublicationAssignmentMap>({});
  const [broadcasts, setBroadcasts] = useState<AdminBroadcastItem[]>([]);

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

  const loadAssetCollectionAssignments = useCallback(async (targets: AssetCollectionTargetRef[]) => {
    const pairs = await Promise.all(
      targets.map(async (target) => {
        try {
          const targetCollections = await listTargetAssetCollections(target.type, target.id);
          return [assetCollectionAssignmentKey(target.type, target.id), targetCollections] as const;
        } catch {
          return [assetCollectionAssignmentKey(target.type, target.id), []] as const;
        }
      })
    );

    setAssetCollectionAssignments(Object.fromEntries(pairs));
  }, []);

  const loadAllData = useCallback(async () => {
    const [
      campaignsResponse,
      scenariosResponse,
      mapsResponse,
      charactersResponse,
      characterGroupsResponse,
      itemsResponse,
      itemGroupsResponse,
      assetsResponse,
      assetFoldersResponse,
      assetCollectionsResponse,
      locationsResponse,
      factionsResponse,
      chroniclesResponse,
      worldEventsResponse,
      tagsResponse
    ] = await Promise.all([
      apiRequest<any[]>('/campaigns'),
      apiRequest<any[]>('/scenarios'),
      apiRequest<any[]>('/maps'),
      apiRequest<any[]>('/characters'),
      listCharacterGroups(),
      apiRequest<any[]>('/items'),
      listItemGroups(),
      listAssets(),
      listAssetFolders(),
      listAssetCollections(),
      listLocations(),
      listFactions(),
      listChronicles(),
      listWorldEvents(),
      listTags()
    ]);

    setCampaigns(campaignsResponse.map(mapCampaignFromApi));
    setScenarios(scenariosResponse.map(mapScenarioSummary));
    setMaps(mapsResponse.map(mapMapFromApi));
    setCharacters(charactersResponse.map(mapCharacterFromApi));
    setCharacterGroups(characterGroupsResponse);
    setItems(itemsResponse.map(mapItemFromApi));
    setItemGroups(itemGroupsResponse);
    setAssets(assetsResponse);
    setAssetFolders(assetFoldersResponse);
    setAssetCollections(assetCollectionsResponse);
    setLocations(locationsResponse);
    setFactions(factionsResponse);
    setChronicles(chroniclesResponse);
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

    const assetCollectionTargets = [
      ...mapsResponse.map((map) => ({ type: 'map' as const, id: String(map.id) })),
      ...charactersResponse.map((character) => ({ type: 'character' as const, id: String(character.id) })),
      ...characterGroupsResponse.map((group) => ({ type: 'character_group' as const, id: group.id })),
      ...itemsResponse.map((item) => ({ type: 'item' as const, id: String(item.id) })),
      ...itemGroupsResponse.map((group) => ({ type: 'item_group' as const, id: group.id }))
    ];

    await loadTagAssignments(materialTargets);
    await loadEntityLinkAssignments(materialTargets);
    await loadAssetCollectionAssignments(assetCollectionTargets);
    await loadBroadcasts();
  }, [loadAssetCollectionAssignments, loadBroadcasts, loadEntityLinkAssignments, loadTagAssignments, setItems]);

  const resetData = useCallback(() => {
    setCampaigns([]);
    setScenarios([]);
    setMaps([]);
    setCharacters([]);
    setCharacterGroups([]);
    setItems([]);
    setItemGroups([]);
    setAssets([]);
    setAssetFolders([]);
    setAssetCollections([]);
    setAssetCollectionAssignments({});
    setLocations([]);
    setFactions([]);
    setChronicles([]);
    setWorldEvents([]);
    setTags([]);
    setTagAssignments({});
    setEntityLinks({});
    setPublications([]);
    setPublicationAssignments({});
    setBroadcasts([]);
  }, [setItems]);

  return {
    campaigns,
    setCampaigns,
    scenarios,
    setScenarios,
    maps,
    setMaps,
    characters,
    setCharacters,
    characterGroups,
    setCharacterGroups,
    items,
    setItems,
    itemGroups,
    setItemGroups,
    assets,
    setAssets,
    assetFolders,
    setAssetFolders,
    assetCollections,
    setAssetCollections,
    assetCollectionAssignments,
    setAssetCollectionAssignments,
    locations,
    setLocations,
    factions,
    setFactions,
    chronicles,
    setChronicles,
    worldEvents,
    setWorldEvents,
    tags,
    setTags,
    tagAssignments,
    setTagAssignments,
    entityLinks,
    setEntityLinks,
    setPublications,
    publicationAssignments,
    setPublicationAssignments,
    broadcasts,
    setBroadcasts,
    loadAllData,
    loadTagAssignments,
    loadEntityLinkAssignments,
    loadAssetCollectionAssignments,
    loadBroadcasts,
    resetData
  };
}

export type AppDataLoadingState = ReturnType<typeof useAppDataLoading>;
