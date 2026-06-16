import {
  ScenarioNode,
  ScenarioTransitionCondition,
  ScenarioTransitionMetadata,
  ScenarioTransitionType,
  ScenarioTransition
} from '../../../types';
import type { GraphValidationResult } from '../graphValidation';
import type { NodeLayoutUpdate } from '../graphCanvasUtils';

export type GraphLayoutDirection = 'horizontal' | 'vertical';

export interface TransitionUpdatePayload {
  type: ScenarioTransitionType;
  label: string;
  condition: ScenarioTransitionCondition;
  metadata?: ScenarioTransitionMetadata;
}

export interface GraphCanvasProps {
  nodes: ScenarioNode[];
  transitions: ScenarioTransition[];
  activeNodeId: string | null;
  activeTransitionId: string | null;
  validation?: GraphValidationResult;
  disabled?: boolean;
  onSelectNode: (nodeId: string) => void;
  onSelectTransition: (transitionId: string | null) => void;
  onClearSelection: () => void;
  onMoveNode: (
    nodeId: string,
    position: Record<string, unknown>,
    previousPosition?: Record<string, unknown>
  ) => void | Promise<void>;
  onLayoutNodes: (updates: NodeLayoutUpdate[]) => void | Promise<void>;
  onCreateTransition: (fromNodeId: string, toNodeId: string) => void | Promise<void>;
  onUpdateTransition: (
    transitionId: string,
    payload: TransitionUpdatePayload
  ) => void | Promise<void>;
  onDeleteNode: (nodeId: string) => void | Promise<void>;
  onDeleteTransition: (transitionId: string) => void | Promise<void>;
  canUndoShortcut?: boolean;
  canRedoShortcut?: boolean;
  onUndoShortcut?: () => void | Promise<void>;
  onRedoShortcut?: () => void | Promise<void>;
}

export interface GraphCanvasHandle {
  runLayout: (direction: GraphLayoutDirection) => void;
  deleteSelected: () => void;
}
