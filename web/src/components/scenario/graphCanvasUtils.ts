import {
  ScenarioNode,
  ScenarioTransition,
  ScenarioTransitionMetadata,
  ScenarioTransitionType
} from '../../types';

const DEFAULT_NODE_WIDTH = 190;
const DEFAULT_NODE_HEIGHT = 92;
const NODE_CONTENT_LINE_HEIGHT = 16;
const NODE_CONTENT_MAX_AUTO_LINES = 6;
const MIN_NODE_WIDTH = 180;
const MAX_NODE_WIDTH = 420;
const MIN_NODE_HEIGHT = 92;
const MAX_NODE_HEIGHT = 260;

export const BOARD_WIDTH = 1800;
export const BOARD_HEIGHT = 1100;
export const MIN_SCALE = 0.35;
export const MAX_SCALE = 1.75;
export const FIT_PADDING = 80;
export const LAYOUT_START_X = 96;
export const LAYOUT_START_Y = 96;
export const LAYOUT_LEVEL_GAP = 340;
export const LAYOUT_NODE_GAP = 72;
export const BOARD_PADDING = 240;

const EDGE_PARALLEL_GAP = 18;
const EDGE_BIDIRECTIONAL_OFFSET = 14;
const EDGE_LABEL_OFFSET = 18;
const EDGE_OBSTACLE_PADDING = 28;
const EDGE_PORT_CLEARANCE = 42;
const EDGE_CORRIDOR_PADDING = 56;

export type HandleSide = 'top' | 'right' | 'bottom' | 'left';

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeBounds extends NodePosition {
  width: number;
  height: number;
}

interface ObstacleRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface GraphBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface BoardSize {
  width: number;
  height: number;
}

export interface NodeLayoutUpdate {
  nodeId: string;
  position: Record<string, unknown>;
}

export interface VisualEdge {
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

export const HANDLE_SIDES: HandleSide[] = ['top', 'right', 'bottom', 'left'];

const toNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const clampNodeSize = (width: number, height: number): Pick<NodeBounds, 'width' | 'height'> => ({
  width: Math.max(MIN_NODE_WIDTH, Math.min(MAX_NODE_WIDTH, Math.round(width))),
  height: Math.max(MIN_NODE_HEIGHT, Math.min(MAX_NODE_HEIGHT, Math.round(height)))
});

export const clampBounds = (bounds: NodeBounds): NodeBounds => {
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

export const fallbackBounds = (index: number, node?: ScenarioNode): NodeBounds => ({
  x: 80 + (index % 4) * 280,
  y: 80 + Math.floor(index / 4) * 180,
  ...(node ? estimateNodeBoundsSize(node, node.position as Record<string, unknown>) : {
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT
  })
});

export const readNodeBounds = (node: ScenarioNode, index: number): NodeBounds => {
  const source = node.position as Record<string, unknown>;
  const x = toNumber(source?.x);
  const y = toNumber(source?.y);
  const size = estimateNodeBoundsSize(node, source);

  if (x === null || y === null) {
    return fallbackBounds(index, node);
  }

  return clampBounds({ x, y, ...size });
};

export const buildPositionPayload = (node: ScenarioNode, bounds: NodeBounds): Record<string, unknown> => ({
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

export const sideAnchor = (bounds: NodeBounds, side: HandleSide): NodePosition => {
  if (side === 'top') return { x: bounds.x + bounds.width / 2, y: bounds.y };
  if (side === 'right') return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
  if (side === 'bottom') return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
  return { x: bounds.x, y: bounds.y + bounds.height / 2 };
};

const chooseNearestSide = (bounds: NodeBounds, point: NodePosition): HandleSide =>
  HANDLE_SIDES
    .map((side) => {
      const anchor = sideAnchor(bounds, side);

      return {
        side,
        distance: (anchor.x - point.x) ** 2 + (anchor.y - point.y) ** 2
      };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.side ?? 'right';

const choosePortSides = (from: NodeBounds, to: NodeBounds): { fromSide: HandleSide; toSide: HandleSide } => {
  const fromCenter = nodeCenter(from);
  const toCenter = nodeCenter(to);

  return {
    fromSide: chooseNearestSide(from, toCenter),
    toSide: chooseNearestSide(to, fromCenter)
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

export const edgeCurve = (from: NodePosition, fromSide: HandleSide, to: NodePosition, toSide: HandleSide): string => {
  const distance = Math.max(80, Math.min(220, Math.hypot(to.x - from.x, to.y - from.y) * 0.35));
  const controlA = sideControlPoint(from, fromSide, distance);
  const controlB = sideControlPoint(to, toSide, distance);
  return `M ${from.x} ${from.y} C ${controlA.x} ${controlA.y}, ${controlB.x} ${controlB.y}, ${to.x} ${to.y}`;
};

export const oppositeSide = (side: HandleSide): HandleSide => {
  if (side === 'top') return 'bottom';
  if (side === 'right') return 'left';
  if (side === 'bottom') return 'top';
  return 'right';
};

const offsetPoint = (point: NodePosition, normal: NodePosition, distance: number): NodePosition => ({
  x: point.x + normal.x * distance,
  y: point.y + normal.y * distance
});

export const roundPoint = (point: NodePosition): NodePosition => ({
  x: Math.round(point.x),
  y: Math.round(point.y)
});

const isFinitePoint = (point: unknown): point is NodePosition => {
  if (!point || typeof point !== 'object') return false;

  const source = point as Record<string, unknown>;
  return Number.isFinite(Number(source.x)) && Number.isFinite(Number(source.y));
};

export const transitionWaypoints = (transition: ScenarioTransition): NodePosition[] =>
  (transition.metadata.visual?.waypoints ?? [])
    .filter(isFinitePoint)
    .map((point) => ({ x: Number(point.x), y: Number(point.y) }));

export const transitionMetadataWithWaypoints = (
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

export const edgeArrowPoints = (
  points: NodePosition[],
  fallbackEnd: NodePosition,
  size = 9,
  width = 7,
  inset = 5
): string => {
  const end = points[points.length - 1] ?? fallbackEnd;
  let previous = points.length > 1 ? points[points.length - 2] : null;

  for (let index = points.length - 2; index >= 0; index -= 1) {
    const candidate = points[index];
    if (Math.hypot(end.x - candidate.x, end.y - candidate.y) > 0.1) {
      previous = candidate;
      break;
    }
  }

  if (!previous) {
    previous = { x: end.x - 1, y: end.y };
  }

  const dx = end.x - previous.x;
  const dy = end.y - previous.y;
  const length = Math.hypot(dx, dy) || 1;
  const unit = { x: dx / length, y: dy / length };
  const normal = { x: -unit.y, y: unit.x };
  const tip = {
    x: end.x - unit.x * inset,
    y: end.y - unit.y * inset
  };
  const base = {
    x: tip.x - unit.x * size,
    y: tip.y - unit.y * size
  };
  const left = {
    x: base.x + normal.x * (width / 2),
    y: base.y + normal.y * (width / 2)
  };
  const right = {
    x: base.x - normal.x * (width / 2),
    y: base.y - normal.y * (width / 2)
  };

  return `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`;
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

export const insertWaypoint = (routePoints: NodePosition[], waypoints: NodePosition[], point: NodePosition): NodePosition[] => {
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

export const sortedTransitions = (items: ScenarioTransition[]): ScenarioTransition[] =>
  [...items].sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id));

export const nodeOrderCompare = (a: ScenarioNode, b: ScenarioNode): number =>
  a.orderIndex - b.orderIndex || a.id.localeCompare(b.id);

export const transitionLayoutBias = (type: ScenarioTransitionType): number => {
  if (type === 'success') return -1;
  if (type === 'failure') return 1;
  if (type === 'choice') return 0.25;
  return 0;
};

export const median = (values: number[]): number | null => {
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

export const buildVisualEdges = (
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

export const boundsFromNodes = (bounds: Iterable<NodeBounds>): GraphBounds | null => {
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
