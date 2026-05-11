import { CharacterGroup, CharacterGroupPayload, ItemGroup, ItemGroupPayload } from '../types';
import { apiRequest } from './api';
import {
  mapCharacterGroupFromApi,
  mapCharacterGroupToApiPayload,
  mapItemGroupFromApi,
  mapItemGroupToApiPayload
} from './mappers';

export const listCharacterGroups = async (): Promise<CharacterGroup[]> => {
  const response = await apiRequest<unknown[]>('/character-groups');
  return response.map(mapCharacterGroupFromApi);
};

export const createCharacterGroup = async (payload: CharacterGroupPayload = {}): Promise<CharacterGroup> => {
  const response = await apiRequest('/character-groups', {
    method: 'POST',
    body: JSON.stringify(mapCharacterGroupToApiPayload(payload))
  });

  return mapCharacterGroupFromApi(response);
};

export const updateCharacterGroup = async (
  id: string,
  payload: CharacterGroupPayload
): Promise<CharacterGroup> => {
  const response = await apiRequest(`/character-groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapCharacterGroupToApiPayload(payload))
  });

  return mapCharacterGroupFromApi(response);
};

export const deleteCharacterGroup = async (id: string): Promise<void> => {
  await apiRequest(`/character-groups/${id}`, { method: 'DELETE' });
};

export const listItemGroups = async (): Promise<ItemGroup[]> => {
  const response = await apiRequest<unknown[]>('/item-groups');
  return response.map(mapItemGroupFromApi);
};

export const createItemGroup = async (payload: ItemGroupPayload = {}): Promise<ItemGroup> => {
  const response = await apiRequest('/item-groups', {
    method: 'POST',
    body: JSON.stringify(mapItemGroupToApiPayload(payload))
  });

  return mapItemGroupFromApi(response);
};

export const updateItemGroup = async (
  id: string,
  payload: ItemGroupPayload
): Promise<ItemGroup> => {
  const response = await apiRequest(`/item-groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapItemGroupToApiPayload(payload))
  });

  return mapItemGroupFromApi(response);
};

export const deleteItemGroup = async (id: string): Promise<void> => {
  await apiRequest(`/item-groups/${id}`, { method: 'DELETE' });
};
