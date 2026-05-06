import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GitBranch, Maximize2, Minus, Move, Plus, Save, Trash2, X } from 'lucide-react';
import {
  ScenarioNode,
  ScenarioNodeType,
  ScenarioTransition,
  ScenarioTransitionCondition,
  ScenarioTransitionMetadata,
  ScenarioTransitionType
} from '../../types';
import { getNodeTypeLabel } from './GraphNodeList';
import { GraphValidationResult } from './graphValidation';

const DEFAULT_NODE_WIDTH = 190;
const DEFAULT_NODE_HEIGHT = 92;
const NODE_CONTENT_LINE_HEIGHT = 16;
const NODE_CONTENT_MAX_AUTO_LINES = 6;
const MIN_NODE_WIDTH = 180;
const MAX_NODE_WIDTH = 420;
const MIN_NODE_HEIGHT = 92;
const MAX_NODE_HEIGHT = 260;
const BOARD_WIDTH = 1800;
const BOARD_HEIGHT = 1100;
const MIN_SCALE = 0.35;
const MAX_SCALE = 1.75;
const FIT_PADDING = 80;
const LAYOUT_START_X = 96;
const LAYOUT_START_Y = 96;
const LAYOUT_LEVEL_GAP = 340;
const LAYOUT_NODE_GAP = 72;
const BOARD_PADDING = 240;
const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 140;
const MINIMAP_COMPACT_WIDTH = 160;
const MINIMAP_COMPACT_HEIGHT = 104;
const EDGE_PARALLEL_GAP = 18;
const EDGE_BIDIRECTIONAL_OFFSET = 14;
const EDGE_LABEL_OFFSET = 18;
const EDGE_OBSTACLE_PADDING = 28;
const EDGE_PORT_CLEARANCE = 42;
const EDGE_CORRIDOR_PADDING = 56;

const EDGE_COLORS: Record<ScenarioTransitionType, string> = {
  linear: 'var(--text-muted)',
  choice: 'var(--col-yellow)',
  success: 'var(--col-teal)',
  failure: 'var(--col-red)'
};

const TRANSITION_TYPE_OPTIONS: { value: ScenarioTransitionType; label: string }[] = [
  { value: 'linear', label: 'ЛИНЕЙНЫЙ' },
  { value: 'choice', label: 'ВЫБОР' },
  { value: 'success', label: 'УСПЕХ' },
  { value: 'failure', label: 'ПРОВАЛ' }
];

const TRANSITION_TYPE_SHORT_LABELS: Record<ScenarioTransitionType, string> = {
  linear: 'LIN',
  choice: 'CHO',
  success: 'SUC',
  failure: 'FAIL'
};

const NODE_TYPE_STYLES: Record<ScenarioNodeType, { accent: string }> = {
  description: { accent: 'var(--text-muted)' },
  dialog: { accent: 'var(--col-blue)' },
  location: { accent: 'var(--col-teal)' },
  check: { accent: 'var(--col-yellow)' },
  loot: { accent: 'var(--col-purple)' },
  combat: { accent: 'var(--col-red)' }
};

const INPUT_SIDES: HandleSide[] = ['left', 'top'];
const OUTPUT_SIDES: HandleSide[] = ['right', 'bottom'];

const HANDLE_CLASS_BY_SIDE: Record<HandleSide, string> = {
  top: 'left-1/2 -top-[9px] -translate-x-1/2',
  right: '-right-[9px] top-1/2 -translate-y-1/2',
  bottom: 'left-1/2 -bottom-[9px] -translate-x-1/2',
  left: '-left-[9px] top-1/2 -translate-y-1/2'
};

interface NodePosition {
  x: number;
  y: number;
}

interface NodeBounds extends NodePosition {
  width: number;
  height: number;
}

interface ObstacleRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface GraphBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

interface BoardSize {
  width: number;
  height: number;
}

interface ContainerSize {
  width: number;
  height: number;
}

interface NodeLayoutUpdate {
  nodeId: string;
  position: Record<string, unknown>;
}

type LayoutDirection = 'horizontal' | 'vertical';

type HandleSide = 'top' | 'right' | 'bottom' | 'left';

interface ViewportState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface DragState {
  nodeId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startBounds: NodeBounds;
  currentBounds: NodeBounds;
  moved: boolean;
}

interface ResizeState {
  nodeId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startBounds: NodeBounds;
  currentBounds: NodeBounds;
  moved: boolean;
}

interface PanState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startViewport: ViewportState;
}

interface EdgeDragState {
  sourceNodeId: string;
  pointerId: number;
  sourceSide: HandleSide;
  start: NodePosition;
  current: NodePosition;
  targetNodeId: string | null;
}

interface WaypointDragState {
  transitionId: string;
  waypointIndex: number;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startWaypoints: NodePosition[];
  currentWaypoints: NodePosition[];
  moved: boolean;
}

interface MinimapDragState {
  pointerId: number;
}

interface VisualEdge {
  transition: ScenarioTransition;
  from: NodeBounds;
  to: NodeBounds;
  fromSide: HandleSide;
  toSide: HandleSide;
  start: NodePosition;
  end: NodePosition;
  midPoint: NodePosition;
  labelPosition: NodePosition;
  path: string;
  points: NodePosition[];
  routePoints: NodePosition[];
  normal: NodePosition;
}

interface TransitionUpdatePayload {
  type: ScenarioTransitionType;
  label: string;
  condition: ScenarioTransitionCondition;
  metadata?: ScenarioTransitionMetadata;
}

interface GraphCanvasProps {
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
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void | Promise<void>;
  onRedo?: () => void | Promise<void>;
}

const toNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  );
};

const clampScale = (scale: number): number => Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

const clampNodeSize = (width: number, height: number): Pick<NodeBounds, 'width' | 'height'> => ({
  width: Math.max(MIN_NODE_WIDTH, Math.min(MAX_NODE_WIDTH, Math.round(width))),
  height: Math.max(MIN_NODE_HEIGHT, Math.min(MAX_NODE_HEIGHT, Math.round(height)))
});

const clampBounds = (bounds: NodeBounds): NodeBounds => {
  const size = clampNodeSize(bounds.width, bounds.height);

  return {
    x: Math.max(24, Math.round(bounds.x)),
    y: Math.max(24, Math.round(bounds.y)),
    ...size
  };
};

const stripNodeContent = (content?: string | null): string => (content ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const estimateContentHeight = (content: string, width: number): number => {
  if (!content) return 0;

  const usableWidth = Math.max(120, width - 24);
  const charsPerLine = Math.max(18, Math.floor(usableWidth / 7));
  const lines = Math.min(NODE_CONTENT_MAX_AUTO_LINES, Math.max(1, Math.ceil(content.length / charsPerLine)));

  return lines * NODE_CONTENT_LINE_HEIGHT + 8;
};

const estimateNodeBoundsSize = (node: ScenarioNode, source: Record<string, unknown>): Pick<NodeBounds, 'width' | 'height'> => {
  const width = toNumber(source?.width) ?? DEFAULT_NODE_WIDTH;
  const content = stripNodeContent(node.content);
  const autoContentHeight = estimateContentHeight(content, width);
  const height = toNumber(source?.height) ?? (autoContentHeight > 0 ? DEFAULT_NODE_HEIGHT + autoContentHeight : DEFAULT_NODE_HEIGHT);

  return clampNodeSize(width, height);
};

const fallbackBounds = (index: number, node?: ScenarioNode): NodeBounds => ({
  x: 80 + (index % 4) * 280,
  y: 80 + Math.floor(index / 4) * 180,
  ...(node ? estimateNodeBoundsSize(node, node.position as Record<string, unknown>) : {
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT
  })
});

const readNodeBounds = (node: ScenarioNode, index: number): NodeBounds => {
  const source = node.position as Record<string, unknown>;
  const x = toNumber(source?.x);
  const y = toNumber(source?.y);
  const size = estimateNodeBoundsSize(node, source);

  if (x === null || y === null) {
    return fallbackBounds(index, node);
  }

  return clampBounds({ x, y, ...size });
};

const buildPositionPayload = (node: ScenarioNode, bounds: NodeBounds): Record<string, unknown> => ({
  ...(node.position as Record<string, unknown>),
  x: bounds.x,
  y: bounds.y,
  width: bounds.width,
  height: bounds.height
});

const nodeCenter = (bounds: NodeBounds): NodePosition => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2
});

const sideAnchor = (bounds: NodeBounds, side: HandleSide): NodePosition => {
  if (side === 'top') return { x: bounds.x + bounds.width / 2, y: bounds.y };
  if (side === 'right') return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
  if (side === 'bottom') return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
  return { x: bounds.x, y: bounds.y + bounds.height / 2 };
};

const choosePortSides = (from: NodeBounds, to: NodeBounds): { fromSide: HandleSide; toSide: HandleSide } => {
  const fromCenter = nodeCenter(from);
  const toCenter = nodeCenter(to);
  const fromSide = toCenter.y > from.y + from.height ? OUTPUT_SIDES[1] : OUTPUT_SIDES[0];
  const toSide = fromCenter.y < to.y ? INPUT_SIDES[1] : INPUT_SIDES[0];

  return {
    fromSide,
    toSide
  };
};

const sideControlPoint = (anchor: NodePosition, side: HandleSide, distance: number): NodePosition => {
  if (side === 'top') return { x: anchor.x, y: anchor.y - distance };
  if (side === 'right') return { x: anchor.x + distance, y: anchor.y };
  if (side === 'bottom') return { x: anchor.x, y: anchor.y + distance };
  return { x: anchor.x - distance, y: anchor.y };
};

const sideTangent = (side: HandleSide): NodePosition =>
  side === 'top' || side === 'bottom'
    ? { x: 1, y: 0 }
    : { x: 0, y: 1 };

const sideDirection = (side: HandleSide): NodePosition => {
  if (side === 'top') return { x: 0, y: -1 };
  if (side === 'right') return { x: 1, y: 0 };
  if (side === 'bottom') return { x: 0, y: 1 };
  return { x: -1, y: 0 };
};

const edgeCurve = (from: NodePosition, fromSide: HandleSide, to: NodePosition, toSide: HandleSide): string => {
  const distance = Math.max(80, Math.min(220, Math.hypot(to.x - from.x, to.y - from.y) * 0.35));
  const controlA = sideControlPoint(from, fromSide, distance);
  const controlB = sideControlPoint(to, toSide, distance);
  return `M ${from.x} ${from.y} C ${controlA.x} ${controlA.y}, ${controlB.x} ${controlB.y}, ${to.x} ${to.y}`;
};

const previewTargetSide = (sourceSide: HandleSide): HandleSide =>
  sourceSide === 'bottom' ? 'top' : 'left';

const offsetPoint = (point: NodePosition, normal: NodePosition, distance: number): NodePosition => ({
  x: point.x + normal.x * distance,
  y: point.y + normal.y * distance
});

const roundPoint = (point: NodePosition): NodePosition => ({
  x: Math.round(point.x),
  y: Math.round(point.y)
});

const isFinitePoint = (point: unknown): point is NodePosition => {
  if (!point || typeof point !== 'object') return false;

  const source = point as Record<string, unknown>;
  return Number.isFinite(Number(source.x)) && Number.isFinite(Number(source.y));
};

const transitionWaypoints = (transition: ScenarioTransition): NodePosition[] =>
  (transition.metadata.visual?.waypoints ?? [])
    .filter(isFinitePoint)
    .map((point) => ({ x: Number(point.x), y: Number(point.y) }));

const transitionMetadataWithWaypoints = (
  transition: ScenarioTransition,
  waypoints: NodePosition[]
): ScenarioTransitionMetadata => {
  const cleanWaypoints = waypoints.map(roundPoint).slice(0, 12);

  if (cleanWaypoints.length === 0) {
    return {};
  }

  return {
    ...transition.metadata,
    visual: {
      ...(transition.metadata.visual ?? {}),
      waypoints: cleanWaypoints
    }
  };
};

const edgeNormal = (from: NodePosition, to: NodePosition): NodePosition => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);

  if (length === 0) return { x: 0, y: -1 };

  return {
    x: -dy / length,
    y: dx / length
  };
};

const distanceToSegment = (point: NodePosition, start: NodePosition, end: NodePosition): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  const projection = {
    x: start.x + t * dx,
    y: start.y + t * dy
  };

  return Math.hypot(point.x - projection.x, point.y - projection.y);
};

const insertWaypoint = (routePoints: NodePosition[], waypoints: NodePosition[], point: NodePosition): NodePosition[] => {
  if (routePoints.length < 2) return [...waypoints, roundPoint(point)].slice(0, 12);

  let closestSegmentIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < routePoints.length - 1; index += 1) {
    const distance = distanceToSegment(point, routePoints[index], routePoints[index + 1]);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestSegmentIndex = index;
    }
  }

  const next = [...waypoints];
  next.splice(closestSegmentIndex, 0, roundPoint(point));

  return next.slice(0, 12);
};

const routedPathMetrics = (points: NodePosition[]): { midPoint: NodePosition; normal: NodePosition } => {
  if (points.length === 0) {
    return { midPoint: { x: 0, y: 0 }, normal: { x: 0, y: -1 } };
  }

  if (points.length === 1) {
    return { midPoint: points[0], normal: { x: 0, y: -1 } };
  }

  const segments = points.slice(0, -1).map((point, index) => ({
    start: point,
    end: points[index + 1],
    length: Math.hypot(points[index + 1].x - point.x, points[index + 1].y - point.y)
  }));
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);

  if (totalLength === 0) {
    return { midPoint: points[0], normal: { x: 0, y: -1 } };
  }

  let cursor = 0;
  const target = totalLength / 2;
  for (const segment of segments) {
    if (cursor + segment.length >= target) {
      const t = segment.length === 0 ? 0 : (target - cursor) / segment.length;
      const midPoint = {
        x: segment.start.x + (segment.end.x - segment.start.x) * t,
        y: segment.start.y + (segment.end.y - segment.start.y) * t
      };

      return {
        midPoint,
        normal: edgeNormal(segment.start, segment.end)
      };
    }

    cursor += segment.length;
  }

  const lastSegment = segments[segments.length - 1];
  return {
    midPoint: lastSegment.end,
    normal: edgeNormal(lastSegment.start, lastSegment.end)
  };
};

const inflateBounds = (bounds: NodeBounds, padding: number): ObstacleRect => ({
  minX: bounds.x - padding,
  minY: bounds.y - padding,
  maxX: bounds.x + bounds.width + padding,
  maxY: bounds.y + bounds.height + padding
});

const pointInsideRect = (point: NodePosition, rect: ObstacleRect): boolean =>
  point.x >= rect.minX && point.x <= rect.maxX && point.y >= rect.minY && point.y <= rect.maxY;

const segmentOrientation = (a: NodePosition, b: NodePosition, c: NodePosition): number =>
  (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);

const pointOnSegment = (a: NodePosition, b: NodePosition, c: NodePosition): boolean =>
  Math.min(a.x, c.x) <= b.x &&
  b.x <= Math.max(a.x, c.x) &&
  Math.min(a.y, c.y) <= b.y &&
  b.y <= Math.max(a.y, c.y);

const segmentsIntersect = (a: NodePosition, b: NodePosition, c: NodePosition, d: NodePosition): boolean => {
  const orientationA = segmentOrientation(a, b, c);
  const orientationB = segmentOrientation(a, b, d);
  const orientationC = segmentOrientation(c, d, a);
  const orientationD = segmentOrientation(c, d, b);

  if (orientationA === 0 && pointOnSegment(a, c, b)) return true;
  if (orientationB === 0 && pointOnSegment(a, d, b)) return true;
  if (orientationC === 0 && pointOnSegment(c, a, d)) return true;
  if (orientationD === 0 && pointOnSegment(c, b, d)) return true;

  return (orientationA > 0) !== (orientationB > 0) && (orientationC > 0) !== (orientationD > 0);
};

const segmentIntersectsRect = (start: NodePosition, end: NodePosition, rect: ObstacleRect): boolean => {
  if (pointInsideRect(start, rect) || pointInsideRect(end, rect)) return true;

  const topLeft = { x: rect.minX, y: rect.minY };
  const topRight = { x: rect.maxX, y: rect.minY };
  const bottomRight = { x: rect.maxX, y: rect.maxY };
  const bottomLeft = { x: rect.minX, y: rect.maxY };

  return (
    segmentsIntersect(start, end, topLeft, topRight) ||
    segmentsIntersect(start, end, topRight, bottomRight) ||
    segmentsIntersect(start, end, bottomRight, bottomLeft) ||
    segmentsIntersect(start, end, bottomLeft, topLeft)
  );
};

const routeIntersections = (points: NodePosition[], obstacles: ObstacleRect[]): number => {
  let intersections = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    for (const obstacle of obstacles) {
      if (segmentIntersectsRect(points[index], points[index + 1], obstacle)) {
        intersections += 1;
      }
    }
  }

  return intersections;
};

const routeLength = (points: NodePosition[]): number =>
  points.slice(0, -1).reduce((sum, point, index) => {
    const next = points[index + 1];
    return sum + Math.hypot(next.x - point.x, next.y - point.y);
  }, 0);

const routeBends = (points: NodePosition[]): number => {
  let bends = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const a = { x: current.x - previous.x, y: current.y - previous.y };
    const b = { x: next.x - current.x, y: next.y - current.y };

    if (Math.abs(a.x * b.y - a.y * b.x) > 0.01) {
      bends += 1;
    }
  }

  return bends;
};

const compactRoutePoints = (points: NodePosition[]): NodePosition[] => {
  const compacted: NodePosition[] = [];

  for (const point of points) {
    const rounded = roundPoint(point);
    const previous = compacted[compacted.length - 1];
    if (!previous || previous.x !== rounded.x || previous.y !== rounded.y) {
      compacted.push(rounded);
    }
  }

  return compacted.filter((point, index, source) => {
    if (index === 0 || index === source.length - 1) return true;

    const previous = source[index - 1];
    const next = source[index + 1];
    const sameX = previous.x === point.x && point.x === next.x;
    const sameY = previous.y === point.y && point.y === next.y;

    return !sameX && !sameY;
  });
};

const uniqueSortedCorridors = (values: number[], center: number): number[] =>
  [...new Set(values.map(Math.round).filter(Number.isFinite))]
    .sort((a, b) => Math.abs(a - center) - Math.abs(b - center))
    .slice(0, 8);

const obstacleAwareEdgeRoute = (
  start: NodePosition,
  fromSide: HandleSide,
  end: NodePosition,
  toSide: HandleSide,
  obstacles: ObstacleRect[]
): { path: string; points: NodePosition[]; midPoint: NodePosition; normal: NodePosition } => {
  if (obstacles.length === 0) {
    return directEdgeRoute(start, fromSide, end, toSide);
  }

  const fromDirection = sideDirection(fromSide);
  const toDirection = sideDirection(toSide);
  const exit = {
    x: start.x + fromDirection.x * EDGE_PORT_CLEARANCE,
    y: start.y + fromDirection.y * EDGE_PORT_CLEARANCE
  };
  const entry = {
    x: end.x + toDirection.x * EDGE_PORT_CLEARANCE,
    y: end.y + toDirection.y * EDGE_PORT_CLEARANCE
  };
  const midX = (exit.x + entry.x) / 2;
  const midY = (exit.y + entry.y) / 2;
  const xCorridors = uniqueSortedCorridors([
    midX,
    exit.x,
    entry.x,
    ...obstacles.flatMap((rect) => [rect.minX - EDGE_CORRIDOR_PADDING, rect.maxX + EDGE_CORRIDOR_PADDING])
  ], midX);
  const yCorridors = uniqueSortedCorridors([
    midY,
    exit.y,
    entry.y,
    ...obstacles.flatMap((rect) => [rect.minY - EDGE_CORRIDOR_PADDING, rect.maxY + EDGE_CORRIDOR_PADDING])
  ], midY);
  const candidates: NodePosition[][] = [
    [start, end],
    [start, exit, entry, end],
    [start, exit, { x: entry.x, y: exit.y }, entry, end],
    [start, exit, { x: exit.x, y: entry.y }, entry, end]
  ];

  for (const x of xCorridors) {
    candidates.push([start, exit, { x, y: exit.y }, { x, y: entry.y }, entry, end]);
  }

  for (const y of yCorridors) {
    candidates.push([start, exit, { x: exit.x, y }, { x: entry.x, y }, entry, end]);
  }

  xCorridors.slice(0, 4).forEach((x) => {
    yCorridors.slice(0, 4).forEach((y) => {
      candidates.push([start, exit, { x, y: exit.y }, { x, y }, { x: entry.x, y }, entry, end]);
    });
  });

  const scored = candidates
    .map(compactRoutePoints)
    .map((points) => ({
      points,
      intersections: routeIntersections(points, obstacles),
      bends: routeBends(points),
      length: routeLength(points)
    }))
    .sort((a, b) =>
      a.intersections - b.intersections ||
      a.bends - b.bends ||
      a.length - b.length
    );

  const best = scored[0];
  if (!best || best.intersections > 0) {
    return directEdgeRoute(start, fromSide, end, toSide);
  }

  const metrics = routedPathMetrics(best.points);

  return {
    path: smoothPathThroughPoints(best.points),
    points: best.points,
    midPoint: metrics.midPoint,
    normal: metrics.normal
  };
};

const directEdgeRoute = (
  start: NodePosition,
  fromSide: HandleSide,
  end: NodePosition,
  toSide: HandleSide
): { path: string; points: NodePosition[]; midPoint: NodePosition; normal: NodePosition } => {
  const distance = Math.max(60, Math.min(180, Math.hypot(end.x - start.x, end.y - start.y) * 0.3));
  const controlA = sideControlPoint(start, fromSide, distance);
  const controlB = sideControlPoint(end, toSide, distance);
  const midPoint = {
    x: (start.x + 3 * controlA.x + 3 * controlB.x + end.x) / 8,
    y: (start.y + 3 * controlA.y + 3 * controlB.y + end.y) / 8
  };

  return {
    path: `M ${start.x} ${start.y} C ${controlA.x} ${controlA.y}, ${controlB.x} ${controlB.y}, ${end.x} ${end.y}`,
    points: [start, end],
    midPoint,
    normal: edgeNormal(start, end)
  };
};

const catmullRomControlPoints = (
  previous: NodePosition,
  current: NodePosition,
  next: NodePosition,
  after: NodePosition
): { controlA: NodePosition; controlB: NodePosition } => ({
  controlA: {
    x: current.x + (next.x - previous.x) / 6,
    y: current.y + (next.y - previous.y) / 6
  },
  controlB: {
    x: next.x - (after.x - current.x) / 6,
    y: next.y - (after.y - current.y) / 6
  }
});

const smoothPathThroughPoints = (points: NodePosition[]): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  const commands = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const after = points[Math.min(points.length - 1, index + 2)];
    const { controlA, controlB } = catmullRomControlPoints(previous, current, next, after);

    commands.push(`C ${controlA.x} ${controlA.y}, ${controlB.x} ${controlB.y}, ${next.x} ${next.y}`);
  }

  return commands.join(' ');
};

const waypointEdgeRoute = (
  start: NodePosition,
  waypoints: NodePosition[],
  end: NodePosition
): { path: string; points: NodePosition[]; midPoint: NodePosition; normal: NodePosition } => {
  const points = [start, ...waypoints, end];
  const metrics = routedPathMetrics(points);

  return {
    path: smoothPathThroughPoints(points),
    points,
    midPoint: metrics.midPoint,
    normal: metrics.normal
  };
};

const sortedTransitions = (items: ScenarioTransition[]): ScenarioTransition[] =>
  [...items].sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id));

const nodeOrderCompare = (a: ScenarioNode, b: ScenarioNode): number =>
  a.orderIndex - b.orderIndex || a.id.localeCompare(b.id);

const transitionLayoutBias = (type: ScenarioTransitionType): number => {
  if (type === 'success') return -1;
  if (type === 'failure') return 1;
  if (type === 'choice') return 0.25;
  return 0;
};

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const transitionPairKey = (fromNodeId: string, toNodeId: string): string =>
  [fromNodeId, toNodeId].sort().join('::');

const directedTransitionKey = (fromNodeId: string, toNodeId: string): string =>
  `${fromNodeId}->${toNodeId}`;

const buildVisualEdges = (
  transitions: ScenarioTransition[],
  boundsById: Map<string, NodeBounds>,
  waypointOverrides: Record<string, NodePosition[]>
): Map<string, VisualEdge> => {
  const directedGroups = new Map<string, ScenarioTransition[]>();
  const pairDirections = new Map<string, Set<string>>();

  transitions.forEach((transition) => {
    if (!boundsById.has(transition.fromNodeId) || !boundsById.has(transition.toNodeId)) return;

    const directedKey = directedTransitionKey(transition.fromNodeId, transition.toNodeId);
    const pairKey = transitionPairKey(transition.fromNodeId, transition.toNodeId);
    directedGroups.set(directedKey, [...(directedGroups.get(directedKey) ?? []), transition]);
    pairDirections.set(pairKey, new Set([...(pairDirections.get(pairKey) ?? []), directedKey]));
  });

  const visualEdges = new Map<string, VisualEdge>();

  directedGroups.forEach((group, directedKey) => {
    const ordered = sortedTransitions(group);
    const [fromNodeId, toNodeId] = directedKey.split('->');
    const hasReverse = (pairDirections.get(transitionPairKey(fromNodeId, toNodeId))?.size ?? 0) > 1;

    ordered.forEach((transition, index) => {
      const from = boundsById.get(transition.fromNodeId);
      const to = boundsById.get(transition.toNodeId);
      if (!from || !to) return;

      const { fromSide, toSide } = choosePortSides(from, to);
      const baseStart = sideAnchor(from, fromSide);
      const baseEnd = sideAnchor(to, toSide);
      const centeredOffset = (index - (ordered.length - 1) / 2) * EDGE_PARALLEL_GAP;
      const reverseOffset = hasReverse
        ? (fromNodeId.localeCompare(toNodeId) <= 0 ? 1 : -1) * EDGE_BIDIRECTIONAL_OFFSET
        : 0;
      const offsetDistance = centeredOffset + reverseOffset;
      const start = offsetPoint(baseStart, sideTangent(fromSide), offsetDistance);
      const end = offsetPoint(baseEnd, sideTangent(toSide), offsetDistance);
      const waypoints = waypointOverrides[transition.id] ?? transitionWaypoints(transition);
      const obstacles = [...boundsById.entries()]
        .filter(([nodeId]) => nodeId !== transition.fromNodeId && nodeId !== transition.toNodeId)
        .map(([, bounds]) => inflateBounds(bounds, EDGE_OBSTACLE_PADDING));
      const route = waypoints.length > 0
        ? waypointEdgeRoute(start, waypoints, end)
        : obstacleAwareEdgeRoute(start, fromSide, end, toSide, obstacles);
      const labelPosition = offsetPoint(route.midPoint, route.normal, EDGE_LABEL_OFFSET);

      visualEdges.set(transition.id, {
        transition,
        from,
        to,
        fromSide,
        toSide,
        start,
        end,
        midPoint: route.midPoint,
        labelPosition,
        path: route.path,
        points: route.points,
        routePoints: waypoints.length > 0 ? [start, ...waypoints, end] : route.points,
        normal: route.normal
      });
    });
  });

  return visualEdges;
};

const boundsFromNodes = (bounds: Iterable<NodeBounds>): GraphBounds | null => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let count = 0;

  for (const item of bounds) {
    count += 1;
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.width);
    maxY = Math.max(maxY, item.y + item.height);
  }

  if (count === 0) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
};

interface EdgeQuickPanelProps {
  transition: ScenarioTransition;
  position: NodePosition;
  disabled: boolean;
  scale: number;
  hasWaypoints: boolean;
  onUpdate: (transitionId: string, payload: TransitionUpdatePayload) => void | Promise<void>;
  onDelete: (transitionId: string) => void | Promise<void>;
  onResetWaypoints: (transition: ScenarioTransition) => void | Promise<void>;
  onClose: () => void;
}

interface GraphMinimapProps {
  nodes: ScenarioNode[];
  boundsById: Map<string, NodeBounds>;
  boardSize: BoardSize;
  viewport: ViewportState;
  containerSize: ContainerSize;
  activeNodeId: string | null;
  disabled: boolean;
  onCenterViewport: (point: NodePosition) => void;
}

const GraphMinimap: React.FC<GraphMinimapProps> = ({
  nodes,
  boundsById,
  boardSize,
  viewport,
  containerSize,
  activeNodeId,
  disabled,
  onCenterViewport
}) => {
  const minimapRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<MinimapDragState | null>(null);
  const isCompact = boardSize.width < 1400;
  const width = isCompact ? MINIMAP_COMPACT_WIDTH : MINIMAP_WIDTH;
  const height = isCompact ? MINIMAP_COMPACT_HEIGHT : MINIMAP_HEIGHT;
  const scale = Math.min(width / boardSize.width, height / boardSize.height);
  const mapWidth = boardSize.width * scale;
  const mapHeight = boardSize.height * scale;
  const mapOffsetX = (width - mapWidth) / 2;
  const mapOffsetY = (height - mapHeight) / 2;
  const viewportWidth = containerSize.width / viewport.scale;
  const viewportHeight = containerSize.height / viewport.scale;
  const viewportX = -viewport.offsetX / viewport.scale;
  const viewportY = -viewport.offsetY / viewport.scale;

  const pointFromEvent = (event: React.PointerEvent<HTMLDivElement>): NodePosition | null => {
    const minimap = minimapRef.current;
    if (!minimap) return null;

    const rect = minimap.getBoundingClientRect();
    const x = (event.clientX - rect.left - mapOffsetX) / scale;
    const y = (event.clientY - rect.top - mapOffsetY) / scale;

    return {
      x: Math.max(0, Math.min(boardSize.width, x)),
      y: Math.max(0, Math.min(boardSize.height, y))
    };
  };

  const centerFromEvent = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = pointFromEvent(event);
    if (!point) return;
    onCenterViewport(point);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({ pointerId: event.pointerId });
    centerFromEvent(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    centerFromEvent(event);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragState(null);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragState(null);
  };

  return (
    <div
      ref={minimapRef}
      className="relative border border-[var(--border-color)] bg-[var(--bg-main)] cursor-crosshair"
      style={{ width, height, touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="absolute left-2 top-2 mono text-[7px] uppercase font-black text-[var(--text-muted)]">
        Карта
      </div>
      <svg className="absolute inset-0" width={width} height={height}>
        <rect
          x={mapOffsetX}
          y={mapOffsetY}
          width={mapWidth}
          height={mapHeight}
          fill="var(--bg-main)"
          stroke="var(--border-color)"
        />
        {nodes.map((node) => {
          const bounds = boundsById.get(node.id);
          if (!bounds) return null;

          const isActive = activeNodeId === node.id;
          const color = NODE_TYPE_STYLES[node.type].accent;

          return (
            <rect
              key={node.id}
              x={mapOffsetX + bounds.x * scale}
              y={mapOffsetY + bounds.y * scale}
              width={Math.max(3, bounds.width * scale)}
              height={Math.max(3, bounds.height * scale)}
              fill={isActive ? 'var(--col-red)' : color}
              stroke={isActive ? 'white' : 'transparent'}
              strokeWidth={isActive ? 1 : 0}
              opacity={isActive ? 1 : 0.75}
            />
          );
        })}
        {containerSize.width > 0 && containerSize.height > 0 && (
          <rect
            x={mapOffsetX + viewportX * scale}
            y={mapOffsetY + viewportY * scale}
            width={Math.max(8, viewportWidth * scale)}
            height={Math.max(8, viewportHeight * scale)}
            fill="rgba(239, 53, 69, 0.08)"
            stroke="var(--col-red)"
            strokeWidth={1.25}
          />
        )}
      </svg>
    </div>
  );
};

const EdgeQuickPanel: React.FC<EdgeQuickPanelProps> = ({
  transition,
  position,
  disabled,
  scale,
  hasWaypoints,
  onUpdate,
  onDelete,
  onResetWaypoints,
  onClose
}) => {
  const [type, setType] = useState<ScenarioTransitionType>(transition.type);
  const [label, setLabel] = useState(transition.label ?? '');

  useEffect(() => {
    setType(transition.type);
    setLabel(transition.label ?? '');
  }, [transition]);

  const handleSave = async () => {
    if (disabled) return;

    const condition = type === transition.type
      ? transition.condition
      : (type === 'success' || type === 'failure' ? { outcome: type } : {});

    await onUpdate(transition.id, {
      type,
      label,
      condition: condition as ScenarioTransitionCondition,
      metadata: transition.metadata
    });
  };

  return (
    <div
      className="absolute z-30 w-72 border-2 border-[var(--col-red)] bg-[var(--bg-surface)] shadow-2xl p-3 space-y-3"
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -115%) scale(${1 / scale})`,
        transformOrigin: '50% 100%'
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="mono text-[8px] uppercase font-black text-[var(--col-red)]">Переход</div>
          <div className="mono text-[9px] uppercase text-[var(--text-muted)]">Быстрое редактирование</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 inline-flex items-center justify-center border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--col-red)]"
          title="Закрыть"
        >
          <X size={13} />
        </button>
      </div>

      <div className="grid grid-cols-[120px_1fr] gap-2">
        <select
          value={type}
          onChange={(event) => setType(event.target.value as ScenarioTransitionType)}
          disabled={disabled}
          className="h-9 bg-[var(--bg-main)] border-2 border-[var(--border-color)] px-2 mono text-[8px] uppercase font-black text-[var(--text-main)] focus:border-[var(--col-red)] focus:outline-none"
        >
          {TRANSITION_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          disabled={disabled}
          placeholder="Метка"
          className="h-9 bg-[var(--bg-main)] border-2 border-[var(--border-color)] px-3 mono text-[9px] text-[var(--text-main)] focus:border-[var(--col-red)] focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled}
          className="h-9 inline-flex items-center justify-center gap-2 bg-[var(--col-red)] text-white mono text-[8px] uppercase font-black disabled:opacity-40"
        >
          <Save size={13} />
          Сохранить
        </button>
        <button
          type="button"
          onClick={() => onDelete(transition.id)}
          disabled={disabled}
          className="h-9 inline-flex items-center justify-center gap-2 border border-[var(--col-red)] text-[var(--col-red)] mono text-[8px] uppercase font-black hover:bg-[var(--col-red)] hover:text-white disabled:opacity-40"
        >
          <Trash2 size={13} />
          Удалить
        </button>
      </div>
      {hasWaypoints && (
        <button
          type="button"
          onClick={() => onResetWaypoints(transition)}
          disabled={disabled}
          className="h-8 w-full inline-flex items-center justify-center gap-2 border border-[var(--border-color)] text-[var(--text-muted)] mono text-[8px] uppercase font-black hover:border-[var(--col-red)] hover:text-[var(--col-red)] disabled:opacity-40"
        >
          РЎР±СЂРѕСЃРёС‚СЊ РјР°СЂС€СЂСѓС‚
        </button>
      )}
    </div>
  );
};

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  transitions,
  activeNodeId,
  activeTransitionId,
  validation,
  disabled = false,
  onSelectNode,
  onMoveNode,
  onLayoutNodes,
  onSelectTransition,
  onClearSelection,
  onCreateTransition,
  onUpdateTransition,
  onDeleteNode,
  onDeleteTransition,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fittedNodeSignatureRef = useRef('');
  const inlineLabelInputRef = useRef<HTMLInputElement | null>(null);
  const inlineLabelSavingRef = useRef(false);
  const [viewport, setViewport] = useState<ViewportState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [edgeDragState, setEdgeDragState] = useState<EdgeDragState | null>(null);
  const [waypointDragState, setWaypointDragState] = useState<WaypointDragState | null>(null);
  const [activeWaypoint, setActiveWaypoint] = useState<{ transitionId: string; waypointIndex: number } | null>(null);
  const [localBounds, setLocalBounds] = useState<Record<string, NodeBounds>>({});
  const [localWaypointOverrides, setLocalWaypointOverrides] = useState<Record<string, NodePosition[]>>({});
  const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 0, height: 0 });
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('horizontal');
  const [hoveredTransitionId, setHoveredTransitionId] = useState<string | null>(null);
  const [editingLabelTransitionId, setEditingLabelTransitionId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');

  useEffect(() => {
    if (dragState || resizeState) return;
    setLocalBounds({});
  }, [dragState, nodes, resizeState]);

  useEffect(() => {
    if (waypointDragState) return;
    setLocalWaypointOverrides({});
  }, [transitions, waypointDragState]);

  useEffect(() => {
    if (edgeDragState) return;
    containerRef.current?.focus({ preventScroll: true });
  }, [activeNodeId, activeTransitionId, edgeDragState]);

  useEffect(() => {
    if (hoveredTransitionId && !transitions.some((transition) => transition.id === hoveredTransitionId)) {
      setHoveredTransitionId(null);
    }
  }, [hoveredTransitionId, transitions]);

  useEffect(() => {
    if (
      activeWaypoint &&
      !transitions.some((transition) =>
        transition.id === activeWaypoint.transitionId &&
        activeWaypoint.waypointIndex < transitionWaypoints(transition).length
      )
    ) {
      setActiveWaypoint(null);
    }
  }, [activeWaypoint, transitions]);

  useEffect(() => {
    if (activeWaypoint && activeWaypoint.transitionId !== activeTransitionId) {
      setActiveWaypoint(null);
    }
  }, [activeTransitionId, activeWaypoint]);

  useEffect(() => {
    if (editingLabelTransitionId && !transitions.some((transition) => transition.id === editingLabelTransitionId)) {
      setEditingLabelTransitionId(null);
      setEditingLabelValue('');
    }
  }, [editingLabelTransitionId, transitions]);

  useEffect(() => {
    if (!editingLabelTransitionId) return;

    const frameId = window.requestAnimationFrame(() => {
      inlineLabelInputRef.current?.focus();
      inlineLabelInputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [editingLabelTransitionId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const boundsById = useMemo(() => {
    const map = new Map<string, NodeBounds>();
    nodes.forEach((node, index) => {
      map.set(node.id, localBounds[node.id] ?? readNodeBounds(node, index));
    });
    return map;
  }, [localBounds, nodes]);

  const nodeSignature = useMemo(() => nodes.map((node) => node.id).join('|'), [nodes]);

  const nodeTitleById = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach((node) => map.set(node.id, node.title || `Узел ${node.orderIndex + 1}`));
    return map;
  }, [nodes]);

  const visualEdges = useMemo(
    () => buildVisualEdges(transitions, boundsById, localWaypointOverrides),
    [boundsById, localWaypointOverrides, transitions]
  );

  const selectedTransition = useMemo(
    () => transitions.find((transition) => transition.id === activeTransitionId) ?? null,
    [activeTransitionId, transitions]
  );

  const highlightedTransition = useMemo(
    () => selectedTransition ?? transitions.find((transition) => transition.id === hoveredTransitionId) ?? null,
    [hoveredTransitionId, selectedTransition, transitions]
  );

  const graphBounds = useMemo(() => {
    if (nodes.length === 0) return null;
    return boundsFromNodes(nodes.map((node, index) => boundsById.get(node.id) ?? fallbackBounds(index, node)));
  }, [boundsById, nodes]);

  const boardSize = useMemo(() => ({
    width: Math.max(BOARD_WIDTH, Math.ceil((graphBounds?.maxX ?? BOARD_WIDTH) + BOARD_PADDING)),
    height: Math.max(BOARD_HEIGHT, Math.ceil((graphBounds?.maxY ?? BOARD_HEIGHT) + BOARD_PADDING))
  }), [graphBounds]);

  const selectedTransitionPanelPosition = useMemo((): NodePosition | null => {
    if (!selectedTransition) return null;

    return visualEdges.get(selectedTransition.id)?.labelPosition ?? null;
  }, [selectedTransition, visualEdges]);

  const fitBoundsToView = useCallback((bounds: GraphBounds | null) => {
    const container = containerRef.current;
    if (!container || !bounds) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    const paddedWidth = bounds.width + FIT_PADDING * 2;
    const paddedHeight = bounds.height + FIT_PADDING * 2;
    const nextScale = clampScale(Math.min(width / paddedWidth, height / paddedHeight));
    const offsetX = (width - bounds.width * nextScale) / 2 - bounds.minX * nextScale;
    const offsetY = (height - bounds.height * nextScale) / 2 - bounds.minY * nextScale;

    setViewport({ offsetX, offsetY, scale: nextScale });
  }, []);

  const fitToView = useCallback(() => {
    fitBoundsToView(graphBounds);
  }, [fitBoundsToView, graphBounds]);

  useEffect(() => {
    if (nodes.length === 0) {
      fittedNodeSignatureRef.current = '';
      return;
    }

    if (fittedNodeSignatureRef.current === nodeSignature) return;

    const frameId = window.requestAnimationFrame(() => {
      fitToView();
      fittedNodeSignatureRef.current = nodeSignature;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [fitToView, nodeSignature, nodes.length]);

  const zoomAtClientPoint = useCallback((clientX: number, clientY: number, scale: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const nextScale = clampScale(scale);

    setViewport((current) => {
      const pointerX = clientX - rect.left;
      const pointerY = clientY - rect.top;
      const boardX = (pointerX - current.offsetX) / current.scale;
      const boardY = (pointerY - current.offsetY) / current.scale;

      return {
        scale: nextScale,
        offsetX: pointerX - boardX * nextScale,
        offsetY: pointerY - boardY * nextScale
      };
    });
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    zoomAtClientPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, viewport.scale * factor);
  }, [viewport.scale, zoomAtClientPoint]);

  const centerViewportOnBoardPoint = useCallback((point: NodePosition) => {
    const container = containerRef.current;
    if (!container) return;

    setViewport((current) => ({
      ...current,
      offsetX: container.clientWidth / 2 - point.x * current.scale,
      offsetY: container.clientHeight / 2 - point.y * current.scale
    }));
  }, []);

  const startInlineLabelEdit = useCallback((transition: ScenarioTransition) => {
    if (disabled) return;

    setEditingLabelTransitionId(transition.id);
    setEditingLabelValue(transition.label ?? '');
    setHoveredTransitionId(transition.id);
    onSelectTransition(transition.id);
  }, [disabled, onSelectTransition]);

  const cancelInlineLabelEdit = useCallback(() => {
    setEditingLabelTransitionId(null);
    setEditingLabelValue('');
  }, []);

  const saveInlineLabelEdit = useCallback(async () => {
    if (!editingLabelTransitionId || inlineLabelSavingRef.current) return;

    const transition = transitions.find((item) => item.id === editingLabelTransitionId);
    if (!transition) {
      cancelInlineLabelEdit();
      return;
    }

    const nextLabel = editingLabelValue;
    if ((transition.label ?? '') === nextLabel) {
      cancelInlineLabelEdit();
      return;
    }

    inlineLabelSavingRef.current = true;
    try {
      await onUpdateTransition(transition.id, {
        type: transition.type,
        label: nextLabel,
        condition: transition.condition,
        metadata: transition.metadata
      });
      cancelInlineLabelEdit();
    } finally {
      inlineLabelSavingRef.current = false;
    }
  }, [cancelInlineLabelEdit, editingLabelTransitionId, editingLabelValue, onUpdateTransition, transitions]);

  const calculateLayoutUpdates = useCallback((direction: LayoutDirection): { updates: NodeLayoutUpdate[]; bounds: Record<string, NodeBounds> } => {
    const sortedNodes = [...nodes].sort(nodeOrderCompare);
    const nodeIds = new Set(sortedNodes.map((node) => node.id));
    const nodeById = new Map(sortedNodes.map((node) => [node.id, node]));
    const incoming = new Map<string, ScenarioTransition[]>();
    const outgoing = new Map<string, ScenarioTransition[]>();
    const incomingCount = new Map<string, number>();

    sortedNodes.forEach((node) => {
      outgoing.set(node.id, []);
      incoming.set(node.id, []);
      incomingCount.set(node.id, 0);
    });

    const graphTransitions = sortedTransitions(transitions)
      .filter((transition) => nodeIds.has(transition.fromNodeId) && nodeIds.has(transition.toNodeId));

    graphTransitions.forEach((transition) => {
      outgoing.get(transition.fromNodeId)?.push(transition);
      incoming.get(transition.toNodeId)?.push(transition);
      incomingCount.set(transition.toNodeId, (incomingCount.get(transition.toNodeId) ?? 0) + 1);
    });

    const levels = new Map<string, number>();
    const processed = new Set<string>();
    const remainingIncoming = new Map(incomingCount);
    const roots = sortedNodes.filter((node) => (incomingCount.get(node.id) ?? 0) === 0);
    const queue: string[] = (roots.length > 0 ? roots : sortedNodes.slice(0, 1)).map((node) => node.id);

    queue.forEach((nodeId) => levels.set(nodeId, 0));

    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (!nodeId || processed.has(nodeId)) continue;

      processed.add(nodeId);
      const level = levels.get(nodeId) ?? 0;
      (outgoing.get(nodeId) ?? []).forEach((transition) => {
        const targetId = transition.toNodeId;
        const nextLevel = Math.max(level + 1, levels.get(targetId) ?? 0);
        levels.set(targetId, nextLevel);
        remainingIncoming.set(targetId, (remainingIncoming.get(targetId) ?? 0) - 1);

        if ((remainingIncoming.get(targetId) ?? 0) <= 0) {
          queue.push(targetId);
        }
      });
    }

    let nextUnreachableLevel = Math.max(0, ...Array.from(levels.values())) + 1;
    sortedNodes.forEach((node) => {
      if (levels.has(node.id)) return;

      const parentLevels = (incoming.get(node.id) ?? [])
        .map((transition) => levels.get(transition.fromNodeId))
        .filter((level): level is number => typeof level === 'number');

      if (parentLevels.length > 0) {
        levels.set(node.id, Math.max(...parentLevels) + 1);
      } else {
        levels.set(node.id, nextUnreachableLevel);
        nextUnreachableLevel += 1;
      }
    });

    const grouped = new Map<number, ScenarioNode[]>();
    sortedNodes.forEach((node) => {
      const level = levels.get(node.id) ?? 0;
      grouped.set(level, [...(grouped.get(level) ?? []), node]);
    });

    const sortedLevels = Array.from(grouped.keys()).sort((a, b) => a - b);
    const levelOffsets = new Map<number, number>();
    let levelCursor = direction === 'horizontal' ? LAYOUT_START_X : LAYOUT_START_Y;

    sortedLevels.forEach((level) => {
      const levelNodes = grouped.get(level) ?? [];
      const maxMainSize = Math.max(
        0,
        ...levelNodes.map((node) => {
          const currentBounds = boundsById.get(node.id) ?? fallbackBounds(node.orderIndex, node);
          return direction === 'horizontal' ? currentBounds.width : currentBounds.height;
        })
      );

      levelOffsets.set(level, levelCursor);
      levelCursor += maxMainSize + LAYOUT_LEVEL_GAP;
    });

    const nextBounds: Record<string, NodeBounds> = {};
    const updates: NodeLayoutUpdate[] = [];
    const crossCenterForNode = (nodeId: string): number | null => {
      const node = nodeById.get(nodeId);
      if (!node) return null;

      const bounds = nextBounds[nodeId] ?? boundsById.get(nodeId) ?? fallbackBounds(node.orderIndex, node);
      return direction === 'horizontal'
        ? bounds.y + bounds.height / 2
        : bounds.x + bounds.width / 2;
    };
    const incomingSortKey = (node: ScenarioNode): number => {
      const transitionsToNode = incoming.get(node.id) ?? [];
      const parentCenters = transitionsToNode
        .map((transition) => crossCenterForNode(transition.fromNodeId))
        .filter((value): value is number => typeof value === 'number');
      const parentMedian = median(parentCenters);
      const branchBias = transitionsToNode.length > 0
        ? transitionsToNode.reduce((sum, transition) => sum + transitionLayoutBias(transition.type), 0) / transitionsToNode.length
        : 0;

      if (parentMedian !== null) {
        return parentMedian + branchBias * 120;
      }

      const currentBounds = boundsById.get(node.id) ?? fallbackBounds(node.orderIndex, node);
      const currentCenter = direction === 'horizontal'
        ? currentBounds.y + currentBounds.height / 2
        : currentBounds.x + currentBounds.width / 2;

      return currentCenter + branchBias * 120;
    };

    sortedLevels
      .forEach((level) => {
        const levelNodes = grouped.get(level) ?? [];
        let cursor = direction === 'horizontal' ? LAYOUT_START_Y : LAYOUT_START_X;

        levelNodes
          .sort((a, b) =>
            incomingSortKey(a) - incomingSortKey(b) ||
            nodeOrderCompare(a, b)
          )
          .forEach((node) => {
            const currentBounds = boundsById.get(node.id) ?? fallbackBounds(node.orderIndex, node);
            const x = direction === 'horizontal'
              ? levelOffsets.get(level) ?? LAYOUT_START_X
              : cursor;
            const y = direction === 'horizontal'
              ? cursor
              : levelOffsets.get(level) ?? LAYOUT_START_Y;
            const bounds = clampBounds({
              ...currentBounds,
              x,
              y
            });

            nextBounds[node.id] = bounds;
            updates.push({ nodeId: node.id, position: buildPositionPayload(node, bounds) });
            cursor += (direction === 'horizontal' ? bounds.height : bounds.width) + LAYOUT_NODE_GAP;
          });
      });

    return { updates, bounds: nextBounds };
  }, [boundsById, nodes, transitions]);

  const handleAutoLayout = async () => {
    if (disabled || nodes.length === 0) return;

    const { updates, bounds } = calculateLayoutUpdates(layoutDirection);
    setLocalBounds((current) => ({ ...current, ...bounds }));
    await onLayoutNodes(updates);
    window.requestAnimationFrame(() => fitBoundsToView(boundsFromNodes(Object.values(bounds))));
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (disabled) return;

    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    zoomAtClientPoint(event.clientX, event.clientY, viewport.scale * factor);
  };

  const clientPointToBoard = useCallback((clientX: number, clientY: number): NodePosition | null => {
    const container = containerRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.offsetX) / viewport.scale,
      y: (clientY - rect.top - viewport.offsetY) / viewport.scale
    };
  }, [viewport]);

  const findNodeAtBoardPoint = useCallback((point: NodePosition, sourceNodeId: string): string | null => {
    const target = nodes
      .map((node, index) => ({ node, index }))
      .reverse()
      .find(({ node, index }) => {
      if (node.id === sourceNodeId) return false;
      const bounds = boundsById.get(node.id) ?? fallbackBounds(index, node);
      return (
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height
      );
    });

    return target?.node.id ?? null;
  }, [boundsById, nodes]);

  const updateTransitionWaypoints = useCallback(async (
    transition: ScenarioTransition,
    waypoints: NodePosition[]
  ) => {
    await onUpdateTransition(transition.id, {
      type: transition.type,
      label: transition.label ?? '',
      condition: transition.condition,
      metadata: transitionMetadataWithWaypoints(transition, waypoints)
    });
  }, [onUpdateTransition]);

  const handleAddWaypoint = useCallback(async (
    event: React.MouseEvent<SVGPathElement>,
    transition: ScenarioTransition,
    visualEdge: VisualEdge
  ) => {
    if (disabled || event.detail < 2) return;

    event.preventDefault();
    event.stopPropagation();
    const point = clientPointToBoard(event.clientX, event.clientY);
    if (!point) return;

    const currentWaypoints = localWaypointOverrides[transition.id] ?? transitionWaypoints(transition);
    const nextWaypoints = insertWaypoint(visualEdge.routePoints, currentWaypoints, point);
    setLocalWaypointOverrides((current) => ({ ...current, [transition.id]: nextWaypoints }));
    setActiveWaypoint({
      transitionId: transition.id,
      waypointIndex: Math.max(0, nextWaypoints.findIndex((waypoint) => waypoint.x === Math.round(point.x) && waypoint.y === Math.round(point.y)))
    });
    onSelectTransition(transition.id);
    await updateTransitionWaypoints(transition, nextWaypoints);
  }, [clientPointToBoard, disabled, localWaypointOverrides, onSelectTransition, updateTransitionWaypoints]);

  const handleResetWaypoints = useCallback(async (transition: ScenarioTransition) => {
    if (disabled) return;

    setLocalWaypointOverrides((current) => ({ ...current, [transition.id]: [] }));
    setActiveWaypoint(null);
    await updateTransitionWaypoints(transition, []);
  }, [disabled, updateTransitionWaypoints]);

  const handleWaypointPointerDown = (
    event: React.PointerEvent<SVGCircleElement>,
    transition: ScenarioTransition,
    waypointIndex: number
  ) => {
    if (disabled) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelectTransition(transition.id);
    setActiveWaypoint({ transitionId: transition.id, waypointIndex });
    const startWaypoints = localWaypointOverrides[transition.id] ?? transitionWaypoints(transition);
    setWaypointDragState({
      transitionId: transition.id,
      waypointIndex,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWaypoints,
      currentWaypoints: startWaypoints,
      moved: false
    });
  };

  const handleWaypointPointerMove = (event: React.PointerEvent<SVGCircleElement>) => {
    if (!waypointDragState || waypointDragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    const point = clientPointToBoard(event.clientX, event.clientY);
    if (!point) return;

    const nextWaypoints = waypointDragState.currentWaypoints.map((waypoint, index) =>
      index === waypointDragState.waypointIndex ? roundPoint(point) : waypoint
    );

    setLocalWaypointOverrides((current) => ({ ...current, [waypointDragState.transitionId]: nextWaypoints }));
    setWaypointDragState({
      ...waypointDragState,
      currentWaypoints: nextWaypoints,
      moved: waypointDragState.moved ||
        Math.abs(event.clientX - waypointDragState.startClientX) > 2 ||
        Math.abs(event.clientY - waypointDragState.startClientY) > 2
    });
  };

  const handleWaypointPointerUp = async (
    event: React.PointerEvent<SVGCircleElement>,
    transition: ScenarioTransition
  ) => {
    if (!waypointDragState || waypointDragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    const nextWaypoints = waypointDragState.currentWaypoints;
    const shouldSave = waypointDragState.moved;
    setWaypointDragState(null);

    if (shouldSave) {
      await updateTransitionWaypoints(transition, nextWaypoints);
    }
  };

  const handleWaypointPointerCancel = (event: React.PointerEvent<SVGCircleElement>) => {
    if (!waypointDragState || waypointDragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    setLocalWaypointOverrides((current) => ({
      ...current,
      [waypointDragState.transitionId]: waypointDragState.startWaypoints
    }));
    setWaypointDragState(null);
  };

  const deleteActiveWaypoint = useCallback(async () => {
    if (!activeWaypoint) return false;

    const transition = transitions.find((item) => item.id === activeWaypoint.transitionId);
    if (!transition) {
      setActiveWaypoint(null);
      return false;
    }

    const currentWaypoints = localWaypointOverrides[transition.id] ?? transitionWaypoints(transition);
    if (activeWaypoint.waypointIndex < 0 || activeWaypoint.waypointIndex >= currentWaypoints.length) {
      setActiveWaypoint(null);
      return false;
    }

    const nextWaypoints = currentWaypoints.filter((_, index) => index !== activeWaypoint.waypointIndex);
    setLocalWaypointOverrides((current) => ({ ...current, [transition.id]: nextWaypoints }));
    setActiveWaypoint(null);
    await updateTransitionWaypoints(transition, nextWaypoints);

    return true;
  }, [activeWaypoint, localWaypointOverrides, transitions, updateTransitionWaypoints]);

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;

    event.preventDefault();
    containerRef.current?.focus({ preventScroll: true });
    onClearSelection();
    setActiveWaypoint(null);
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewport: viewport
    });
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panState || panState.pointerId !== event.pointerId) return;

    setViewport({
      ...panState.startViewport,
      offsetX: panState.startViewport.offsetX + event.clientX - panState.startClientX,
      offsetY: panState.startViewport.offsetY + event.clientY - panState.startClientY
    });
  };

  const handleCanvasPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panState || panState.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    setPanState(null);
  };

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (disabled || isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const code = event.code;
      const modifierPressed = event.ctrlKey || event.metaKey;
      if (modifierPressed && (key === 'z' || code === 'KeyZ')) {
        if (event.shiftKey) {
          if (canRedo) {
            event.preventDefault();
            void onRedo?.();
          }
          return;
        }

        if (canUndo) {
          event.preventDefault();
          void onUndo?.();
        }
        return;
      }

      if (modifierPressed && (key === 'y' || code === 'KeyY')) {
        if (canRedo) {
          event.preventDefault();
          void onRedo?.();
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        if (editingLabelTransitionId) {
          cancelInlineLabelEdit();
          return;
        }
        if (waypointDragState) {
          setLocalWaypointOverrides((current) => ({
            ...current,
            [waypointDragState.transitionId]: waypointDragState.startWaypoints
          }));
          setWaypointDragState(null);
          return;
        }
        onClearSelection();
        setActiveWaypoint(null);
        return;
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') return;

      if (activeWaypoint) {
        event.preventDefault();
        void deleteActiveWaypoint();
        return;
      }

      if (activeTransitionId) {
        event.preventDefault();
        void onDeleteTransition(activeTransitionId);
        return;
      }

      if (activeNodeId) {
        event.preventDefault();
        void onDeleteNode(activeNodeId);
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [
    activeNodeId,
    activeTransitionId,
    activeWaypoint,
    canRedo,
    canUndo,
    cancelInlineLabelEdit,
    deleteActiveWaypoint,
    disabled,
    editingLabelTransitionId,
    onClearSelection,
    onDeleteNode,
    onDeleteTransition,
    onRedo,
    onUndo,
    waypointDragState
  ]);

  const handleCanvasPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panState || panState.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    setPanState(null);
  };

  const handleNodePointerDown = (event: React.PointerEvent<HTMLDivElement>, node: ScenarioNode) => {
    if (disabled) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    const startBounds = boundsById.get(node.id) ?? fallbackBounds(node.orderIndex, node);
    onSelectTransition(null);
    onSelectNode(node.id);
    setActiveWaypoint(null);
    setDragState({
      nodeId: node.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBounds,
      currentBounds: startBounds,
      moved: false
    });
  };

  const handleNodePointerMove = (event: React.PointerEvent<HTMLDivElement>, node: ScenarioNode) => {
    if (!dragState || dragState.nodeId !== node.id || dragState.pointerId !== event.pointerId) return;

    event.stopPropagation();
    const dx = (event.clientX - dragState.startClientX) / viewport.scale;
    const dy = (event.clientY - dragState.startClientY) / viewport.scale;
    const nextBounds = clampBounds({
      ...dragState.startBounds,
      x: dragState.startBounds.x + dx,
      y: dragState.startBounds.y + dy
    });

    setLocalBounds((current) => ({ ...current, [node.id]: nextBounds }));
    setDragState({
      ...dragState,
      currentBounds: nextBounds,
      moved: dragState.moved || Math.abs(event.clientX - dragState.startClientX) > 2 || Math.abs(event.clientY - dragState.startClientY) > 2
    });
  };

  const handleNodePointerUp = async (event: React.PointerEvent<HTMLDivElement>, node: ScenarioNode) => {
    if (!dragState || dragState.nodeId !== node.id || dragState.pointerId !== event.pointerId) return;

    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    const finalBounds = dragState.currentBounds;
    const shouldSave = dragState.moved;
    setDragState(null);

    if (shouldSave) {
      await onMoveNode(
        node.id,
        buildPositionPayload(node, finalBounds),
        buildPositionPayload(node, dragState.startBounds)
      );
    }
  };

  const handleNodePointerCancel = (event: React.PointerEvent<HTMLDivElement>, node: ScenarioNode) => {
    if (!dragState || dragState.nodeId !== node.id || dragState.pointerId !== event.pointerId) return;

    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    setLocalBounds((current) => ({ ...current, [node.id]: dragState.startBounds }));
    setDragState(null);
  };

  const handleResizePointerDown = (event: React.PointerEvent<HTMLButtonElement>, node: ScenarioNode) => {
    if (disabled) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startBounds = boundsById.get(node.id) ?? fallbackBounds(node.orderIndex, node);
    onSelectTransition(null);
    onSelectNode(node.id);
    setResizeState({
      nodeId: node.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBounds,
      currentBounds: startBounds,
      moved: false
    });
  };

  const handleResizePointerMove = (event: React.PointerEvent<HTMLButtonElement>, node: ScenarioNode) => {
    if (!resizeState || resizeState.nodeId !== node.id || resizeState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    const dx = (event.clientX - resizeState.startClientX) / viewport.scale;
    const dy = (event.clientY - resizeState.startClientY) / viewport.scale;
    const size = clampNodeSize(resizeState.startBounds.width + dx, resizeState.startBounds.height + dy);
    const nextBounds = clampBounds({
      ...resizeState.startBounds,
      width: size.width,
      height: size.height
    });

    setLocalBounds((current) => ({ ...current, [node.id]: nextBounds }));
    setResizeState({
      ...resizeState,
      currentBounds: nextBounds,
      moved: resizeState.moved || Math.abs(event.clientX - resizeState.startClientX) > 2 || Math.abs(event.clientY - resizeState.startClientY) > 2
    });
  };

  const handleResizePointerUp = async (event: React.PointerEvent<HTMLButtonElement>, node: ScenarioNode) => {
    if (!resizeState || resizeState.nodeId !== node.id || resizeState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    const finalBounds = resizeState.currentBounds;
    const shouldSave = resizeState.moved;
    setResizeState(null);

    if (shouldSave) {
      await onMoveNode(
        node.id,
        buildPositionPayload(node, finalBounds),
        buildPositionPayload(node, resizeState.startBounds)
      );
    }
  };

  const handleResizePointerCancel = (event: React.PointerEvent<HTMLButtonElement>, node: ScenarioNode) => {
    if (!resizeState || resizeState.nodeId !== node.id || resizeState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    setLocalBounds((current) => ({ ...current, [node.id]: resizeState.startBounds }));
    setResizeState(null);
  };

  const handleEdgePointerDown = (event: React.PointerEvent<HTMLButtonElement>, node: ScenarioNode, side: HandleSide) => {
    if (disabled) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = boundsById.get(node.id) ?? fallbackBounds(node.orderIndex, node);
    const start = sideAnchor(bounds, side);
    onSelectNode(node.id);
    setActiveWaypoint(null);
    setEdgeDragState({
      sourceNodeId: node.id,
      pointerId: event.pointerId,
      sourceSide: side,
      start,
      current: start,
      targetNodeId: null
    });
  };

  const handleEdgePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!edgeDragState || edgeDragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    const current = clientPointToBoard(event.clientX, event.clientY);
    if (!current) return;

    setEdgeDragState({
      ...edgeDragState,
      current,
      targetNodeId: findNodeAtBoardPoint(current, edgeDragState.sourceNodeId)
    });
  };

  const handleEdgePointerUp = async (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!edgeDragState || edgeDragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    const { sourceNodeId, targetNodeId } = edgeDragState;
    setEdgeDragState(null);

    if (targetNodeId && targetNodeId !== sourceNodeId) {
      await onCreateTransition(sourceNodeId, targetNodeId);
    }
  };

  const handleEdgePointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!edgeDragState || edgeDragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    setEdgeDragState(null);
  };

  if (nodes.length === 0) {
    return (
      <div className="flex-1 min-w-[360px] bg-[var(--bg-main)] flex items-center justify-center text-center p-8">
        <div className="border border-dashed border-[var(--border-color)] p-8 max-w-sm">
          <div className="mono text-[10px] uppercase font-black text-[var(--text-muted)]">
            Создайте первый узел, чтобы увидеть граф
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={disabled ? -1 : 0}
      className={`flex-1 min-w-[360px] bg-[var(--bg-main)] overflow-hidden relative ${panState ? 'cursor-grabbing' : 'cursor-grab'}`}
      onWheel={handleWheel}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerCancel}
      style={{ touchAction: 'none' }}
    >
      <div
        className="hidden sm:flex absolute top-3 right-3 z-30 flex-col gap-1.5 border border-[var(--border-color)] bg-[var(--bg-surface)]/95 p-2 shadow-xl"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onPointerCancel={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <GraphMinimap
          nodes={nodes}
          boundsById={boundsById}
          boardSize={boardSize}
          viewport={viewport}
          containerSize={containerSize}
          activeNodeId={activeNodeId}
          disabled={disabled}
          onCenterViewport={centerViewportOnBoardPoint}
        />
        <div className="grid grid-cols-[32px_56px_32px_1fr] border border-[var(--border-color)] bg-[var(--bg-main)]">
          <button
            type="button"
            onClick={() => zoomBy(0.85)}
            disabled={disabled || viewport.scale <= MIN_SCALE}
            className="h-8 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] disabled:opacity-40"
            title="Уменьшить"
          >
            <Minus size={14} />
          </button>
          <div className="h-8 inline-flex items-center justify-center mono text-[9px] uppercase font-black text-[var(--text-main)] border-x border-[var(--border-color)]">
            {Math.round(viewport.scale * 100)}%
          </div>
          <button
            type="button"
            onClick={() => zoomBy(1.15)}
            disabled={disabled || viewport.scale >= MAX_SCALE}
            className="h-8 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] disabled:opacity-40"
            title="Увеличить"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={fitToView}
            disabled={disabled}
            className="h-8 inline-flex items-center justify-center gap-2 border-l border-[var(--border-color)] px-3 text-[var(--col-red)] hover:bg-[var(--col-red)] hover:text-white disabled:opacity-40 mono text-[8px] uppercase font-black transition-colors"
            title="Вписать граф"
          >
            <Maximize2 size={13} />
            ВПИСАТЬ
          </button>
        </div>
        <div className="grid grid-cols-[36px_36px_1fr] border border-[var(--border-color)] bg-[var(--bg-main)]">
          <button
            type="button"
            onClick={() => setLayoutDirection('horizontal')}
            disabled={disabled}
            className={`h-8 inline-flex items-center justify-center border-r border-[var(--border-color)] mono text-[14px] font-black transition-colors disabled:opacity-40 ${
              layoutDirection === 'horizontal'
                ? 'bg-[var(--col-red)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
            }`}
            title="Упорядочить слева направо"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => setLayoutDirection('vertical')}
            disabled={disabled}
            className={`h-8 inline-flex items-center justify-center border-r border-[var(--border-color)] mono text-[14px] font-black transition-colors disabled:opacity-40 ${
              layoutDirection === 'vertical'
                ? 'bg-[var(--col-red)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
            }`}
            title="Упорядочить сверху вниз"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={handleAutoLayout}
            disabled={disabled || nodes.length === 0}
            className="h-8 inline-flex items-center justify-center gap-2 px-3 text-[var(--col-red)] hover:bg-[var(--col-red)] hover:text-white disabled:opacity-40 mono text-[8px] uppercase font-black transition-colors"
            title="Упорядочить граф"
          >
            <GitBranch size={13} />
            УПОРЯД.
          </button>
        </div>
      </div>

      <div
        className="absolute top-0 left-0"
        style={{
          width: boardSize.width,
          height: boardSize.height,
          transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`,
          transformOrigin: '0 0',
          backgroundImage:
            'linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          backgroundColor: 'var(--bg-main)'
        }}
      >
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
                  onPointerEnter={() => setHoveredTransitionId(transition.id)}
                  onPointerLeave={() => setHoveredTransitionId((current) => (current === transition.id ? null : current))}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    containerRef.current?.focus({ preventScroll: true });
                    setActiveWaypoint(null);
                    onSelectTransition(transition.id);
                  }}
                  onDoubleClick={(event) => {
                    void handleAddWaypoint(event, transition, visualEdge);
                  }}
                />
                <path
                  d={visualEdge.path}
                  fill="none"
                  stroke={transitionIssueColor && !isSelected && !isHovered ? transitionIssueColor : color}
                  strokeWidth={isSelected ? 4.5 : isHovered ? 3.5 : isSourceActive ? 3 : 2}
                  strokeOpacity={isSelected ? 1 : isHovered ? 0.95 : isSourceActive || transitionIssueColor ? 0.9 : 0.5}
                  markerEnd={`url(#graph-arrow-${transition.type})`}
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
                      containerRef.current?.focus({ preventScroll: true });
                      setActiveWaypoint(null);
                      onSelectTransition(transition.id);
                    }}
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      startInlineLabelEdit(transition);
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
                      onChange={(event) => setEditingLabelValue(event.target.value)}
                      onBlur={() => {
                        void saveInlineLabelEdit();
                      }}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void saveInlineLabelEdit();
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelInlineLabelEdit();
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
                      onPointerDown={(event) => handleWaypointPointerDown(event, transition, waypointIndex)}
                      onPointerMove={handleWaypointPointerMove}
                      onPointerUp={(event) => {
                        void handleWaypointPointerUp(event, transition);
                      }}
                      onPointerCancel={handleWaypointPointerCancel}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setActiveWaypoint({ transitionId: transition.id, waypointIndex });
                        onSelectTransition(transition.id);
                      }}
                    />
                  );
                })}
              </g>
            );
          })}
          {edgeDragState && (
            <path
              d={edgeCurve(edgeDragState.start, edgeDragState.sourceSide, edgeDragState.current, previewTargetSide(edgeDragState.sourceSide))}
              fill="none"
              stroke="var(--col-red)"
              strokeWidth={3}
              strokeDasharray="8 6"
              strokeOpacity={0.9}
              markerEnd="url(#graph-arrow-preview)"
            />
          )}
        </svg>

        {selectedTransition && selectedTransitionPanelPosition && (
          <EdgeQuickPanel
            transition={selectedTransition}
            position={selectedTransitionPanelPosition}
            disabled={disabled}
            scale={viewport.scale}
            hasWaypoints={transitionWaypoints(selectedTransition).length > 0 || Boolean(localWaypointOverrides[selectedTransition.id]?.length)}
            onUpdate={onUpdateTransition}
            onDelete={onDeleteTransition}
            onResetWaypoints={handleResetWaypoints}
            onClose={() => {
              setActiveWaypoint(null);
              onSelectTransition(null);
            }}
          />
        )}

        {nodes.map((node, index) => {
          const bounds = boundsById.get(node.id) ?? fallbackBounds(index, node);
          const outgoingCount = transitions.filter((transition) => transition.fromNodeId === node.id).length;
          const incomingCount = transitions.filter((transition) => transition.toNodeId === node.id).length;
          const isActive = activeNodeId === node.id;
          const isDragEdgeTarget = edgeDragState?.targetNodeId === node.id;
          const isHighlightedSource = highlightedTransition?.fromNodeId === node.id;
          const isHighlightedTarget = highlightedTransition?.toNodeId === node.id;
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
              onPointerDown={(event) => handleNodePointerDown(event, node)}
              onPointerMove={(event) => handleNodePointerMove(event, node)}
              onPointerUp={(event) => handleNodePointerUp(event, node)}
              onPointerCancel={(event) => handleNodePointerCancel(event, node)}
              onKeyDown={(event) => {
                if (disabled) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectNode(node.id);
                }
              }}
              className={`absolute text-left border-2 bg-[var(--bg-surface)] shadow-lg transition-colors select-none ${dragState?.nodeId === node.id ? 'cursor-grabbing' : 'cursor-grab'} disabled:cursor-default disabled:opacity-70`}
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
              {showHandles && <button
                type="button"
                disabled={disabled}
                onPointerDown={(event) => handleEdgePointerDown(event, node, 'right')}
                onPointerMove={handleEdgePointerMove}
                onPointerUp={handleEdgePointerUp}
                onPointerCancel={handleEdgePointerCancel}
                className="absolute -right-[9px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 inline-flex items-center justify-center border-2 border-[var(--col-red)] bg-[var(--bg-main)] text-[var(--col-red)] shadow-lg hover:bg-[var(--col-red)] hover:text-white disabled:opacity-40 disabled:hover:bg-[var(--bg-main)] disabled:hover:text-[var(--col-red)]"
                title="Создать переход"
              >
                <Plus size={11} />
              </button>}
              {showHandles && OUTPUT_SIDES.filter((side) => side !== 'right').map((side) => (
                <button
                  key={side}
                  type="button"
                  disabled={disabled}
                  onPointerDown={(event) => handleEdgePointerDown(event, node, side)}
                  onPointerMove={handleEdgePointerMove}
                  onPointerUp={handleEdgePointerUp}
                  onPointerCancel={handleEdgePointerCancel}
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
                  onPointerDown={(event) => handleResizePointerDown(event, node)}
                  onPointerMove={(event) => handleResizePointerMove(event, node)}
                  onPointerUp={(event) => handleResizePointerUp(event, node)}
                  onPointerCancel={(event) => handleResizePointerCancel(event, node)}
                  className="absolute -bottom-1.5 -right-1.5 h-4 w-4 border-2 border-[var(--col-red)] bg-[var(--bg-main)] disabled:opacity-40 cursor-nwse-resize"
                  title="Resize node"
                >
                  <span className="block h-full w-full bg-[linear-gradient(135deg,transparent_0_45%,var(--col-red)_45%_55%,transparent_55%)]" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
