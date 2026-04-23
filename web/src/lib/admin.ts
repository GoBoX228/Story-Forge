import {
  AdminAuditLogItem,
  AdminBroadcastItem,
  AdminContentItem,
  AdminOverview,
  AdminReportItem,
  AdminUserItem,
  UserRole,
  UserStatus
} from '../types';
import { apiRequest } from './api';

export interface AdminUserUpdatePayload {
  role?: UserRole;
  status?: UserStatus;
}

export interface AdminReportUpdatePayload {
  status?: 'open' | 'resolved' | 'dismissed';
  ban_target_user?: boolean;
}

export interface AdminContentQuery {
  type?: 'scenario' | 'map' | 'character' | 'item' | 'campaign' | '';
  search?: string;
}

const buildQuery = (params: Record<string, string | undefined>): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value.length > 0) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

export const getAdminOverview = async (): Promise<AdminOverview> => {
  return apiRequest<AdminOverview>('/admin/overview');
};

export const getAdminUsers = async (search = ''): Promise<AdminUserItem[]> => {
  return apiRequest<AdminUserItem[]>(`/admin/users${buildQuery({ search })}`);
};

export const updateAdminUser = async (id: string | number, payload: AdminUserUpdatePayload): Promise<AdminUserItem> => {
  return apiRequest<AdminUserItem>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

export const getAdminReports = async (status = '', search = ''): Promise<AdminReportItem[]> => {
  return apiRequest<AdminReportItem[]>(`/admin/reports${buildQuery({ status, search })}`);
};

export const updateAdminReport = async (
  id: string | number,
  payload: AdminReportUpdatePayload
): Promise<AdminReportItem> => {
  return apiRequest<AdminReportItem>(`/admin/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

export const getAdminContent = async (query: AdminContentQuery = {}): Promise<AdminContentItem[]> => {
  return apiRequest<AdminContentItem[]>(
    `/admin/content${buildQuery({ type: query.type ?? '', search: query.search ?? '' })}`
  );
};

export const deleteAdminContent = async (
  type: AdminContentItem['type'],
  id: number | string
): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>(`/admin/content/${type}/${id}`, { method: 'DELETE' });
};

export const getAdminBroadcasts = async (): Promise<AdminBroadcastItem[]> => {
  return apiRequest<AdminBroadcastItem[]>('/admin/broadcasts');
};

export const createAdminBroadcast = async (payload: {
  type: 'info' | 'warning' | 'critical';
  message: string;
}): Promise<AdminBroadcastItem> => {
  return apiRequest<AdminBroadcastItem>('/admin/broadcasts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const getAdminLogs = async (): Promise<AdminAuditLogItem[]> => {
  return apiRequest<AdminAuditLogItem[]>('/admin/logs');
};
