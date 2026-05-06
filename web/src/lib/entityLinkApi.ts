import {
  EntityLink,
  EntityLinkCreatePayload,
  EntityLinkTargetType,
  EntityLinkUpdatePayload
} from '../types';
import { apiRequest } from './api';
import { mapEntityLinkFromApi, mapEntityLinkToApiPayload } from './mappers';

export const listEntityLinks = async (
  sourceType: EntityLinkTargetType,
  sourceId: string
): Promise<EntityLink[]> => {
  const response = await apiRequest<unknown[]>(`/entity-links/${sourceType}/${sourceId}`);
  return response.map(mapEntityLinkFromApi);
};

export const createEntityLink = async (
  sourceType: EntityLinkTargetType,
  sourceId: string,
  payload: EntityLinkCreatePayload
): Promise<EntityLink> => {
  const response = await apiRequest<unknown>(`/entity-links/${sourceType}/${sourceId}`, {
    method: 'POST',
    body: JSON.stringify(mapEntityLinkToApiPayload(payload))
  });

  return mapEntityLinkFromApi(response);
};

export const updateEntityLink = async (
  id: string,
  payload: EntityLinkUpdatePayload
): Promise<EntityLink> => {
  const response = await apiRequest<unknown>(`/entity-links/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapEntityLinkToApiPayload(payload))
  });

  return mapEntityLinkFromApi(response);
};

export const deleteEntityLink = async (id: string): Promise<void> => {
  await apiRequest(`/entity-links/${id}`, { method: 'DELETE' });
};
