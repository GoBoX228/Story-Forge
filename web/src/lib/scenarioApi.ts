import {
  ScenarioNode,
  ScenarioNodeCreatePayload,
  ScenarioNodeEntityLink,
  ScenarioNodeEntityLinkCreatePayload,
  ScenarioNodeUpdatePayload,
  ScenarioTransition,
  ScenarioTransitionCreatePayload,
  ScenarioTransitionUpdatePayload
} from '../types';
import { API_BASE_URL, apiRequest, getAccessToken } from './api';
import {
  mapScenarioNodeFromApi,
  mapScenarioNodeEntityLinkFromApi,
  mapScenarioNodeEntityLinkToApiPayload,
  mapScenarioNodeToApiPayload,
  mapScenarioTransitionFromApi,
  mapScenarioTransitionToApiPayload
} from './mappers';

export const listScenarioNodes = async (scenarioId: string): Promise<ScenarioNode[]> => {
  const response = await apiRequest<unknown[]>(`/scenarios/${scenarioId}/nodes`);
  return response.map(mapScenarioNodeFromApi);
};

export const createScenarioNode = async (
  scenarioId: string,
  payload: ScenarioNodeCreatePayload
): Promise<ScenarioNode> => {
  const response = await apiRequest(`/scenarios/${scenarioId}/nodes`, {
    method: 'POST',
    body: JSON.stringify(mapScenarioNodeToApiPayload(payload))
  });

  return mapScenarioNodeFromApi(response);
};

export const updateScenarioNode = async (
  nodeId: string,
  payload: ScenarioNodeUpdatePayload
): Promise<ScenarioNode> => {
  const response = await apiRequest(`/scenario-nodes/${nodeId}`, {
    method: 'PATCH',
    body: JSON.stringify(mapScenarioNodeToApiPayload(payload))
  });

  return mapScenarioNodeFromApi(response);
};

export const deleteScenarioNode = async (nodeId: string): Promise<void> => {
  await apiRequest(`/scenario-nodes/${nodeId}`, { method: 'DELETE' });
};

export const listScenarioNodeEntityLinks = async (nodeId: string): Promise<ScenarioNodeEntityLink[]> => {
  const response = await apiRequest<unknown[]>(`/scenario-nodes/${nodeId}/entity-links`);
  return response.map(mapScenarioNodeEntityLinkFromApi);
};

export const createScenarioNodeEntityLink = async (
  nodeId: string,
  payload: ScenarioNodeEntityLinkCreatePayload
): Promise<ScenarioNodeEntityLink> => {
  const response = await apiRequest(`/scenario-nodes/${nodeId}/entity-links`, {
    method: 'POST',
    body: JSON.stringify(mapScenarioNodeEntityLinkToApiPayload(payload))
  });

  return mapScenarioNodeEntityLinkFromApi(response);
};

export const deleteScenarioNodeEntityLink = async (linkId: string): Promise<void> => {
  await apiRequest(`/scenario-node-entity-links/${linkId}`, { method: 'DELETE' });
};

export const listScenarioTransitions = async (scenarioId: string): Promise<ScenarioTransition[]> => {
  const response = await apiRequest<unknown[]>(`/scenarios/${scenarioId}/transitions`);
  return response.map(mapScenarioTransitionFromApi);
};

export const createScenarioTransition = async (
  scenarioId: string,
  payload: ScenarioTransitionCreatePayload
): Promise<ScenarioTransition> => {
  const response = await apiRequest(`/scenarios/${scenarioId}/transitions`, {
    method: 'POST',
    body: JSON.stringify(mapScenarioTransitionToApiPayload(payload))
  });

  return mapScenarioTransitionFromApi(response);
};

export const updateScenarioTransition = async (
  transitionId: string,
  payload: ScenarioTransitionUpdatePayload
): Promise<ScenarioTransition> => {
  const response = await apiRequest(`/scenario-transitions/${transitionId}`, {
    method: 'PATCH',
    body: JSON.stringify(mapScenarioTransitionToApiPayload(payload))
  });

  return mapScenarioTransitionFromApi(response);
};

export const deleteScenarioTransition = async (transitionId: string): Promise<void> => {
  await apiRequest(`/scenario-transitions/${transitionId}`, { method: 'DELETE' });
};

export const exportScenarioPdf = async (scenarioId: string): Promise<Blob | null> => {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/scenarios/${scenarioId}/export/pdf`, {
    method: 'POST',
    headers: {
      Accept: 'application/pdf',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include'
  });

  if (!response.ok) {
    return null;
  }

  return response.blob();
};
