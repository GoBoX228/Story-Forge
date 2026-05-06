import {
  Tag,
  TagAssignmentPayload,
  TagCreatePayload,
  TaggableTargetType,
  TagUpdatePayload
} from '../types';
import { apiRequest } from './api';
import { mapTagAssignmentToApiPayload, mapTagFromApi, mapTagToApiPayload } from './mappers';

export const listTags = async (): Promise<Tag[]> => {
  const response = await apiRequest<unknown[]>('/tags');
  return response.map(mapTagFromApi);
};

export const createTag = async (payload: TagCreatePayload): Promise<Tag> => {
  const response = await apiRequest('/tags', {
    method: 'POST',
    body: JSON.stringify(mapTagToApiPayload(payload))
  });

  return mapTagFromApi(response);
};

export const updateTag = async (id: string, payload: TagUpdatePayload): Promise<Tag> => {
  const response = await apiRequest(`/tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapTagToApiPayload(payload))
  });

  return mapTagFromApi(response);
};

export const deleteTag = async (id: string): Promise<void> => {
  await apiRequest(`/tags/${id}`, { method: 'DELETE' });
};

export const listTargetTags = async (type: TaggableTargetType, id: string): Promise<Tag[]> => {
  const response = await apiRequest<unknown[]>(`/tag-targets/${type}/${id}/tags`);
  return response.map(mapTagFromApi);
};

export const replaceTargetTags = async (
  type: TaggableTargetType,
  id: string,
  payload: TagAssignmentPayload
): Promise<Tag[]> => {
  const response = await apiRequest<unknown[]>(`/tag-targets/${type}/${id}/tags`, {
    method: 'PUT',
    body: JSON.stringify(mapTagAssignmentToApiPayload(payload))
  });

  return response.map(mapTagFromApi);
};
