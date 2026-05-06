import {
  PublishedContent,
  PublicationListParams,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload
} from '../types';
import { apiRequest } from './api';
import {
  mapPublicationListParamsToQuery,
  mapPublicationToApiPayload,
  mapPublishedContentFromApi
} from './mappers';

export const listPublications = async (params: PublicationListParams = {}): Promise<PublishedContent[]> => {
  const response = await apiRequest<unknown[]>(`/publications${mapPublicationListParamsToQuery(params)}`);
  return response.map(mapPublishedContentFromApi);
};

export const showPublication = async (slug: string): Promise<PublishedContent> => {
  const response = await apiRequest<unknown>(`/publications/${slug}`);
  return mapPublishedContentFromApi(response);
};

export const publishTarget = async (
  type: PublicationTargetType,
  id: string,
  payload: PublicationUpsertPayload
): Promise<PublishedContent> => {
  const response = await apiRequest<unknown>(`/publication-targets/${type}/${id}`, {
    method: 'POST',
    body: JSON.stringify(mapPublicationToApiPayload(payload))
  });

  return mapPublishedContentFromApi(response);
};

export const updatePublication = async (
  id: string,
  payload: PublicationUpdatePayload
): Promise<PublishedContent> => {
  const response = await apiRequest<unknown>(`/publications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapPublicationToApiPayload(payload))
  });

  return mapPublishedContentFromApi(response);
};

export const deletePublication = async (id: string): Promise<void> => {
  await apiRequest(`/publications/${id}`, { method: 'DELETE' });
};
