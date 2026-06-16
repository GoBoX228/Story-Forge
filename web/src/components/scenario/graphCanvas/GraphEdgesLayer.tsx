import React from 'react';
import { ScenarioTransition } from '../../../types';
import { GraphValidationResult } from '../graphValidation';
import {
  edgeArrowPoints,
  edgeCurve,
  oppositeSide,
  transitionWaypoints,
  type BoardSize,
  type HandleSide,
  type NodePosition,
  type VisualEdge
} from '../graphCanvasUtils';
import { EDGE_COLORS, TRANSITION_TYPE_SHORT_LABELS } from './graphCanvasStyles';

interface EdgeDragPreviewState {
  sourceSide: HandleSide;
  start: NodePosition;
  current: NodePosition;
}

interface ActiveWaypointState {
  transitionId: string;
  waypointIndex: number;
}

interface GraphEdgesLayerProps {
  boardSize: BoardSize;
  transitions: ScenarioTransition[];
  visualEdges: Map<string, VisualEdge>;
  activeNodeId: string | null;
  activeTransitionId: string | null;
  activeWaypoint: ActiveWaypointState | null;
  hoveredTransitionId: string | null;
  editingLabelTransitionId: string | null;
  editingLabelValue: string;
  inlineLabelInputRef: React.RefObject<HTMLInputElement | null>;
  localWaypointOverrides: Record<string, NodePosition[]>;
  edgeDragState: EdgeDragPreviewState | null;
  validation?: GraphValidationResult;
  disabled?: boolean;
  onTransitionPointerEnter: (transitionId: string) => void;
  onTransitionPointerLeave: (transitionId: string) => void;
  onTransitionSelect: (transitionId: string) => void;
  onTransitionLabelEdit: (transition: ScenarioTransition) => void;
  onAddWaypoint: (
    event: React.MouseEvent<SVGPathElement>,
    transition: ScenarioTransition,
    visualEdge: VisualEdge
  ) => void | Promise<void>;
  onInlineLabelValueChange: (value: string) => void;
  onInlineLabelCommit: () => void | Promise<void>;
  onInlineLabelCancel: () => void;
  onWaypointPointerDown: (
    event: React.PointerEvent<SVGCircleElement>,
    transition: ScenarioTransition,
    waypointIndex: number
  ) => void;
  onWaypointPointerMove: (event: React.PointerEvent<SVGCircleElement>) => void;
  onWaypointPointerUp: (
    event: React.PointerEvent<SVGCircleElement>,
    transition: ScenarioTransition
  ) => void | Promise<void>;
  onWaypointPointerCancel: (event: React.PointerEvent<SVGCircleElement>) => void;
  onWaypointSelect: (transitionId: string, waypointIndex: number) => void;
}

export const GraphEdgesLayer: React.FC<GraphEdgesLayerProps> = ({
  boardSize,
  transitions,
  visualEdges,
  activeNodeId,
  activeTransitionId,
  activeWaypoint,
  hoveredTransitionId,
  editingLabelTransitionId,
  editingLabelValue,
  inlineLabelInputRef,
  localWaypointOverrides,
  edgeDragState,
  validation,
  disabled,
  onTransitionPointerEnter,
  onTransitionPointerLeave,
  onTransitionSelect,
  onTransitionLabelEdit,
  onAddWaypoint,
  onInlineLabelValueChange,
  onInlineLabelCommit,
  onInlineLabelCancel,
  onWaypointPointerDown,
  onWaypointPointerMove,
  onWaypointPointerUp,
  onWaypointPointerCancel,
  onWaypointSelect
}) => (
  <svg className="absolute inset-0" width={boardSize.width} height={boardSize.height}>
    <defs>
      {Object.entries(EDGE_COLORS).map(([type, color]) => (
        <marker
          key={type}
          id={`graph-arrow-${type}`}
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="2.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,5 L7,2.5 z" fill={color} />
        </marker>
      ))}
      <marker
        id="graph-arrow-preview"
        markerWidth="7"
        markerHeight="7"
        refX="6"
        refY="2.5"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,5 L7,2.5 z" fill="var(--col-red)" />
      </marker>
    </defs>

    {transitions.map((transition) => {
      const visualEdge = visualEdges.get(transition.id);
      if (!visualEdge) return null;

      const color = EDGE_COLORS[transition.type] ?? EDGE_COLORS.linear;
      const isSelected = activeTransitionId === transition.id;
      const isHovered = hoveredTransitionId === transition.id;
      const isSourceActive = activeNodeId === transition.fromNodeId;
      const isEditingLabel = editingLabelTransitionId === transition.id;
      const transitionIssues = validation?.transitionIssues[transition.id] ?? [];
      const hasTransitionError = transitionIssues.some((issue) => issue.severity === 'error');
      const hasTransitionWarning = transitionIssues.some((issue) => issue.severity === 'warning');
      const transitionIssueColor = hasTransitionError ? 'var(--col-red)' : hasTransitionWarning ? 'var(--col-yellow)' : null;
      const label = transition.label?.trim() ?? '';
      const displayLabel = isEditingLabel ? editingLabelValue.trim() : label;
      const showBadge = Boolean(label) || isSelected || isHovered || isEditingLabel || Boolean(transitionIssueColor);
      const badgeText = TRANSITION_TYPE_SHORT_LABELS[transition.type];
      const labelWidth = displayLabel
        ? Math.min(220, Math.max(86, displayLabel.length * 7 + 48))
        : isEditingLabel ? 150 : 42;
      const labelX = visualEdge.labelPosition.x - labelWidth / 2;
      const labelY = visualEdge.labelPosition.y - 10;

      return (
        <g key={transition.id}>
          <path
            d={visualEdge.path}
            fill="none"
            stroke="transparent"
            strokeWidth={20}
            className="cursor-pointer"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onPointerEnter={() => onTransitionPointerEnter(transition.id)}
            onPointerLeave={() => onTransitionPointerLeave(transition.id)}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onTransitionSelect(transition.id);
            }}
            onDoubleClick={(event) => {
              void onAddWaypoint(event, transition, visualEdge);
            }}
          />
          <path
            d={visualEdge.path}
            fill="none"
            stroke={transitionIssueColor && !isSelected && !isHovered ? transitionIssueColor : color}
            strokeWidth={isSelected ? 4.5 : isHovered ? 3.5 : isSourceActive ? 3 : 2}
            strokeOpacity={isSelected ? 1 : isHovered ? 0.95 : isSourceActive || transitionIssueColor ? 0.9 : 0.5}
            pointerEvents="none"
          />
          <polygon
            points={edgeArrowPoints(visualEdge.points, visualEdge.end)}
            fill={transitionIssueColor && !isSelected && !isHovered ? transitionIssueColor : color}
            opacity={isSelected ? 1 : isHovered ? 0.95 : isSourceActive || transitionIssueColor ? 0.9 : 0.72}
            pointerEvents="none"
          />
          {showBadge && !isEditingLabel && (
            <g
              className={disabled ? undefined : 'cursor-text'}
              pointerEvents={disabled ? 'none' : 'all'}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onTransitionSelect(transition.id);
              }}
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onTransitionLabelEdit(transition);
              }}
            >
              <rect
                x={labelX}
                y={labelY}
                width={labelWidth}
                height={20}
                fill="var(--bg-main)"
                stroke={transitionIssueColor && !isSelected && !isHovered ? transitionIssueColor : isSelected || isHovered ? color : 'var(--border-color)'}
                strokeWidth={isSelected || isHovered ? 1.5 : 1}
              />
              <text
                x={labelX + 8}
                y={labelY + 13}
                className="mono text-[8px] uppercase font-black"
                fill={transitionIssueColor && !isSelected && !isHovered ? transitionIssueColor : color}
              >
                {badgeText}
              </text>
              {label && (
                <text
                  x={labelX + 42}
                  y={labelY + 13}
                  className="mono text-[9px] uppercase"
                  fill="var(--text-muted)"
                >
                  {label}
                </text>
              )}
            </g>
          )}
          {isEditingLabel && (
            <foreignObject
              x={labelX}
              y={labelY}
              width={labelWidth}
              height={24}
            >
              <input
                ref={inlineLabelInputRef}
                value={editingLabelValue}
                disabled={disabled}
                onChange={(event) => onInlineLabelValueChange(event.target.value)}
                onBlur={() => {
                  void onInlineLabelCommit();
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void onInlineLabelCommit();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    onInlineLabelCancel();
                  }
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                className="h-6 w-full bg-[var(--bg-main)] border-2 border-[var(--col-red)] px-2 mono text-[9px] uppercase font-black text-[var(--text-main)] focus:outline-none"
                style={{ pointerEvents: 'auto' }}
              />
            </foreignObject>
          )}
          {isSelected && (localWaypointOverrides[transition.id] ?? transitionWaypoints(transition)).map((waypoint, waypointIndex) => {
            const isActiveWaypoint = activeWaypoint?.transitionId === transition.id && activeWaypoint.waypointIndex === waypointIndex;

            return (
              <circle
                key={`${transition.id}-waypoint-${waypointIndex}`}
                cx={waypoint.x}
                cy={waypoint.y}
                r={isActiveWaypoint ? 6 : 5}
                fill="var(--bg-main)"
                stroke="var(--col-red)"
                strokeWidth={isActiveWaypoint ? 2.5 : 2}
                className={disabled ? undefined : 'cursor-move'}
                pointerEvents={disabled ? 'none' : 'all'}
                onPointerDown={(event) => onWaypointPointerDown(event, transition, waypointIndex)}
                onPointerMove={onWaypointPointerMove}
                onPointerUp={(event) => {
                  void onWaypointPointerUp(event, transition);
                }}
                onPointerCancel={onWaypointPointerCancel}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onWaypointSelect(transition.id, waypointIndex);
                }}
              />
            );
          })}
        </g>
      );
    })}

    {edgeDragState && (
      <path
        d={edgeCurve(edgeDragState.start, edgeDragState.sourceSide, edgeDragState.current, oppositeSide(edgeDragState.sourceSide))}
        fill="none"
        stroke="var(--col-red)"
        strokeWidth={3}
        strokeDasharray="8 6"
        strokeOpacity={0.9}
        markerEnd="url(#graph-arrow-preview)"
      />
    )}
  </svg>
);
