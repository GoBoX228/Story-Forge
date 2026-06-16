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
import { API_BASE_URL, apiRequest, refreshAccessToken, withCsrfHeader } from './api';
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
  const requestPdf = async (): Promise<Response> => {
    const headers = await withCsrfHeader({
      Accept: 'application/pdf'
    });

    return fetch(`${API_BASE_URL}/api/scenarios/${scenarioId}/export/pdf`, {
      method: 'POST',
      headers,
      credentials: 'include'
    });
  };

  let response = await requestPdf();

  if (response.status === 401 && await refreshAccessToken()) {
    response = await requestPdf();
  }

  if (!response.ok) {
    return null;
  }

  return response.blob();
};

export type ScenarioCharacterCardsDuplexEdge = 'long' | 'short';

export const exportScenarioCharacterCardsPdf = async (
  scenarioId: string,
  duplexEdge: ScenarioCharacterCardsDuplexEdge
): Promise<Blob | null> => {
  const requestPdf = async (): Promise<Response> => {
    const headers = await withCsrfHeader({
      Accept: 'application/pdf',
      'Content-Type': 'application/json'
    });

    return fetch(`${API_BASE_URL}/api/scenarios/${scenarioId}/export/characters/pdf`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ duplex_edge: duplexEdge })
    });
  };

  let response = await requestPdf();

  if (response.status === 401 && await refreshAccessToken()) {
    response = await requestPdf();
  }

  if (!response.ok) {
    return null;
  }

  return response.blob();
};

export const exportScenarioItemCardsPdf = async (
  scenarioId: string,
  duplexEdge: ScenarioCharacterCardsDuplexEdge
): Promise<Blob | null> => {
  const requestPdf = async (): Promise<Response> => {
    const headers = await withCsrfHeader({
      Accept: 'application/pdf',
      'Content-Type': 'application/json'
    });

    return fetch(`${API_BASE_URL}/api/scenarios/${scenarioId}/export/items/pdf`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ duplex_edge: duplexEdge })
    });
  };

  let response = await requestPdf();

  if (response.status === 401 && await refreshAccessToken()) {
    response = await requestPdf();
  }

  if (!response.ok) {
    return null;
  }

  return response.blob();
};
