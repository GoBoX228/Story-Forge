import { RefObject, useCallback, useEffect, useState } from 'react';
import {
  EditorCanvasPoint,
  EditorCanvasSize,
  EditorViewportState
} from '../components/EditorViewportControls';

interface EditorViewportBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

interface UseEditorViewportOptions {
  containerRef: RefObject<HTMLElement | null>;
  canvasSize: EditorCanvasSize;
  minScale: number;
  maxScale: number;
  fitPadding?: number;
  fitScaleMultiplier?: number;
  initialViewport?: EditorViewportState;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const DEFAULT_INITIAL_VIEWPORT: EditorViewportState = { offsetX: 0, offsetY: 0, scale: 1 };

export const useEditorViewport = ({
  containerRef,
  canvasSize,
  minScale,
  maxScale,
  fitPadding = 0,
  fitScaleMultiplier = 1,
  initialViewport = DEFAULT_INITIAL_VIEWPORT
}: UseEditorViewportOptions) => {
  const [viewport, setViewport] = useState<EditorViewportState>(initialViewport);
  const [containerSize, setContainerSize] = useState<EditorCanvasSize>({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setContainerSize((current) => {
        const next = {
          width: container.clientWidth,
          height: container.clientHeight
        };

        return current.width === next.width && current.height === next.height ? current : next;
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [containerRef]);

  const screenToCanvasPoint = useCallback((clientX: number, clientY: number): EditorCanvasPoint => {
    const rect = containerRef.current?.getBoundingClientRect();

    return {
      x: ((clientX - (rect?.left ?? 0)) - viewport.offsetX) / viewport.scale,
      y: ((clientY - (rect?.top ?? 0)) - viewport.offsetY) / viewport.scale
    };
  }, [containerRef, viewport.offsetX, viewport.offsetY, viewport.scale]);

  const centerOnCanvasPoint = useCallback((point: EditorCanvasPoint) => {
    setViewport((current) => ({
      ...current,
      offsetX: containerSize.width / 2 - point.x * current.scale,
      offsetY: containerSize.height / 2 - point.y * current.scale
    }));
  }, [containerSize.height, containerSize.width]);

  const zoomToScale = useCallback((nextScaleValue: number, clientPoint?: EditorCanvasPoint) => {
    setViewport((current) => {
      const nextScale = clamp(nextScaleValue, minScale, maxScale);
      const rect = containerRef.current?.getBoundingClientRect();
      const point = clientPoint && rect
        ? {
            x: clientPoint.x - rect.left,
            y: clientPoint.y - rect.top
          }
        : {
            x: containerSize.width / 2,
            y: containerSize.height / 2
          };
      const canvasX = (point.x - current.offsetX) / current.scale;
      const canvasY = (point.y - current.offsetY) / current.scale;

      return {
        scale: nextScale,
        offsetX: point.x - canvasX * nextScale,
        offsetY: point.y - canvasY * nextScale
      };
    });
  }, [containerRef, containerSize.height, containerSize.width, maxScale, minScale]);

  const zoomAtClientPoint = useCallback((clientX: number, clientY: number, nextScale: number) => {
    zoomToScale(nextScale, { x: clientX, y: clientY });
  }, [zoomToScale]);

  const zoomBy = useCallback((factor: number, clientPoint?: EditorCanvasPoint) => {
    setViewport((current) => {
      const nextScale = clamp(current.scale * factor, minScale, maxScale);
      const rect = containerRef.current?.getBoundingClientRect();
      const point = clientPoint && rect
        ? {
            x: clientPoint.x - rect.left,
            y: clientPoint.y - rect.top
          }
        : {
            x: containerSize.width / 2,
            y: containerSize.height / 2
          };
      const canvasX = (point.x - current.offsetX) / current.scale;
      const canvasY = (point.y - current.offsetY) / current.scale;

      return {
        scale: nextScale,
        offsetX: point.x - canvasX * nextScale,
        offsetY: point.y - canvasY * nextScale
      };
    });
  }, [containerRef, containerSize.height, containerSize.width, maxScale, minScale]);

  const fitToView = useCallback((bounds?: EditorViewportBounds | null) => {
    if (!containerSize.width || !containerSize.height) return;

    const target = bounds ?? {
      minX: 0,
      minY: 0,
      width: canvasSize.width,
      height: canvasSize.height
    };

    if (target.width <= 0 || target.height <= 0) return;

    const availableWidth = Math.max(1, containerSize.width - fitPadding);
    const availableHeight = Math.max(1, containerSize.height - fitPadding);
    const nextScale = clamp(
      Math.min(availableWidth / target.width, availableHeight / target.height) * fitScaleMultiplier,
      minScale,
      maxScale
    );

    setViewport({
      scale: nextScale,
      offsetX: (containerSize.width - target.width * nextScale) / 2 - target.minX * nextScale,
      offsetY: (containerSize.height - target.height * nextScale) / 2 - target.minY * nextScale
    });
  }, [
    canvasSize.height,
    canvasSize.width,
    containerSize.height,
    containerSize.width,
    fitPadding,
    fitScaleMultiplier,
    maxScale,
    minScale
  ]);

  const panBy = useCallback((deltaX: number, deltaY: number) => {
    setViewport((current) => ({
      ...current,
      offsetX: current.offsetX + deltaX,
      offsetY: current.offsetY + deltaY
    }));
  }, []);

  const resetViewport = useCallback(() => {
    setViewport(initialViewport);
  }, [initialViewport]);

  return {
    viewport,
    setViewport,
    containerSize,
    screenToCanvasPoint,
    centerOnCanvasPoint,
    zoomAtClientPoint,
    zoomToScale,
    zoomBy,
    fitToView,
    panBy,
    resetViewport
  };
};
