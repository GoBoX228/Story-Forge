import React from 'react';
import { GitBranch, Move, Plus } from 'lucide-react';
import { ScenarioNode, ScenarioTransition } from '../../../types';
import { GraphValidationResult } from '../graphValidation';
import { getNodeTypeLabel } from '../GraphNodeList';
import {
  fallbackBounds,
  HANDLE_SIDES,
  type HandleSide,
  type NodeBounds
} from '../graphCanvasUtils';
import { HANDLE_CLASS_BY_SIDE, NODE_TYPE_STYLES } from './graphCanvasStyles';

interface GraphNodesLayerProps {
  nodes: ScenarioNode[];
  transitions: ScenarioTransition[];
  boundsById: Map<string, NodeBounds>;
  nodeTitleById: Map<string, string>;
  activeNodeId: string | null;
  highlightedSourceNodeId: string | null;
  highlightedTargetNodeId: string | null;
  dragEdgeTargetNodeId: string | null;
  dragNodeId: string | null;
  validation?: GraphValidationResult;
  disabled?: boolean;
  onSelectNode: (nodeId: string) => void;
  onNodePointerDown: (event: React.PointerEvent<HTMLDivElement>, node: ScenarioNode) => void;
  onNodePointerMove: (event: React.PointerEvent<HTMLDivElement>, node: ScenarioNode) => void;
  onNodePointerUp: (event: React.PointerEvent<HTMLDivElement>, node: ScenarioNode) => void | Promise<void>;
  onNodePointerCancel: (event: React.PointerEvent<HTMLDivElement>, node: ScenarioNode) => void;
  onEdgePointerDown: (event: React.PointerEvent<HTMLButtonElement>, node: ScenarioNode, side: HandleSide) => void;
  onEdgePointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onEdgePointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void | Promise<void>;
  onEdgePointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onResizePointerDown: (event: React.PointerEvent<HTMLButtonElement>, node: ScenarioNode) => void;
  onResizePointerMove: (event: React.PointerEvent<HTMLButtonElement>, node: ScenarioNode) => void;
  onResizePointerUp: (event: React.PointerEvent<HTMLButtonElement>, node: ScenarioNode) => void | Promise<void>;
  onResizePointerCancel: (event: React.PointerEvent<HTMLButtonElement>, node: ScenarioNode) => void;
}

export const GraphNodesLayer: React.FC<GraphNodesLayerProps> = ({
  nodes,
  transitions,
  boundsById,
  nodeTitleById,
  activeNodeId,
  highlightedSourceNodeId,
  highlightedTargetNodeId,
  dragEdgeTargetNodeId,
  dragNodeId,
  validation,
  disabled,
  onSelectNode,
  onNodePointerDown,
  onNodePointerMove,
  onNodePointerUp,
  onNodePointerCancel,
  onEdgePointerDown,
  onEdgePointerMove,
  onEdgePointerUp,
  onEdgePointerCancel,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
  onResizePointerCancel
}) => (
  <>
    {nodes.map((node, index) => {
      const bounds = boundsById.get(node.id) ?? fallbackBounds(index, node);
      const outgoingCount = transitions.filter((transition) => transition.fromNodeId === node.id).length;
      const incomingCount = transitions.filter((transition) => transition.toNodeId === node.id).length;
      const isActive = activeNodeId === node.id;
      const isDragEdgeTarget = dragEdgeTargetNodeId === node.id;
      const isHighlightedSource = highlightedSourceNodeId === node.id;
      const isHighlightedTarget = highlightedTargetNodeId === node.id;
      const nodeIssues = validation?.nodeIssues[node.id] ?? [];
      const hasNodeError = nodeIssues.some((issue) => issue.severity === 'error');
      const hasNodeWarning = nodeIssues.some((issue) => issue.severity === 'warning');
      const nodeIssueColor = hasNodeError ? 'var(--col-red)' : hasNodeWarning ? 'var(--col-yellow)' : null;
      const nodeStyle = NODE_TYPE_STYLES[node.type];
      const showHandles = !disabled && isActive;
      const contentPreviewHeight = Math.max(0, bounds.height - 88);
      const showContentPreview = Boolean(node.content) && contentPreviewHeight >= 24;

      return (
        <div
          key={node.id}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onPointerDown={(event) => onNodePointerDown(event, node)}
          onPointerMove={(event) => onNodePointerMove(event, node)}
          onPointerUp={(event) => {
            void onNodePointerUp(event, node);
          }}
          onPointerCancel={(event) => onNodePointerCancel(event, node)}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelectNode(node.id);
            }
          }}
          className={`absolute text-left border-2 bg-[var(--bg-surface)] shadow-lg transition-colors select-none ${dragNodeId === node.id ? 'cursor-grabbing' : 'cursor-grab'} disabled:cursor-default disabled:opacity-70`}
          style={{
            left: bounds.x,
            top: bounds.y,
            width: bounds.width,
            height: bounds.height,
            touchAction: 'none',
            borderColor: isActive || isDragEdgeTarget ? 'var(--col-red)' : nodeIssueColor ?? nodeStyle.accent,
            boxShadow: isDragEdgeTarget
              ? '0 0 0 3px color-mix(in srgb, var(--col-red) 35%, transparent)'
              : isHighlightedSource
                ? '0 0 0 3px color-mix(in srgb, var(--col-yellow) 28%, transparent)'
                : isHighlightedTarget
                  ? '0 0 0 3px color-mix(in srgb, var(--col-teal) 28%, transparent)'
                  : nodeIssueColor
                    ? `0 0 0 2px color-mix(in srgb, ${nodeIssueColor} 35%, transparent)`
                    : undefined
          }}
        >
          {nodeIssueColor && !isActive && (
            <div
              className="absolute -top-2 -right-2 h-5 min-w-5 px-1 inline-flex items-center justify-center border bg-[var(--bg-main)] mono text-[8px] font-black"
              style={{ borderColor: nodeIssueColor, color: nodeIssueColor }}
            >
              {hasNodeError ? 'E' : '!'}
            </div>
          )}
          <div className="h-full p-3 flex flex-col gap-2">
            <div className="min-w-0 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="mono text-[8px] uppercase text-[var(--text-muted)]">
                  {getNodeTypeLabel(node.type)}
                </span>
                <Move size={12} className="shrink-0" style={{ color: nodeStyle.accent }} />
              </div>
              <div className="mono text-[10px] uppercase font-black text-[var(--text-main)] truncate mt-2">
                {nodeTitleById.get(node.id)}
              </div>
            </div>
            {showContentPreview && (
              <div
                className="min-h-0 overflow-hidden mono text-[8px] leading-4 text-[var(--text-muted)]"
                style={{ maxHeight: contentPreviewHeight }}
              >
                {node.content}
              </div>
            )}
            <div className="mt-auto flex items-center justify-between gap-2 mono text-[8px] uppercase text-[var(--text-muted)]">
              <span>#{node.orderIndex + 1}</span>
              <span className="inline-flex items-center gap-1">
                <GitBranch size={10} /> {outgoingCount}/{incomingCount}
              </span>
            </div>
          </div>
          {showHandles && (
            <button
              type="button"
              disabled={disabled}
              onPointerDown={(event) => onEdgePointerDown(event, node, 'right')}
              onPointerMove={onEdgePointerMove}
              onPointerUp={(event) => {
                void onEdgePointerUp(event);
              }}
              onPointerCancel={onEdgePointerCancel}
              className="absolute -right-[9px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 inline-flex items-center justify-center border-2 border-[var(--col-red)] bg-[var(--bg-main)] text-[var(--col-red)] shadow-lg hover:bg-[var(--col-red)] hover:text-white disabled:opacity-40 disabled:hover:bg-[var(--bg-main)] disabled:hover:text-[var(--col-red)]"
              title="Создать переход"
            >
              <Plus size={11} />
            </button>
          )}
          {showHandles && HANDLE_SIDES.filter((side) => side !== 'right').map((side) => (
            <button
              key={side}
              type="button"
              disabled={disabled}
              onPointerDown={(event) => onEdgePointerDown(event, node, side)}
              onPointerMove={onEdgePointerMove}
              onPointerUp={(event) => {
                void onEdgePointerUp(event);
              }}
              onPointerCancel={onEdgePointerCancel}
              className={`absolute ${HANDLE_CLASS_BY_SIDE[side]} h-[18px] w-[18px] inline-flex items-center justify-center border-2 border-[var(--col-red)] bg-[var(--bg-main)] text-[var(--col-red)] shadow-lg hover:bg-[var(--col-red)] hover:text-white disabled:opacity-40 disabled:hover:bg-[var(--bg-main)] disabled:hover:text-[var(--col-red)]`}
              title="Создать переход"
            >
              <Plus size={11} />
            </button>
          ))}
          {showHandles && (
            <button
              type="button"
              disabled={disabled}
              onPointerDown={(event) => onResizePointerDown(event, node)}
              onPointerMove={(event) => onResizePointerMove(event, node)}
              onPointerUp={(event) => {
                void onResizePointerUp(event, node);
              }}
              onPointerCancel={(event) => onResizePointerCancel(event, node)}
              className="absolute -bottom-1.5 -right-1.5 h-4 w-4 border-2 border-[var(--col-red)] bg-[var(--bg-main)] disabled:opacity-40 cursor-nwse-resize"
              title="Изменить размер узла"
            >
              <span className="block h-full w-full bg-[linear-gradient(135deg,transparent_0_45%,var(--col-red)_45%_55%,transparent_55%)]" />
            </button>
          )}
        </div>
      );
    })}
  </>
);
