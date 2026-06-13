import React, { useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';

export interface EditorCanvasPoint {
  x: number;
  y: number;
}

export interface EditorViewportState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface EditorCanvasSize {
  width: number;
  height: number;
}

export interface EditorMinimapItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  active?: boolean;
}

interface EditorViewportControlsProps {
  viewport: EditorViewportState;
  canvasSize: EditorCanvasSize;
  containerSize: EditorCanvasSize;
  items: EditorMinimapItem[];
  disabled?: boolean;
  minScale?: number;
  maxScale?: number;
  minimapLabel?: string;
  fitLabel?: string;
  fitTitle?: string;
  onCenterViewport: (point: EditorCanvasPoint) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitView: () => void;
  children?: React.ReactNode;
}

interface MinimapDragState {
  pointerId: number;
}

const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 140;
const MINIMAP_COMPACT_WIDTH = 160;
const MINIMAP_COMPACT_HEIGHT = 104;

export const EditorViewportControls: React.FC<EditorViewportControlsProps> = ({
  viewport,
  canvasSize,
  containerSize,
  items,
  disabled = false,
  minScale,
  maxScale,
  minimapLabel = 'Карта',
  fitLabel = 'ВПИСАТЬ',
  fitTitle = 'Вписать граф',
  onCenterViewport,
  onZoomOut,
  onZoomIn,
  onFitView,
  children
}) => {
  const minimapRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<MinimapDragState | null>(null);
  const isCompact = canvasSize.width < 1400;
  const width = isCompact ? MINIMAP_COMPACT_WIDTH : MINIMAP_WIDTH;
  const height = isCompact ? MINIMAP_COMPACT_HEIGHT : MINIMAP_HEIGHT;
  const scale = Math.min(width / canvasSize.width, height / canvasSize.height);
  const mapWidth = canvasSize.width * scale;
  const mapHeight = canvasSize.height * scale;
  const mapOffsetX = (width - mapWidth) / 2;
  const mapOffsetY = (height - mapHeight) / 2;
  const viewportWidth = containerSize.width / viewport.scale;
  const viewportHeight = containerSize.height / viewport.scale;
  const viewportX = -viewport.offsetX / viewport.scale;
  const viewportY = -viewport.offsetY / viewport.scale;

  const pointFromEvent = (event: React.PointerEvent<HTMLDivElement>): EditorCanvasPoint | null => {
    const minimap = minimapRef.current;
    if (!minimap || scale <= 0) return null;

    const rect = minimap.getBoundingClientRect();
    const x = (event.clientX - rect.left - mapOffsetX) / scale;
    const y = (event.clientY - rect.top - mapOffsetY) / scale;

    return {
      x: Math.max(0, Math.min(canvasSize.width, x)),
      y: Math.max(0, Math.min(canvasSize.height, y))
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

  const stopDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragState(null);
  };

  return (
    <div
      className="hidden sm:flex absolute top-3 right-3 z-30 flex-col gap-1.5 border border-[var(--border-color)] bg-[var(--bg-surface)]/95 p-2 shadow-xl"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onPointerCancel={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        ref={minimapRef}
        className="relative border border-[var(--border-color)] bg-[var(--bg-main)] cursor-crosshair"
        style={{ width, height, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <div className="absolute left-2 top-2 mono text-[7px] uppercase font-black text-[var(--text-muted)]">
          {minimapLabel}
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
          {items.map((item) => (
            <rect
              key={item.id}
              x={mapOffsetX + item.x * scale}
              y={mapOffsetY + item.y * scale}
              width={Math.max(3, item.width * scale)}
              height={Math.max(3, item.height * scale)}
              fill={item.active ? 'var(--col-red)' : item.color}
              stroke={item.active ? 'white' : 'transparent'}
              strokeWidth={item.active ? 1 : 0}
              opacity={item.active ? 1 : 0.75}
            />
          ))}
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

      <div className="grid grid-cols-[32px_56px_32px_1fr] border border-[var(--border-color)] bg-[var(--bg-main)]">
        <button
          type="button"
          onClick={onZoomOut}
          disabled={disabled || (minScale !== undefined && viewport.scale <= minScale)}
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
          onClick={onZoomIn}
          disabled={disabled || (maxScale !== undefined && viewport.scale >= maxScale)}
          className="h-8 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] disabled:opacity-40"
          title="Увеличить"
        >
          <Plus size={14} />
        </button>
        <button
          type="button"
          onClick={onFitView}
          disabled={disabled}
          className="h-8 inline-flex items-center justify-center gap-2 border-l border-[var(--border-color)] px-3 text-[var(--col-red)] hover:bg-[var(--col-red)] hover:text-white disabled:opacity-40 mono text-[8px] uppercase font-black transition-colors"
          title={fitTitle}
        >
          <Maximize2 size={13} />
          {fitLabel}
        </button>
      </div>
      {children}
    </div>
  );
};
