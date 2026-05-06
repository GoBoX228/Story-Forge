import {
  Asset,
  AssetUsageRole,
  EntityLink,
  EntityLinkCreatePayload,
  EntityLinkRelationType
} from '../types';

export const ASSET_USAGE_RELATION: EntityLinkRelationType = 'uses';

export const ASSET_USAGE_LABELS: Record<AssetUsageRole, string> = {
  portrait: 'Портрет',
  token: 'Токен',
  item_image: 'Изображение предмета',
  map_background: 'Фон карты',
  map_token: 'Токен карты'
};

export const getAssetUsageRole = (link: EntityLink): AssetUsageRole | null => {
  const role = link.metadata?.role;
  if (
    role === 'portrait' ||
    role === 'token' ||
    role === 'item_image' ||
    role === 'map_background' ||
    role === 'map_token'
  ) {
    return role;
  }

  return null;
};

export const isAssetUsageLink = (link: EntityLink, role?: AssetUsageRole): boolean =>
  link.targetType === 'asset' &&
  link.relationType === ASSET_USAGE_RELATION &&
  (role ? getAssetUsageRole(link) === role : getAssetUsageRole(link) !== null);

export const findAssetUsageLink = (links: EntityLink[], role: AssetUsageRole): EntityLink | undefined =>
  links.find((link) => isAssetUsageLink(link, role));

export const findAssetForUsage = (
  links: EntityLink[],
  assets: Asset[],
  role: AssetUsageRole
): Asset | undefined => {
  const link = findAssetUsageLink(links, role);
  return link ? assets.find((asset) => asset.id === link.targetId) : undefined;
};

export const buildAssetUsagePayload = (
  assetId: string,
  role: AssetUsageRole,
  label?: string | null
): EntityLinkCreatePayload => ({
  targetType: 'asset',
  targetId: assetId,
  relationType: ASSET_USAGE_RELATION,
  label: label ?? ASSET_USAGE_LABELS[role],
  metadata: { role }
});

export const entityLinkIdentityKey = (link: EntityLink): string => {
  const role = link.targetType === 'asset' ? getAssetUsageRole(link) ?? '' : '';
  return [
    link.sourceType,
    link.sourceId,
    link.targetType,
    link.targetId,
    link.relationType,
    role
  ].join(':');
};

