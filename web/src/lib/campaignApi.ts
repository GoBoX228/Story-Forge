import { Campaign, CampaignExportJob, CampaignExportOptions, CampaignPayload } from '../types';
import { API_BASE_URL, apiRequest, refreshAccessToken } from './api';
import { mapCampaignFromApi, mapCampaignToApiPayload } from './mappers';

export const createCampaign = async (payload: CampaignPayload): Promise<Campaign> => {
  const response = await apiRequest('/campaigns', {
    method: 'POST',
    body: JSON.stringify(mapCampaignToApiPayload(payload))
  });

  return mapCampaignFromApi(response);
};

export const updateCampaign = async (id: string, payload: CampaignPayload): Promise<Campaign> => {
  const response = await apiRequest(`/campaigns/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(mapCampaignToApiPayload(payload))
  });

  return mapCampaignFromApi(response);
};

export const deleteCampaign = async (id: string): Promise<void> => {
  await apiRequest(`/campaigns/${id}`, { method: 'DELETE' });
};

export const queueCampaignExport = async (
  id: string,
  options: CampaignExportOptions
): Promise<CampaignExportJob> =>
  apiRequest(`/campaigns/${id}/export/zip`, {
    method: 'POST',
    body: JSON.stringify({
      map_page_size: options.mapPageSize,
      map_orientation: options.mapOrientation,
      duplex_edge: options.duplexEdge
    })
  });

export const getCampaignExportJob = async (id: string): Promise<CampaignExportJob> =>
  apiRequest(`/export-jobs/${id}`);

export const downloadCampaignExport = async (
  job: CampaignExportJob,
  retryOnAuth = true
): Promise<Blob | null> => {
  if (!job.download_url) return null;

  const response = await fetch(`${API_BASE_URL}/api${job.download_url}`, {
    method: 'GET',
    headers: { Accept: 'application/zip' },
    credentials: 'include'
  });

  if (response.status === 401 && retryOnAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return downloadCampaignExport(job, false);
  }

  return response.ok ? response.blob() : null;
};
