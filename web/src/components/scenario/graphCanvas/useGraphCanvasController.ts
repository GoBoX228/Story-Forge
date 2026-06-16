import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScenarioNode, ScenarioTransition } from '../../../types';
import { useEditorViewport } from '../../../hooks/useEditorViewport';
import { type EditorMinimapItem, type EditorViewportState } from '../../EditorViewportControls';
import { NODE_TYPE_STYLES } from './graphCanvasStyles';
import type { GraphCanvasProps, GraphLayoutDirection } from './graphCanvasTypes';
import {
  BOARD_HEIGHT,
  BOARD_PADDING,
  BOARD_WIDTH,
  buildPositionPayload,
  buildVisualEdges,
  boundsFromNodes,
  clampBounds,
  clampNodeSize,
  fallbackBounds,
  FIT_PADDING,
  insertWaypoint,
  LAYOUT_LEVEL_GAP,
  LAYOUT_NODE_GAP,
  LAYOUT_START_X,
  LAYOUT_START_Y,
  MAX_SCALE,
  median,
  MIN_SCALE,
  nodeOrderCompare,
  readNodeBounds,
  roundPoint,
  sideAnchor,
  sortedTransitions,
  transitionLayoutBias,
  transitionMetadataWithWaypoints,
  transitionWaypoints,
  type GraphBounds,
  type HandleSide,
  type NodeBounds,
  type NodeLayoutUpdate,
  type NodePosition,
  type VisualEdge
} from '../graphCanvasUtils';

type LayoutDirection = GraphLayoutDirection;
type ViewportState = EditorViewportState;

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

export const useGraphCanvasController = ({
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
  canUndoShortcut = false,
  canRedoShortcut = false,
  onUndoShortcut,
  onRedoShortcut
}: GraphCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fittedNodeSignatureRef = useRef('');
  const inlineLabelInputRef = useRef<HTMLInputElement | null>(null);
  const inlineLabelSavingRef = useRef(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [edgeDragState, setEdgeDragState] = useState<EdgeDragState | null>(null);
  const [waypointDragState, setWaypointDragState] = useState<WaypointDragState | null>(null);
  const [activeWaypoint, setActiveWaypoint] = useState<{ transitionId: string; waypointIndex: number } | null>(null);
  const [localBounds, setLocalBounds] = useState<Record<string, NodeBounds>>({});
  const [localWaypointOverrides, setLocalWaypointOverrides] = useState<Record<string, NodePosition[]>>({});
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

  const {
    viewport,
    setViewport,
    containerSize,
    screenToCanvasPoint,
    centerOnCanvasPoint,
    zoomAtClientPoint,
    zoomBy,
    fitToView: fitViewportToBounds
  } = useEditorViewport({
    containerRef,
    canvasSize: boardSize,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE
  });

  const minimapItems = useMemo<EditorMinimapItem[]>(() => nodes.flatMap((node) => {
    const bounds = boundsById.get(node.id);
    if (!bounds) return [];

    return [{
      id: node.id,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      color: NODE_TYPE_STYLES[node.type].accent,
      active: activeNodeId === node.id
    }];
  }), [activeNodeId, boundsById, nodes]);

  const selectedTransitionPanelPosition = useMemo((): NodePosition | null => {
    if (!selectedTransition) return null;

    return visualEdges.get(selectedTransition.id)?.labelPosition ?? null;
  }, [selectedTransition, visualEdges]);

  const fitBoundsToView = useCallback((bounds: GraphBounds | null) => {
    if (!bounds) return;

    fitViewportToBounds({
      minX: bounds.minX - FIT_PADDING,
      minY: bounds.minY - FIT_PADDING,
      width: bounds.width + FIT_PADDING * 2,
      height: bounds.height + FIT_PADDING * 2
    });
  }, [fitViewportToBounds]);

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

  const handleAutoLayout = useCallback(async (direction: LayoutDirection) => {
    if (disabled || nodes.length === 0) return;

    const { updates, bounds } = calculateLayoutUpdates(direction);
    setLocalBounds((current) => ({ ...current, ...bounds }));
    await onLayoutNodes(updates);
    window.requestAnimationFrame(() => fitBoundsToView(boundsFromNodes(Object.values(bounds))));
  }, [calculateLayoutUpdates, disabled, fitBoundsToView, nodes.length, onLayoutNodes]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (disabled) return;

    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    zoomAtClientPoint(event.clientX, event.clientY, viewport.scale * factor);
  };

  const clientPointToBoard = useCallback((clientX: number, clientY: number): NodePosition | null => {
    return screenToCanvasPoint(clientX, clientY);
  }, [screenToCanvasPoint]);

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

  const deleteSelected = useCallback(async () => {
    if (disabled) return;

    if (activeWaypoint) {
      await deleteActiveWaypoint();
      return;
    }

    if (activeTransitionId) {
      await onDeleteTransition(activeTransitionId);
      return;
    }

    if (activeNodeId) {
      await onDeleteNode(activeNodeId);
    }
  }, [
    activeNodeId,
    activeTransitionId,
    activeWaypoint,
    deleteActiveWaypoint,
    disabled,
    onDeleteNode,
    onDeleteTransition
  ]);

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
          if (canRedoShortcut) {
            event.preventDefault();
            void onRedoShortcut?.();
          }
          return;
        }

        if (canUndoShortcut) {
          event.preventDefault();
          void onUndoShortcut?.();
        }
        return;
      }

      if (modifierPressed && (key === 'y' || code === 'KeyY')) {
        if (canRedoShortcut) {
          event.preventDefault();
          void onRedoShortcut?.();
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
    canRedoShortcut,
    canUndoShortcut,
    cancelInlineLabelEdit,
    deleteActiveWaypoint,
    disabled,
    editingLabelTransitionId,
    onClearSelection,
    onDeleteNode,
    onDeleteTransition,
    onRedoShortcut,
    onUndoShortcut,
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

  const handleTransitionPointerLeave = useCallback((transitionId: string) => {
    setHoveredTransitionId((current) => (current === transitionId ? null : current));
  }, []);

  const handleTransitionSelect = useCallback((transitionId: string) => {
    containerRef.current?.focus({ preventScroll: true });
    setActiveWaypoint(null);
    onSelectTransition(transitionId);
  }, [onSelectTransition]);

  const handleWaypointSelect = useCallback((transitionId: string, waypointIndex: number) => {
    setActiveWaypoint({ transitionId, waypointIndex });
    onSelectTransition(transitionId);
  }, [onSelectTransition]);

  const handleCloseTransitionPanel = useCallback(() => {
    setActiveWaypoint(null);
    onSelectTransition(null);
  }, [onSelectTransition]);

  return {
    containerRef,
    isPanning: Boolean(panState),
    boardSize,
    viewport,
    containerSize,
    minimapItems,
    centerOnCanvasPoint,
    zoomBy,
    fitToView,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    canvasHandlers: {
      onWheel: handleWheel,
      onPointerDown: handleCanvasPointerDown,
      onPointerMove: handleCanvasPointerMove,
      onPointerUp: handleCanvasPointerUp,
      onPointerCancel: handleCanvasPointerCancel
    },
    boardStyle: {
      width: boardSize.width,
      height: boardSize.height,
      transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`,
      transformOrigin: '0 0',
      backgroundImage:
        'linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
      backgroundColor: 'var(--bg-main)'
    },
    edgesLayerProps: {
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
      onTransitionPointerEnter: setHoveredTransitionId,
      onTransitionPointerLeave: handleTransitionPointerLeave,
      onTransitionSelect: handleTransitionSelect,
      onTransitionLabelEdit: startInlineLabelEdit,
      onAddWaypoint: handleAddWaypoint,
      onInlineLabelValueChange: setEditingLabelValue,
      onInlineLabelCommit: saveInlineLabelEdit,
      onInlineLabelCancel: cancelInlineLabelEdit,
      onWaypointPointerDown: handleWaypointPointerDown,
      onWaypointPointerMove: handleWaypointPointerMove,
      onWaypointPointerUp: handleWaypointPointerUp,
      onWaypointPointerCancel: handleWaypointPointerCancel,
      onWaypointSelect: handleWaypointSelect
    },
    edgeQuickPanelProps: selectedTransition && selectedTransitionPanelPosition ? {
      transition: selectedTransition,
      position: selectedTransitionPanelPosition,
      disabled,
      scale: viewport.scale,
      hasWaypoints: transitionWaypoints(selectedTransition).length > 0 || Boolean(localWaypointOverrides[selectedTransition.id]?.length),
      onUpdate: onUpdateTransition,
      onDelete: onDeleteTransition,
      onResetWaypoints: handleResetWaypoints,
      onClose: handleCloseTransitionPanel
    } : null,
    nodesLayerProps: {
      nodes,
      transitions,
      boundsById,
      nodeTitleById,
      activeNodeId,
      highlightedSourceNodeId: highlightedTransition?.fromNodeId ?? null,
      highlightedTargetNodeId: highlightedTransition?.toNodeId ?? null,
      dragEdgeTargetNodeId: edgeDragState?.targetNodeId ?? null,
      dragNodeId: dragState?.nodeId ?? null,
      validation,
      disabled,
      onSelectNode,
      onNodePointerDown: handleNodePointerDown,
      onNodePointerMove: handleNodePointerMove,
      onNodePointerUp: handleNodePointerUp,
      onNodePointerCancel: handleNodePointerCancel,
      onEdgePointerDown: handleEdgePointerDown,
      onEdgePointerMove: handleEdgePointerMove,
      onEdgePointerUp: handleEdgePointerUp,
      onEdgePointerCancel: handleEdgePointerCancel,
      onResizePointerDown: handleResizePointerDown,
      onResizePointerMove: handleResizePointerMove,
      onResizePointerUp: handleResizePointerUp,
      onResizePointerCancel: handleResizePointerCancel
    },
    runLayout: handleAutoLayout,
    deleteSelected
  };
};
