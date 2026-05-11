import {
  Asset,
  AssetCollection,
  AssetCollectionAssignmentPayload,
  AssetCollectionCreatePayload,
  AssetCollectionTargetType,
  AssetCollectionUpdatePayload,
  AssetFolder,
  AssetFolderCreatePayload,
  AssetFolderUpdatePayload,
  AssetKind,
  AssetType,
  AssetUpdatePayload,
  AssetUploadPayload
} from '../types';
import { apiRequest } from './api';
import {
  mapAssetCollectionFromApi,
  mapAssetCollectionToApiPayload,
  mapAssetFolderFromApi,
  mapAssetFolderToApiPayload,
  mapAssetFromApi,
  mapAssetToApiPayload
} from './mappers';

export const listAssets = async (
  filters: { type?: AssetType | 'all'; kind?: AssetKind | 'all'; folderId?: string | null; collectionId?: string | null; search?: string } = {}
): Promise<Asset[]> => {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== 'all') {
    params.set('type', filters.type);
  }
  if (filters.kind && filters.kind !== 'all') {
    params.set('kind', filters.kind);
  }
  if (filters.folderId !== undefined && filters.folderId !== null) {
    params.set('folderId', filters.folderId);
  }
  if (filters.collectionId) {
    params.set('collectionId', filters.collectionId);
  }
  if (filters.search) {
    params.set('search', filters.search);
  }

  const query = params.toString();
  const response = await apiRequest<unknown[]>(`/assets${query ? `?${query}` : ''}`);
  return response.map(mapAssetFromApi);
};

export const uploadAsset = async (payload: AssetUploadPayload): Promise<Asset> => {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.name) formData.append('name', payload.name);
  if (payload.type) formData.append('type', payload.type);
  if (payload.kind) formData.append('kind', payload.kind);
  if (payload.folderId !== undefined && payload.folderId !== null) formData.append('folder_id', payload.folderId);
  payload.collectionIds?.forEach((collectionId) => formData.append('collection_ids[]', collectionId));

  const response = await apiRequest('/assets', {
    method: 'POST',
    body: formData
  });

  return mapAssetFromApi(response);
};

export const updateAsset = async (assetId: string, payload: AssetUpdatePayload): Promise<Asset> => {
  const response = await apiRequest(`/assets/${assetId}`, {
    method: 'PATCH',
    body: JSON.stringify(mapAssetToApiPayload(payload))
  });

  return mapAssetFromApi(response);
};

export const deleteAsset = async (assetId: string): Promise<void> => {
  await apiRequest(`/assets/${assetId}`, { method: 'DELETE' });
};

export const listAssetFolders = async (): Promise<AssetFolder[]> => {
  const response = await apiRequest<unknown[]>('/asset-folders');
  return response.map(mapAssetFolderFromApi);
};

export const createAssetFolder = async (payload: AssetFolderCreatePayload): Promise<AssetFolder> => {
  const response = await apiRequest('/asset-folders', {
    method: 'POST',
    body: JSON.stringify(mapAssetFolderToApiPayload(payload))
  });

  return mapAssetFolderFromApi(response);
};

export const updateAssetFolder = async (
  id: string,
  payload: AssetFolderUpdatePayload
): Promise<AssetFolder> => {
  const response = await apiRequest(`/asset-folders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapAssetFolderToApiPayload(payload))
  });

  return mapAssetFolderFromApi(response);
};

export const deleteAssetFolder = async (id: string): Promise<void> => {
  await apiRequest(`/asset-folders/${id}`, { method: 'DELETE' });
};

export const listAssetCollections = async (): Promise<AssetCollection[]> => {
  const response = await apiRequest<unknown[]>('/asset-collections');
  return response.map(mapAssetCollectionFromApi);
};

export const createAssetCollection = async (payload: AssetCollectionCreatePayload): Promise<AssetCollection> => {
  const response = await apiRequest('/asset-collections', {
    method: 'POST',
    body: JSON.stringify(mapAssetCollectionToApiPayload(payload))
  });

  return mapAssetCollectionFromApi(response);
};

export const updateAssetCollection = async (
  id: string,
  payload: AssetCollectionUpdatePayload
): Promise<AssetCollection> => {
  const response = await apiRequest(`/asset-collections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapAssetCollectionToApiPayload(payload))
  });

  return mapAssetCollectionFromApi(response);
};

export const deleteAssetCollection = async (id: string): Promise<void> => {
  await apiRequest(`/asset-collections/${id}`, { method: 'DELETE' });
};

export const listTargetAssetCollections = async (
  type: AssetCollectionTargetType,
  id: string
): Promise<AssetCollection[]> => {
  const response = await apiRequest<unknown[]>(`/asset-collection-targets/${type}/${id}/collections`);
  return response.map(mapAssetCollectionFromApi);
};

export const replaceTargetAssetCollections = async (
  type: AssetCollectionTargetType,
  id: string,
  payload: AssetCollectionAssignmentPayload
): Promise<AssetCollection[]> => {
  const response = await apiRequest<unknown[]>(`/asset-collection-targets/${type}/${id}/collections`, {
    method: 'PUT',
    body: JSON.stringify({ collection_ids: payload.collectionIds })
  });

  return response.map(mapAssetCollectionFromApi);
};
