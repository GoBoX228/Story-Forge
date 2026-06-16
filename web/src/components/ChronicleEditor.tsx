import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarPlus,
  GripHorizontal,
  Maximize2,
  MousePointer2,
  Settings,
  Trash2
} from 'lucide-react';
import { Chronicle, WorldEvent, WorldEventUpdatePayload } from '../types';
import {
  EditorCanvasPoint,
  EditorMinimapItem,
  EditorViewportControls
} from './EditorViewportControls';
import { EditorShell } from './EditorShell';
import {
  EditorToolbar,
  createEditorToolbarUtilityGroup,
  getNextEditorToolbarPosition,
  type EditorToolbarPosition
} from './EditorToolbar';
import { useEditorViewport } from '../hooks/useEditorViewport';

const MIN_SCALE = 0.45;
const MAX_SCALE = 2.8;
const TIMELINE_PADDING_X = 140;
const TIMELINE_TOP = 180;
const PIXELS_PER_TICK = 12;
const EVENT_CARD_WIDTH = 320;
const EVENT_CARD_HEIGHT = 112;
const LANE_HEIGHT = 136;
const MIN_CANVAS_WIDTH = 1400;
const MIN_CANVAS_HEIGHT = 760;

type TimelineTool = 'select' | 'point' | 'range';

interface ChronicleEditorProps {
  chronicle: Chronicle;
  events: WorldEvent[];
  onBack: () => void;
  onEditChronicle: () => void;
  onCreatePointEvent: (position: number) => void;
  onCreateRangeEvent: (position: number, endPosition: number) => void;
  onEditEvent: (event: WorldEvent) => void;
  onDeleteEvent: (event: WorldEvent) => void;
  onUpdateEvent: (eventId: string, payload: WorldEventUpdatePayload) => Promise<WorldEvent> | void;
}

interface EventLayout {
  event: WorldEvent;
  position: number;
  endPosition: number | null;
  x: number;
  endX: number;
  cardX: number;
  cardY: number;
  lane: number;
  isRange: boolean;
}

interface DragEventState {
  kind: 'event';
  eventId: string;
  pointerId: number;
  startCanvasX: number;
  startPosition: number;
  startEndPosition: number | null;
  previewPosition: number;
  previewEndPosition: number | null;
}

interface PanState {
  kind: 'pan';
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startOffsetX: number;
  startOffsetY: number;
}

const ChronicleEditor: React.FC<ChronicleEditorProps> = ({
  chronicle,
  events,
  onBack,
  onEditChronicle,
  onCreatePointEvent,
  onCreateRangeEvent,
  onEditEvent,
  onDeleteEvent,
  onUpdateEvent
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fittedChronicleRef = useRef<string | null>(null);
  const [tool, setTool] = useState<TimelineTool>('select');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState<EditorToolbarPosition>('left');
  const [dragState, setDragState] = useState<DragEventState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);

  const stepSize = Math.max(1, Number(chronicle.stepSize) || 10);
  const maxEventEnd = useMemo(
    () => Math.max(0, ...events.map((event) => event.endPosition ?? event.position ?? 0)),
    [events]
  );
  const timelineMax = Math.max(stepSize * 10, maxEventEnd + stepSize);
  const axisWidth = timelineMax * PIXELS_PER_TICK;
  const canvasSize = useMemo(
    () => ({
      width: Math.max(MIN_CANVAS_WIDTH, TIMELINE_PADDING_X * 2 + axisWidth),
      height: MIN_CANVAS_HEIGHT
    }),
    [axisWidth]
  );
  const {
    viewport,
    setViewport,
    containerSize,
    screenToCanvasPoint,
    centerOnCanvasPoint,
    zoomBy,
    fitToView
  } = useEditorViewport({
    containerRef,
    canvasSize,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    fitPadding: 64
  });

  const positionToX = useCallback(
    (position: number) => TIMELINE_PADDING_X + Math.max(0, position) * PIXELS_PER_TICK,
    []
  );

  const snapPosition = useCallback(
    (position: number) => {
      const snapped = Math.round(position / stepSize) * stepSize;
      return Math.max(0, Math.min(timelineMax, snapped));
    },
    [stepSize, timelineMax]
  );

  const xToPosition = useCallback(
    (x: number) => snapPosition((x - TIMELINE_PADDING_X) / PIXELS_PER_TICK),
    [snapPosition]
  );

  useEffect(() => {
    if (!containerSize.width || !containerSize.height || fittedChronicleRef.current === chronicle.id) return;

    fitToView();
    fittedChronicleRef.current = chronicle.id;
  }, [chronicle.id, containerSize.height, containerSize.width, fitToView]);

  const eventLayouts = useMemo<EventLayout[]>(() => {
    const laneRightEdges: number[] = [];

    return [...events]
      .sort((left, right) => left.position - right.position || left.title.localeCompare(right.title))
      .map((event) => {
        const preview = dragState?.eventId === event.id ? dragState : null;
        const position = preview?.previewPosition ?? event.position ?? 0;
        const endPosition = preview?.previewEndPosition ?? event.endPosition ?? null;
        const isRange = endPosition !== null && endPosition > position;
        const x = positionToX(position);
        const endX = isRange ? positionToX(endPosition) : x;
        const visualLeft = Math.max(TIMELINE_PADDING_X / 2, x - 44);
        const visualRight = Math.max(x + EVENT_CARD_WIDTH, endX + 44);
        let lane = laneRightEdges.findIndex((rightEdge) => visualLeft > rightEdge + 24);

        if (lane === -1) {
          lane = laneRightEdges.length;
          laneRightEdges.push(visualRight);
        } else {
          laneRightEdges[lane] = visualRight;
        }

        const cardX = Math.max(24, Math.min(canvasSize.width - EVENT_CARD_WIDTH - 24, x - 48));
        const cardY = TIMELINE_TOP + 72 + lane * LANE_HEIGHT;

        return {
          event,
          position,
          endPosition,
          x,
          endX,
          cardX,
          cardY,
          lane,
          isRange
        };
      });
  }, [canvasSize.width, dragState, events, positionToX]);

  const expandedCanvasSize = useMemo(
    () => ({
      width: canvasSize.width,
      height: Math.max(canvasSize.height, TIMELINE_TOP + 240 + eventLayouts.length * 32 + Math.max(0, ...eventLayouts.map((item) => item.lane)) * LANE_HEIGHT)
    }),
    [canvasSize.height, canvasSize.width, eventLayouts]
  );

  const minimapItems = useMemo<EditorMinimapItem[]>(
    () => eventLayouts.map((item) => ({
      id: item.event.id,
      x: item.cardX,
      y: item.cardY,
      width: item.isRange ? Math.max(EVENT_CARD_WIDTH, item.endX - item.x + EVENT_CARD_WIDTH / 2) : EVENT_CARD_WIDTH,
      height: EVENT_CARD_HEIGHT,
      color: item.isRange ? 'var(--col-purple)' : 'var(--col-red)',
      active: item.event.id === selectedEventId
    })),
    [eventLayouts, selectedEventId]
  );

  useEffect(() => {
    if (selectedEventId && !events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(null);
    }
  }, [events, selectedEventId]);

  const majorTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let value = 0; value <= timelineMax; value += stepSize) {
      ticks.push(value);
    }
    return ticks;
  }, [stepSize, timelineMax]);

  const minorTicks = useMemo(() => {
    const ticks: number[] = [];
    const minorStep = stepSize / 4;
    if (minorStep <= 0) return ticks;

    for (let value = minorStep; value < timelineMax; value += minorStep) {
      if (Math.abs(value / stepSize - Math.round(value / stepSize)) > 0.001) {
        ticks.push(value);
      }
    }

    return ticks;
  }, [stepSize, timelineMax]);

  const viewportCenterPosition = useCallback(() => {
    const centerX = ((containerSize.width / 2) - viewport.offsetX) / viewport.scale;
    return xToPosition(centerX);
  }, [containerSize.width, viewport.offsetX, viewport.scale, xToPosition]);

  const createPointAt = useCallback((position: number) => {
    onCreatePointEvent(snapPosition(position));
    setTool('select');
  }, [onCreatePointEvent, snapPosition]);

  const createRangeAt = useCallback((position: number) => {
    const start = Math.min(Math.max(0, timelineMax - stepSize), snapPosition(position));
    const end = Math.max(start + stepSize, snapPosition(start + stepSize));
    onCreateRangeEvent(start, Math.min(timelineMax, end));
    setTool('select');
  }, [onCreateRangeEvent, snapPosition, stepSize, timelineMax]);

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-timeline-interactive="true"]')) return;

    if (tool === 'point' || tool === 'range') {
      const point = screenToCanvasPoint(event.clientX, event.clientY);
      const position = xToPosition(point.x);
      if (tool === 'point') createPointAt(position);
      else createRangeAt(position);
      return;
    }

    if (tool === 'select') {
      setSelectedEventId(null);
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setPanState({
      kind: 'pan',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: viewport.offsetX,
      startOffsetY: viewport.offsetY
    });
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panState || panState.pointerId !== event.pointerId) return;

    setViewport((current) => ({
      ...current,
      offsetX: panState.startOffsetX + event.clientX - panState.startClientX,
      offsetY: panState.startOffsetY + event.clientY - panState.startClientY
    }));
  };

  const stopPanning = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panState || panState.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setPanState(null);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? 0.9 : 1.1, { x: event.clientX, y: event.clientY });
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-timeline-interactive="true"]')) return;

    const point = screenToCanvasPoint(event.clientX, event.clientY);
    createPointAt(xToPosition(point.x));
  };

  const beginEventDrag = (event: React.PointerEvent<HTMLDivElement>, layout: EventLayout) => {
    if (tool !== 'select' || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = screenToCanvasPoint(event.clientX, event.clientY);
    setSelectedEventId(layout.event.id);

    setDragState({
      kind: 'event',
      eventId: layout.event.id,
      pointerId: event.pointerId,
      startCanvasX: point.x,
      startPosition: layout.event.position,
      startEndPosition: layout.event.endPosition ?? null,
      previewPosition: layout.event.position,
      previewEndPosition: layout.event.endPosition ?? null
    });
  };

  const moveEventDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const point = screenToCanvasPoint(event.clientX, event.clientY);
    const deltaPosition = (point.x - dragState.startCanvasX) / PIXELS_PER_TICK;
    const isRange = dragState.startEndPosition !== null && dragState.startEndPosition > dragState.startPosition;
    const rangeLength = isRange ? Math.max(stepSize, dragState.startEndPosition! - dragState.startPosition) : null;
    const maxStart = rangeLength === null ? timelineMax : Math.max(0, timelineMax - rangeLength);
    const nextPosition = Math.max(0, Math.min(maxStart, snapPosition(dragState.startPosition + deltaPosition)));
    const nextEndPosition = rangeLength === null ? null : nextPosition + rangeLength;

    setDragState((current) => current && current.pointerId === event.pointerId
      ? {
          ...current,
          previewPosition: nextPosition,
          previewEndPosition: nextEndPosition
        }
      : current
    );
  };

  const stopEventDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);

    const changed = dragState.previewPosition !== dragState.startPosition
      || dragState.previewEndPosition !== dragState.startEndPosition;

    if (changed) {
      void onUpdateEvent(dragState.eventId, {
        position: dragState.previewPosition,
        endPosition: dragState.previewEndPosition
      });
    }

    setDragState(null);
  };

  const handleToolbarAction = (action: string) => {
    if (action === 'select') {
      setTool('select');
      return;
    }

    if (action === 'point') {
      setTool((current) => current === 'point' ? 'select' : 'point');
      return;
    }

    if (action === 'range') {
      setTool((current) => current === 'range' ? 'select' : 'range');
      return;
    }

    if (action === 'create-point') {
      createPointAt(viewportCenterPosition());
      return;
    }

    if (action === 'create-range') {
      createRangeAt(viewportCenterPosition());
      return;
    }

    if (action === 'fit') {
      fitToView();
      return;
    }

    if (action === 'delete-event') {
      const selectedEvent = events.find((event) => event.id === selectedEventId);
      if (!selectedEvent) return;

      onDeleteEvent(selectedEvent);
      setSelectedEventId(null);
      return;
    }

    if (action === 'toolbar-position') {
      setToolbarPosition((current) => getNextEditorToolbarPosition(current));
    }
  };

  return (
    <EditorShell
      className="h-full min-h-0 text-[var(--text-main)]"
      header={(
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-6 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--border-color)] text-[var(--text-muted)] transition-colors hover:border-[var(--col-purple)] hover:text-[var(--col-purple)]"
            title="Вернуться в Атлас"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <div className="mono text-[10px] uppercase tracking-[0.35em] text-[var(--text-muted)]">
              АТЛАС / РЕДАКТОР ХРОНИКИ
            </div>
            <h1 className="truncate text-3xl font-black uppercase leading-none text-[var(--text-main)]">
              {chronicle.title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-4">
          <div className="mono text-[10px] uppercase font-black text-[var(--text-muted)]">
            {events.length} событий
          </div>
          <div className="mono text-[10px] uppercase font-black text-[var(--text-muted)]">
            СОХРАНЕНО
          </div>
          <button
            type="button"
            onClick={onEditChronicle}
            className="inline-flex h-11 items-center gap-2 border border-[var(--col-purple)] px-5 mono text-[10px] uppercase font-black text-[var(--col-purple)] transition-colors hover:bg-[var(--col-purple)] hover:text-black"
          >
            <Settings size={15} /> ПАРАМЕТРЫ
          </button>
        </div>
        </div>
      )}
      toolbarPosition={toolbarPosition}
      toolbar={(
        <EditorToolbar
          position={toolbarPosition}
          onAction={handleToolbarAction}
          groups={[
            {
              id: 'timeline-tools',
              items: [
                { id: 'select', icon: MousePointer2, title: 'Выбор и перемещение', active: tool === 'select' },
                { id: 'point', icon: CalendarPlus, title: 'Инструмент события-точки', active: tool === 'point' },
                { id: 'range', icon: GripHorizontal, title: 'Инструмент события-диапазона', active: tool === 'range' }
              ]
            },
            {
              id: 'create',
              items: [
                { id: 'create-point', icon: CalendarPlus, title: 'Создать точку в центре экрана' },
                { id: 'create-range', icon: GripHorizontal, title: 'Создать диапазон в центре экрана' }
              ]
            },
            { id: 'timeline-spacer', spacer: true },
            {
              id: 'viewport',
              items: [
                { id: 'fit', icon: Maximize2, title: 'Вписать линию' }
              ]
            },
            ...createEditorToolbarUtilityGroup({
              delete: {
                action: 'delete-event',
                title: 'Удалить выбранное событие',
                disabled: !selectedEventId
              },
              position: {
                action: 'toolbar-position',
                title: 'Положение панели'
              }
            })
          ]}
        />
      )}
      canvas={(
        <div
          ref={containerRef}
          className={`relative h-full w-full min-h-0 min-w-0 overflow-hidden bauhaus-bg ${panState ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={stopPanning}
          onPointerCancel={stopPanning}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: expandedCanvasSize.width,
              height: expandedCanvasSize.height,
              transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`
            }}
          >
            <div
              className="relative border border-[var(--border-color)] bg-[var(--bg-main)]"
              style={{ width: expandedCanvasSize.width, height: expandedCanvasSize.height }}
            >
              <div className="absolute left-0 right-0 top-0 h-full opacity-80 bauhaus-bg" />
              <div
                className="absolute h-px bg-[var(--col-purple)]"
                style={{
                  left: TIMELINE_PADDING_X,
                  top: TIMELINE_TOP,
                  width: axisWidth
                }}
              />

              {minorTicks.map((tick) => (
                <div
                  key={`minor-${tick}`}
                  className="absolute w-px bg-[var(--border-color)]/70"
                  style={{
                    left: positionToX(tick),
                    top: TIMELINE_TOP - 10,
                    height: 20
                  }}
                />
              ))}

              {majorTicks.map((tick) => (
                <div key={`major-${tick}`} className="absolute" style={{ left: positionToX(tick), top: TIMELINE_TOP - 28 }}>
                  <div className="h-14 w-px bg-[var(--col-purple)]/80" />
                  <div className="mono mt-2 -translate-x-1/2 text-[9px] uppercase font-black text-[var(--text-muted)]">
                    {tick === 0 && chronicle.startLabel ? chronicle.startLabel : tick === timelineMax && chronicle.endLabel ? chronicle.endLabel : tick}
                  </div>
                </div>
              ))}

              {events.length === 0 && (
                <div
                  className="absolute left-1/2 top-[290px] -translate-x-1/2 mono text-[10px] uppercase font-black text-[var(--text-muted)]"
                  data-timeline-interactive="true"
                >
                  На линии пока нет событий
                </div>
              )}

              {eventLayouts.map((layout) => (
                <TimelineEventCard
                  key={layout.event.id}
                  layout={layout}
                  selected={layout.event.id === selectedEventId}
                  onSelect={(event) => setSelectedEventId(event.id)}
                  onPointerDown={beginEventDrag}
                  onPointerMove={moveEventDrag}
                  onPointerUp={stopEventDrag}
                  onPointerCancel={stopEventDrag}
                  onOpen={onEditEvent}
                  onDelete={onDeleteEvent}
                />
              ))}
            </div>
          </div>

          <EditorViewportControls
            viewport={viewport}
            canvasSize={expandedCanvasSize}
            containerSize={containerSize}
            items={minimapItems}
            minScale={MIN_SCALE}
            maxScale={MAX_SCALE}
            minimapLabel="Карта"
            fitLabel="ВПИСАТЬ"
            onCenterViewport={centerOnCanvasPoint}
            onZoomOut={() => zoomBy(0.9)}
            onZoomIn={() => zoomBy(1.1)}
            onFitView={fitToView}
          />
        </div>
      )}
    />
  );
};

const TimelineEventCard: React.FC<{
  layout: EventLayout;
  selected: boolean;
  onSelect: (event: WorldEvent) => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>, layout: EventLayout) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
  onOpen: (event: WorldEvent) => void;
  onDelete: (event: WorldEvent) => void;
}> = ({
  layout,
  selected,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onOpen,
  onDelete
}) => (
  <>
    <div
      className="absolute h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 border-2 border-[var(--col-purple)] bg-[var(--bg-main)]"
      style={{ left: layout.x, top: TIMELINE_TOP }}
    />
    {layout.isRange && (
      <div
        className="absolute h-[7px] -translate-y-1/2 bg-[var(--col-purple)]/75"
        style={{ left: layout.x, top: TIMELINE_TOP, width: Math.max(18, layout.endX - layout.x) }}
      />
    )}
    <div
      role="button"
      tabIndex={0}
      data-timeline-interactive="true"
      onPointerDown={(event) => {
        if (event.button === 0) {
          onSelect(layout.event);
        }
        onPointerDown(event, layout);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(layout.event);
        }
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpen(layout.event);
      }}
      className={`absolute cursor-move border bg-[var(--bg-surface)] p-4 text-left transition-colors hover:border-[var(--col-purple)] ${
        selected ? 'border-[var(--col-purple)] shadow-[0_0_0_1px_var(--col-purple)]' : 'border-[var(--border-color)]'
      }`}
      style={{
        left: layout.cardX,
        top: layout.cardY,
        width: EVENT_CARD_WIDTH,
        height: EVENT_CARD_HEIGHT
      }}
    >
      <div className="mono text-[8px] uppercase font-black text-[var(--col-purple)]">
        {layout.event.startLabel || `Позиция ${layout.position}`}
        {layout.endPosition !== null ? ` / ${layout.event.endLabel || layout.endPosition}` : ''}
      </div>
      <div className="mt-2 pr-8 text-sm font-black uppercase text-[var(--text-main)]">{layout.event.title}</div>
      <p className="mt-2 line-clamp-2 mono text-[9px] leading-relaxed text-[var(--text-muted)]">
        {layout.event.description || 'Описание пока не добавлено.'}
      </p>
      <button
        type="button"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          onDelete(layout.event);
        }}
        className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-[var(--col-red)]"
        title="Удалить событие"
      >
        <Trash2 size={14} />
      </button>
    </div>
  </>
);

export default ChronicleEditor;
