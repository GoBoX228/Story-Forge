import type { SystemTile } from '../types';
import { apiRequest } from './api';

export const listSystemTiles = async (): Promise<SystemTile[]> => {
  const response = await apiRequest<any[]>('/system-tiles');

  return response.map((tile) => ({
    id: String(tile.id),
    slug: String(tile.slug),
    name: String(tile.name),
    category: tile.category === 'wall' ? 'wall' : 'floor',
    color: String(tile.color ?? '#9aa0a6'),
    url: String(tile.url),
    setName: String(tile.set_name ?? 'Основной набор'),
    readonly: true
  }));
};
