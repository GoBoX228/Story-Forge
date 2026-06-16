import React, { useImperativeHandle } from 'react';
import { EditorViewportControls } from '../EditorViewportControls';
import { GraphEdgeQuickPanel } from './graphCanvas/GraphEdgeQuickPanel';
import { GraphEdgesLayer } from './graphCanvas/GraphEdgesLayer';
import { GraphNodesLayer } from './graphCanvas/GraphNodesLayer';
import {
  type GraphCanvasHandle,
  type GraphCanvasProps,
  type GraphLayoutDirection
} from './graphCanvas/graphCanvasTypes';
import { useGraphCanvasController } from './graphCanvas/useGraphCanvasController';

export type { GraphCanvasHandle, GraphLayoutDirection } from './graphCanvas/graphCanvasTypes';

export const GraphCanvas = React.forwardRef<GraphCanvasHandle, GraphCanvasProps>((props, ref) => {
  const controller = useGraphCanvasController(props);
  const disabled = props.disabled ?? false;

  useImperativeHandle(ref, () => ({
    runLayout: (direction: GraphLayoutDirection) => {
      void controller.runLayout(direction);
    },
    deleteSelected: () => {
      void controller.deleteSelected();
    }
  }), [controller]);

  return (
    <div className="flex flex-1 min-w-[360px] min-h-0 bg-[var(--bg-main)]">
      <div
        ref={controller.containerRef}
        tabIndex={disabled ? -1 : 0}
        className={`flex-1 bg-[var(--bg-main)] overflow-hidden relative ${controller.isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={controller.canvasHandlers.onWheel}
        onPointerDown={controller.canvasHandlers.onPointerDown}
        onPointerMove={controller.canvasHandlers.onPointerMove}
        onPointerUp={controller.canvasHandlers.onPointerUp}
        onPointerCancel={controller.canvasHandlers.onPointerCancel}
        style={{ touchAction: 'none' }}
      >
        {props.nodes.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center p-8 text-center">
            <div className="max-w-sm border border-dashed border-[var(--border-color)] p-8">
              <div className="mono text-[10px] uppercase font-black text-[var(--text-muted)]">
                Создайте первый узел, чтобы увидеть граф
              </div>
            </div>
          </div>
        ) : (
          <>
            <EditorViewportControls
              viewport={controller.viewport}
              canvasSize={controller.boardSize}
              containerSize={controller.containerSize}
              items={controller.minimapItems}
              disabled={disabled}
              minScale={controller.minScale}
              maxScale={controller.maxScale}
              minimapLabel={'\u041a\u0430\u0440\u0442\u0430'}
              fitLabel={'\u0412\u041f\u0418\u0421\u0410\u0422\u042c'}
              onCenterViewport={controller.centerOnCanvasPoint}
              onZoomOut={() => controller.zoomBy(0.85)}
              onZoomIn={() => controller.zoomBy(1.15)}
              onFitView={controller.fitToView}
            />

            <div
              className="absolute top-0 left-0"
              style={controller.boardStyle}
            >
              <GraphEdgesLayer {...controller.edgesLayerProps} />

              {controller.edgeQuickPanelProps && (
                <GraphEdgeQuickPanel {...controller.edgeQuickPanelProps} />
              )}

              <GraphNodesLayer {...controller.nodesLayerProps} />
            </div>
          </>
        )}
      </div>
    </div>
  );
});

GraphCanvas.displayName = 'GraphCanvas';
