import React from 'react';
import { EditorToolbarPosition } from './EditorToolbar';

export type EditorPanelSide = 'left' | 'right';
export type EditorPanelPlacement = 'shell' | 'body';

export interface EditorPanelConfig {
  side?: EditorPanelSide;
  placement?: EditorPanelPlacement;
  width?: number | string;
  border?: boolean;
  scroll?: boolean;
  className?: string;
}

export interface EditorShellProps {
  header?: React.ReactNode;
  subHeader?: React.ReactNode;
  toolbar?: React.ReactNode;
  toolbarPosition?: EditorToolbarPosition;
  leftPanel?: React.ReactNode;
  leftPanelConfig?: EditorPanelConfig;
  canvas: React.ReactNode;
  rightPanel?: React.ReactNode;
  rightPanelPlacement?: 'shell' | 'body';
  rightPanelConfig?: EditorPanelConfig;
  errorBanner?: React.ReactNode;
  overlayLayer?: React.ReactNode;
  className?: string;
  canvasClassName?: string;
  panelClassName?: string;
}

const isHorizontalToolbar = (position: EditorToolbarPosition): boolean => position === 'top' || position === 'bottom';

const panelWidthValue = (width: EditorPanelConfig['width'], fallback: string): string =>
  typeof width === 'number' ? `${width}px` : width ?? fallback;

const panelBorderClass = (side: EditorPanelSide, border: boolean): string => {
  if (!border) return '';
  return side === 'left'
    ? 'border-r border-[var(--border-color)]'
    : 'border-l border-[var(--border-color)]';
};

export const EditorPanel: React.FC<{
  children: React.ReactNode;
  config: Required<Pick<EditorPanelConfig, 'side' | 'placement' | 'border' | 'scroll'>> & Omit<EditorPanelConfig, 'side' | 'placement' | 'border' | 'scroll'>;
  fallbackWidth: string;
  panelClassName?: string;
}> = ({ children, config, fallbackWidth, panelClassName = '' }) => (
  <div
    className={`relative z-20 flex h-full min-h-0 shrink-0 flex-col bg-[var(--bg-surface)] ${panelBorderClass(config.side, config.border)} ${config.scroll ? 'overflow-y-auto' : 'overflow-hidden'} ${panelClassName} ${config.className ?? ''}`}
    style={{ width: panelWidthValue(config.width, fallbackWidth) }}
  >
    {children}
  </div>
);

export const EditorShell: React.FC<EditorShellProps> = ({
  header,
  subHeader,
  toolbar,
  toolbarPosition = 'left',
  leftPanel,
  leftPanelConfig,
  canvas,
  rightPanel,
  rightPanelPlacement = 'shell',
  rightPanelConfig,
  errorBanner,
  overlayLayer,
  className = '',
  canvasClassName = '',
  panelClassName = ''
}) => {
  const showTopToolbar = toolbar && toolbarPosition === 'top';
  const showBottomToolbar = toolbar && toolbarPosition === 'bottom';
  const showLeftToolbar = toolbar && toolbarPosition === 'left';
  const showRightToolbar = toolbar && toolbarPosition === 'right';
  const bodyDirection = isHorizontalToolbar(toolbarPosition) ? 'flex-col' : 'flex-row';
  const resolvedLeftPanelConfig = {
    side: 'left' as const,
    placement: leftPanelConfig?.placement ?? 'body',
    width: leftPanelConfig?.width,
    border: leftPanelConfig?.border ?? true,
    scroll: leftPanelConfig?.scroll ?? false,
    className: leftPanelConfig?.className
  };
  const resolvedRightPanelConfig = {
    side: 'right' as const,
    placement: rightPanelConfig?.placement ?? rightPanelPlacement,
    width: rightPanelConfig?.width,
    border: rightPanelConfig?.border ?? true,
    scroll: rightPanelConfig?.scroll ?? false,
    className: rightPanelConfig?.className
  };
  const showBodyRightPanel = rightPanel && resolvedRightPanelConfig.placement === 'body';
  const showShellRightPanel = rightPanel && resolvedRightPanelConfig.placement === 'shell';
  const canvasNode = (
    <div className={`relative flex min-h-0 min-w-0 flex-1 overflow-hidden ${canvasClassName}`}>
      {canvas}
      {overlayLayer && (
        <div className="pointer-events-none absolute inset-0 z-40">
          {overlayLayer}
        </div>
      )}
    </div>
  );
  const contentNode = (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      {leftPanel && (
        <EditorPanel config={resolvedLeftPanelConfig} fallbackWidth="18rem" panelClassName={panelClassName}>
          {leftPanel}
        </EditorPanel>
      )}
      {canvasNode}
      {showBodyRightPanel && (
        <EditorPanel config={resolvedRightPanelConfig} fallbackWidth="20rem" panelClassName={panelClassName}>
          {rightPanel}
        </EditorPanel>
      )}
    </div>
  );

  return (
    <div className={`flex h-full w-full bg-[var(--bg-main)] ${className}`}>
      <div className="flex min-w-0 flex-1 flex-col">
        {header && <div className="shrink-0">{header}</div>}
        {subHeader && <div className="shrink-0">{subHeader}</div>}
        {errorBanner && <div className="shrink-0">{errorBanner}</div>}
        <div className={`flex min-h-0 flex-1 w-full overflow-hidden ${bodyDirection}`}>
          {showTopToolbar && toolbar}
          {showLeftToolbar && toolbar}
          {contentNode}
          {showRightToolbar && toolbar}
          {showBottomToolbar && toolbar}
        </div>
      </div>
      {showShellRightPanel && (
        <EditorPanel config={resolvedRightPanelConfig} fallbackWidth="20rem" panelClassName={panelClassName}>
          {rightPanel}
        </EditorPanel>
      )}
    </div>
  );
};

export default EditorShell;
