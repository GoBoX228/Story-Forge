import { UserProfile } from '../types';

export const mapUserProfile = (response: any): UserProfile => ({
  id: String(response.id),
  name: response.name ?? '',
  email: response.email ?? '',
  role: response.role ?? 'user',
  status: response.status ?? 'active',
  twoFactorEnabled: Boolean(response.two_factor_enabled ?? false),
  twoFactorEnabledAt: response.two_factor_enabled_at ?? null,
  avatarUrl: response.avatar_url ?? null,
  bannerUrl: response.banner_url ?? null,
  bio: response.bio ?? null,
});
