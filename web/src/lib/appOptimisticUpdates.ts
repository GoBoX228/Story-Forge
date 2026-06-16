import {
  Asset,
  AssetCollection,
  AssetCollectionAssignmentMap,
  AssetCollectionTargetType,
  AssetFolder,
  Campaign,
  Character,
  CharacterGroup,
  EntityLink,
  EntityLinkAssignmentMap,
  EntityLinkTargetType,
  Item,
  ItemGroup,
  MapData,
  PublishedContent,
  PublicationAssignmentMap,
  Scenario,
  Tag,
  TagAssignmentMap,
  TaggableTargetType,
  WorldEvent
} from '../types';
import {
  assetCollectionAssignmentKey,
  entityLinkAssignmentKey,
  publicationAssignmentKey,
  tagAssignmentKey
} from './mappers';
import { entityLinkIdentityKey } from './assetUsage';

type Identified = {
  id: string;
};

export const upsertById = <T extends Identified>(items: T[], item: T): T[] => [
  item,
  ...items.filter((current) => current.id !== item.id)
];

export const replaceById = <T extends Identified>(items: T[], id: string, item: T): T[] =>
  items.map((current) => (current.id === id ? item : current));

export const removeById = <T extends Identified>(items: T[], id: string): T[] =>
  items.filter((item) => item.id !== id);

export const sortByName = <T extends { name: string }>(items: T[]): T[] =>
  [...items].sort((left, right) => left.name.localeCompare(right.name));

export const sortByOrderThenName = <T extends { orderIndex: number; name: string }>(items: T[]): T[] =>
  [...items].sort((left, right) => left.orderIndex - right.orderIndex || left.name.localeCompare(right.name));

const addUnique = (items: string[], id: string): string[] =>
  items.includes(id) ? items : [...items, id];

export const removeAssetCollectionAssignment = (
  assignments: AssetCollectionAssignmentMap,
  type: AssetCollectionTargetType,
  id: string
): AssetCollectionAssignmentMap => {
  const next = { ...assignments };
  delete next[assetCollectionAssignmentKey(type, id)];
  return next;
};

export const clearCharacterGroupFromCharacters = (characters: Character[], groupId: string): Character[] =>
  characters.map((character) => (character.groupId === groupId ? { ...character, groupId: null } : character));

export const clearItemGroupFromItems = (items: Item[], groupId: string): Item[] =>
  items.map((item) => (item.groupId === groupId ? { ...item, groupId: null } : item));

export const addAssetToFolderMembership = (folders: AssetFolder[], asset: Asset): AssetFolder[] =>
  folders.map((folder) => asset.folderId === folder.id
    ? { ...folder, assetIds: addUnique(folder.assetIds, asset.id) }
    : folder
  );

export const syncAssetFolderMembership = (folders: AssetFolder[], asset: Asset): AssetFolder[] =>
  folders.map((folder) => ({
    ...folder,
    assetIds: asset.folderId === folder.id
      ? addUnique(folder.assetIds, asset.id)
      : folder.assetIds.filter((assetId) => assetId !== asset.id)
  }));

export const removeAssetFromFolders = (folders: AssetFolder[], assetId: string): AssetFolder[] =>
  folders.map((folder) => ({
    ...folder,
    assetIds: folder.assetIds.filter((currentId) => currentId !== assetId)
  }));

export const addAssetToCollectionMembership = (collections: AssetCollection[], asset: Asset): AssetCollection[] =>
  collections.map((collection) => asset.collectionIds.includes(collection.id)
    ? { ...collection, assetIds: addUnique(collection.assetIds, asset.id) }
    : collection
  );

export const syncAssetCollectionMembership = (collections: AssetCollection[], asset: Asset): AssetCollection[] =>
  collections.map((collection) => ({
    ...collection,
    assetIds: asset.collectionIds.includes(collection.id)
      ? addUnique(collection.assetIds, asset.id)
      : collection.assetIds.filter((assetId) => assetId !== asset.id)
  }));

export const removeAssetFromCollections = (collections: AssetCollection[], assetId: string): AssetCollection[] =>
  collections.map((collection) => ({
    ...collection,
    assetIds: collection.assetIds.filter((currentId) => currentId !== assetId)
  }));

export const clearAssetFolderFromAssets = (assets: Asset[], folderId: string): Asset[] =>
  assets.map((asset) => (asset.folderId === folderId ? { ...asset, folderId: null } : asset));

export const removeAssetCollectionFromAssets = (assets: Asset[], collectionId: string): Asset[] =>
  assets.map((asset) => ({
    ...asset,
    collectionIds: asset.collectionIds.filter((currentId) => currentId !== collectionId)
  }));

export const removeAssetCollectionFromAssignments = (
  assignments: AssetCollectionAssignmentMap,
  collectionId: string
): AssetCollectionAssignmentMap =>
  Object.fromEntries(
    Object.entries(assignments).map(([key, collections]) => [
      key,
      collections.filter((collection) => collection.id !== collectionId)
    ])
  );

export const replaceAssetCollectionAssignment = (
  assignments: AssetCollectionAssignmentMap,
  type: AssetCollectionTargetType,
  id: string,
  collections: AssetCollection[]
): AssetCollectionAssignmentMap => ({
  ...assignments,
  [assetCollectionAssignmentKey(type, id)]: collections
});

export const clearChronicleFromEvents = (events: WorldEvent[], chronicleId: string): WorldEvent[] =>
  events.map((event) => (event.chronicleId === chronicleId ? { ...event, chronicleId: null } : event));

export const replaceTagAssignment = (
  assignments: TagAssignmentMap,
  type: TaggableTargetType,
  id: string,
  tags: Tag[]
): TagAssignmentMap => ({
  ...assignments,
  [tagAssignmentKey(type, id)]: tags
});

export const mergeTagsById = (currentTags: Tag[], nextTags: Tag[]): Tag[] => {
  const byId = new Map(currentTags.map((tag) => [tag.id, tag]));
  nextTags.forEach((tag) => byId.set(tag.id, tag));
  return sortByName(Array.from(byId.values()));
};

export const replaceTagEverywhere = (assignments: TagAssignmentMap, tag: Tag): TagAssignmentMap =>
  Object.fromEntries(
    Object.entries(assignments).map(([key, assignedTags]) => [
      key,
      assignedTags.map((assignedTag) => (assignedTag.id === tag.id ? tag : assignedTag))
    ])
  );

export const removeTagEverywhere = (assignments: TagAssignmentMap, tagId: string): TagAssignmentMap =>
  Object.fromEntries(
    Object.entries(assignments).map(([key, assignedTags]) => [
      key,
      assignedTags.filter((tag) => tag.id !== tagId)
    ])
  );

export const addEntityLinkAssignment = (
  assignments: EntityLinkAssignmentMap,
  sourceType: EntityLinkTargetType,
  sourceId: string,
  link: EntityLink
): EntityLinkAssignmentMap => {
  const key = entityLinkAssignmentKey(sourceType, sourceId);
  const current = assignments[key] ?? [];
  const withoutSame = current.filter((currentLink) =>
    currentLink.id !== link.id && entityLinkIdentityKey(currentLink) !== entityLinkIdentityKey(link)
  );

  return { ...assignments, [key]: [...withoutSame, link] };
};

export const replaceEntityLinkEverywhere = (assignments: EntityLinkAssignmentMap, link: EntityLink): EntityLinkAssignmentMap =>
  Object.fromEntries(
    Object.entries(assignments).map(([key, links]) => [
      key,
      links.map((currentLink) => (currentLink.id === link.id ? link : currentLink))
    ])
  );

export const removeEntityLinkEverywhere = (assignments: EntityLinkAssignmentMap, linkId: string): EntityLinkAssignmentMap =>
  Object.fromEntries(
    Object.entries(assignments).map(([key, links]) => [
      key,
      links.filter((link) => link.id !== linkId)
    ])
  );

export const upsertPublication = (publications: PublishedContent[], publication: PublishedContent): PublishedContent[] =>
  upsertById(publications, publication);

export const upsertPublicationAssignment = (
  assignments: PublicationAssignmentMap,
  publication: PublishedContent
): PublicationAssignmentMap => ({
  ...assignments,
  [publicationAssignmentKey(publication.contentType, publication.contentId)]: publication
});

export const removePublicationAssignment = (
  assignments: PublicationAssignmentMap,
  publicationId: string
): PublicationAssignmentMap =>
  Object.fromEntries(
    Object.entries(assignments).filter(([, publication]) => publication?.id !== publicationId)
  );

export const syncCampaignScenarioLinks = (
  scenarios: Scenario[],
  campaignId: string,
  nextScenarioIds: string[]
): Scenario[] =>
  scenarios.map((scenario) => {
    const shouldAttach = nextScenarioIds.includes(scenario.id);
    if (shouldAttach) return { ...scenario, campaignId };
    if (scenario.campaignId === campaignId && !shouldAttach) return { ...scenario, campaignId: undefined };
    return scenario;
  });

export const syncCampaignMapLinks = (
  maps: MapData[],
  campaignId: string,
  nextMapIds: string[]
): MapData[] =>
  maps.map((map) => {
    const shouldAttach = nextMapIds.includes(map.id);
    if (shouldAttach) return { ...map, campaignId };
    if (map.campaignId === campaignId && !shouldAttach) return { ...map, campaignId: null };
    return map;
  });

export const syncCampaignCharacterLinks = (
  characters: Character[],
  campaignId: string,
  nextCharacterIds: string[]
): Character[] =>
  characters.map((character) => {
    const shouldAttach = nextCharacterIds.includes(character.id);
    if (shouldAttach) return { ...character, campaignId };
    if (character.campaignId === campaignId && !shouldAttach) return { ...character, campaignId: null };
    return character;
  });

export const upsertCampaign = (campaigns: Campaign[], campaign: Campaign, existingId?: string): Campaign[] => {
  if (existingId) {
    return replaceById(campaigns, campaign.id, campaign);
  }

  return [...campaigns, campaign];
};

export const removeScenarioFromCampaigns = (campaigns: Campaign[], scenarioId: string): Campaign[] =>
  campaigns.map((campaign) => ({
    ...campaign,
    scenarioIds: campaign.scenarioIds.filter((currentId) => currentId !== scenarioId)
  }));

export const clearScenarioFromMaps = (maps: MapData[], scenarioId: string): MapData[] =>
  maps.map((map) => (map.scenarioId === scenarioId ? { ...map, scenarioId: null } : map));

export const clearScenarioFromCharacters = (characters: Character[], scenarioId: string): Character[] =>
  characters.map((character) =>
    character.scenarioId === scenarioId ? { ...character, scenarioId: null } : character
  );

export const removeMapFromCampaigns = (campaigns: Campaign[], mapId: string): Campaign[] =>
  campaigns.map((campaign) => ({
    ...campaign,
    mapIds: campaign.mapIds.filter((currentId) => currentId !== mapId)
  }));

export const removeMapFromScenarios = (scenarios: Scenario[], mapId: string): Scenario[] =>
  scenarios.map((scenario) => ({
    ...scenario,
    relatedMapIds: (scenario.relatedMapIds ?? []).filter((currentId) => currentId !== mapId)
  }));

export const removeCharacterFromCampaigns = (campaigns: Campaign[], characterId: string): Campaign[] =>
  campaigns.map((campaign) => ({
    ...campaign,
    characterIds: campaign.characterIds.filter((currentId) => currentId !== characterId)
  }));

export const removeCharacterFromScenarios = (scenarios: Scenario[], characterId: string): Scenario[] =>
  scenarios.map((scenario) => ({
    ...scenario,
    relatedCharacterIds: (scenario.relatedCharacterIds ?? []).filter((currentId) => currentId !== characterId)
  }));

export const removeItemFromCharacters = (characters: Character[], itemId: string): Character[] =>
  characters.map((character) => ({
    ...character,
    inventory: character.inventory.filter((currentId) => currentId !== itemId)
  }));

export const removeItemFromScenarios = (scenarios: Scenario[], itemId: string): Scenario[] =>
  scenarios.map((scenario) => ({
    ...scenario,
    relatedItemIds: (scenario.relatedItemIds ?? []).filter((currentId) => currentId !== itemId)
  }));

export const clearCampaignFromScenarios = (scenarios: Scenario[], campaignId: string): Scenario[] =>
  scenarios.map((scenario) =>
    scenario.campaignId === campaignId ? { ...scenario, campaignId: undefined } : scenario
  );

export const clearCampaignFromMaps = (maps: MapData[], campaignId: string): MapData[] =>
  maps.map((map) => (map.campaignId === campaignId ? { ...map, campaignId: null } : map));

export const clearCampaignFromCharacters = (characters: Character[], campaignId: string): Character[] =>
  characters.map((character) =>
    character.campaignId === campaignId ? { ...character, campaignId: null } : character
  );

export const appendSortedCharacterGroup = (groups: CharacterGroup[], group: CharacterGroup): CharacterGroup[] =>
  sortByOrderThenName([...groups, group]);

export const appendSortedItemGroup = (groups: ItemGroup[], group: ItemGroup): ItemGroup[] =>
  sortByOrderThenName([...groups, group]);
