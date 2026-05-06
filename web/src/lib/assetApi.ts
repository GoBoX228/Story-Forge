import { Asset, AssetType, AssetUpdatePayload, AssetUploadPayload } from '../types';
import { apiRequest } from './api';
import { mapAssetFromApi, mapAssetToApiPayload } from './mappers';

export const listAssets = async (filters: { type?: AssetType | 'all'; campaignId?: string | null } = {}): Promise<Asset[]> => {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== 'all') {
    params.set('type', filters.type);
  }
  if (filters.campaignId) {
    params.set('campaignId', filters.campaignId);
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
  if (payload.campaignId) formData.append('campaign_id', payload.campaignId);

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
