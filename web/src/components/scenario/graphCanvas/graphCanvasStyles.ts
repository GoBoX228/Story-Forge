import { ScenarioNodeType, ScenarioTransitionType } from '../../../types';
import { HandleSide } from '../graphCanvasUtils';

export const EDGE_COLORS: Record<ScenarioTransitionType, string> = {
  linear: 'var(--text-muted)',
  choice: 'var(--col-yellow)',
  success: 'var(--col-teal)',
  failure: 'var(--col-red)'
};

export const TRANSITION_TYPE_OPTIONS: { value: ScenarioTransitionType; label: string }[] = [
  { value: 'linear', label: 'ЛИНЕЙНЫЙ' },
  { value: 'choice', label: 'ВЫБОР' },
  { value: 'success', label: 'УСПЕХ' },
  { value: 'failure', label: 'ПРОВАЛ' }
];

export const TRANSITION_TYPE_SHORT_LABELS: Record<ScenarioTransitionType, string> = {
  linear: 'LIN',
  choice: 'CHO',
  success: 'SUC',
  failure: 'FAIL'
};

export const NODE_TYPE_STYLES: Record<ScenarioNodeType, { accent: string }> = {
  description: { accent: 'var(--text-muted)' },
  dialog: { accent: 'var(--col-blue)' },
  location: { accent: 'var(--col-teal)' },
  check: { accent: 'var(--col-yellow)' },
  loot: { accent: 'var(--col-purple)' },
  combat: { accent: 'var(--col-red)' }
};

export const HANDLE_CLASS_BY_SIDE: Record<HandleSide, string> = {
  top: 'left-1/2 -top-[9px] -translate-x-1/2',
  right: '-right-[9px] top-1/2 -translate-y-1/2',
  bottom: 'left-1/2 -bottom-[9px] -translate-x-1/2',
  left: '-left-[9px] top-1/2 -translate-y-1/2'
};
