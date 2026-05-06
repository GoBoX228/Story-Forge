import {
  Faction,
  WorldEntityPayload,
  WorldEntityUpdatePayload,
  WorldEvent,
  WorldEventPayload,
  WorldEventUpdatePayload,
  WorldLocation
} from '../types';
import { apiRequest } from './api';
import {
  mapFactionFromApi,
  mapWorldEntityToApiPayload,
  mapWorldEventFromApi,
  mapWorldEventToApiPayload,
  mapWorldLocationFromApi
} from './mappers';

interface WorldListFilters {
  campaignId?: string | null;
  search?: string;
}

const buildQuery = (filters: WorldListFilters = {}): string => {
  const params = new URLSearchParams();
  if (filters.campaignId) params.set('campaignId', filters.campaignId);
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const listLocations = async (filters: WorldListFilters = {}): Promise<WorldLocation[]> => {
  const response = await apiRequest<unknown[]>(`/locations${buildQuery(filters)}`);
  return response.map(mapWorldLocationFromApi);
};

export const createLocation = async (payload: WorldEntityPayload): Promise<WorldLocation> => {
  const response = await apiRequest('/locations', {
    method: 'POST',
    body: JSON.stringify(mapWorldEntityToApiPayload(payload))
  });

  return mapWorldLocationFromApi(response);
};

export const updateLocation = async (id: string, payload: WorldEntityUpdatePayload): Promise<WorldLocation> => {
  const response = await apiRequest(`/locations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapWorldEntityToApiPayload(payload))
  });

  return mapWorldLocationFromApi(response);
};

export const deleteLocation = async (id: string): Promise<void> => {
  await apiRequest(`/locations/${id}`, { method: 'DELETE' });
};

export const listFactions = async (filters: WorldListFilters = {}): Promise<Faction[]> => {
  const response = await apiRequest<unknown[]>(`/factions${buildQuery(filters)}`);
  return response.map(mapFactionFromApi);
};

export const createFaction = async (payload: WorldEntityPayload): Promise<Faction> => {
  const response = await apiRequest('/factions', {
    method: 'POST',
    body: JSON.stringify(mapWorldEntityToApiPayload(payload))
  });

  return mapFactionFromApi(response);
};

export const updateFaction = async (id: string, payload: WorldEntityUpdatePayload): Promise<Faction> => {
  const response = await apiRequest(`/factions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapWorldEntityToApiPayload(payload))
  });

  return mapFactionFromApi(response);
};

export const deleteFaction = async (id: string): Promise<void> => {
  await apiRequest(`/factions/${id}`, { method: 'DELETE' });
};

export const listWorldEvents = async (filters: WorldListFilters = {}): Promise<WorldEvent[]> => {
  const response = await apiRequest<unknown[]>(`/events${buildQuery(filters)}`);
  return response.map(mapWorldEventFromApi);
};

export const createWorldEvent = async (payload: WorldEventPayload): Promise<WorldEvent> => {
  const response = await apiRequest('/events', {
    method: 'POST',
    body: JSON.stringify(mapWorldEventToApiPayload(payload))
  });

  return mapWorldEventFromApi(response);
};

export const updateWorldEvent = async (id: string, payload: WorldEventUpdatePayload): Promise<WorldEvent> => {
  const response = await apiRequest(`/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapWorldEventToApiPayload(payload))
  });

  return mapWorldEventFromApi(response);
};

export const deleteWorldEvent = async (id: string): Promise<void> => {
  await apiRequest(`/events/${id}`, { method: 'DELETE' });
};
