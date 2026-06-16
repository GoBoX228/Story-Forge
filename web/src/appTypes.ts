export type AppView =
  | 'dashboard'
  | 'campaigns'
  | 'scenarios'
  | 'maps'
  | 'characters'
  | 'items'
  | 'assets'
  | 'world'
  | 'profile'
  | 'settings'
  | 'guide'
  | 'admin';

export interface WorldEditorTarget {
  type: 'location' | 'faction' | 'event';
  id: string;
}
