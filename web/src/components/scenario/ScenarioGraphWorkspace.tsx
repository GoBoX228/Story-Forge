import React from 'react';
import { AlertTriangle, ArrowDown, ArrowRight, ListTree, RefreshCw, SlidersHorizontal, Redo2, Undo2 } from 'lucide-react';
import {
  Asset,
  Character,
  Faction,
  Item,
  MapData,
  ScenarioNode,
  ScenarioNodeConfig,
  ScenarioNodeEntityLink,
  ScenarioNodeEntityLinkCreatePayload,
  ScenarioNodeEntityTargetType,
  ScenarioNodeType,
  ScenarioTransition,
  ScenarioTransitionCondition,
  ScenarioTransitionMetadata,
  ScenarioTransitionType,
  WorldEvent,
  WorldLocation
} from '../../types';
import { Button } from '../UI';
import { EditorShell } from '../EditorShell';
import {
  EditorToolbar,
  createEditorToolbarUtilityGroup,
  getNextEditorToolbarPosition,
  type EditorToolbarEntry,
  type EditorToolbarPosition
} from '../EditorToolbar';
import { GraphCanvas, type GraphCanvasHandle, type GraphLayoutDirection } from './GraphCanvas';
import { GraphInspector, GraphInspectorTab } from './GraphInspector';
import { GraphNodeList } from './GraphNodeList';
import { GraphValidationIssue, GraphValidationResult } from './graphValidation';

interface ScenarioGraphWorkspaceProps {
  nodes: ScenarioNode[];
  transitions: ScenarioTransition[];
  selectedNode: ScenarioNode | null;
  selectedNodeTransitions: ScenarioTransition[];
  activeNodeId: string | null;
  activeTransitionId: string | null;
  validation: GraphValidationResult;
  graphError: string | null;
  graphLoading: boolean;
  graphActionPending: boolean;
  nodeListOpen: boolean;
  inspectorOpen: boolean;
  inspectorTab: GraphInspectorTab;
  newNodeType: ScenarioNodeType;
  entityLinks: ScenarioNodeEntityLink[];
  entityLinksLoading: boolean;
  canUndo: boolean;
  canRedo: boolean;
  activeScenarioId: string | null;
  maps: MapData[];
  characters: Character[];
  items: Item[];
  scenarioCharacters: Character[];
  scenarioMaps: MapData[];
  scenarioItems: Item[];
  assets: Asset[];
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
  onReloadGraph: (scenarioId: string) => void;
  onToggleNodeList: () => void;
  onToggleInspector: () => void;
  onInspectorTabChange: (tab: GraphInspectorTab) => void;
  onNewNodeTypeChange: (type: ScenarioNodeType) => void;
  onCreateNode: () => void;
  onSelectNode: (nodeId: string) => void;
  onSelectTransition: (transitionId: string | null) => void;
  onClearSelection: () => void;
  onMoveNode: (nodeId: string, position: Record<string, unknown>, previousPosition?: Record<string, unknown>) => void;
  onLayoutNodes: (updates: { nodeId: string; position: Record<string, unknown> }[]) => void;
  onCreateTransitionBetween: (fromNodeId: string, toNodeId: string) => void;
  onUpdateNode: (
    nodeId: string,
    payload: { type: ScenarioNodeType; title: string; content: string; config: ScenarioNodeConfig }
  ) => void;
  onDeleteNode: (nodeId: string) => void;
  onCreateEntityLink: (payload: ScenarioNodeEntityLinkCreatePayload) => void;
  onDeleteEntityLink: (linkId: string) => void;
  onOpenEntityLink?: (targetType: ScenarioNodeEntityTargetType, targetId: string) => void;
  onCreateTransition: (toNodeId: string) => void;
  onUpdateTransition: (
    transitionId: string,
    payload: {
      type: ScenarioTransitionType;
      label: string;
      condition: ScenarioTransitionCondition;
      metadata?: ScenarioTransitionMetadata;
    }
  ) => void;
  onDeleteTransition: (transitionId: string) => void;
  onSelectValidationIssue: (issue: GraphValidationIssue) => void;
  onUndo: () => void;
  onRedo: () => void;
  onCloseInspector: () => void;
}

export const ScenarioGraphWorkspace: React.FC<ScenarioGraphWorkspaceProps> = ({
  nodes,
  transitions,
  selectedNode,
  selectedNodeTransitions,
  activeNodeId,
  activeTransitionId,
  validation,
  graphError,
  graphLoading,
  graphActionPending,
  nodeListOpen,
  inspectorOpen,
  inspectorTab,
  newNodeType,
  entityLinks,
  entityLinksLoading,
  canUndo,
  canRedo,
  activeScenarioId,
  maps,
  characters,
  items,
  scenarioCharacters,
  scenarioMaps,
  scenarioItems,
  assets,
  locations,
  factions,
  events,
  onReloadGraph,
  onToggleNodeList,
  onToggleInspector,
  onInspectorTabChange,
  onNewNodeTypeChange,
  onCreateNode,
  onSelectNode,
  onSelectTransition,
  onClearSelection,
  onMoveNode,
  onLayoutNodes,
  onCreateTransitionBetween,
  onUpdateNode,
  onDeleteNode,
  onCreateEntityLink,
  onDeleteEntityLink,
  onOpenEntityLink,
  onCreateTransition,
  onUpdateTransition,
  onDeleteTransition,
  onSelectValidationIssue,
  onUndo,
  onRedo,
  onCloseInspector
}) => {
  const controlsDisabled = graphLoading || graphActionPending;
  const [toolbarPosition, setToolbarPosition] = React.useState<EditorToolbarPosition>('left');
  const [layoutDirection, setLayoutDirection] = React.useState<GraphLayoutDirection>('horizontal');
  const graphCanvasRef = React.useRef<GraphCanvasHandle | null>(null);
  const toolbarGroups = React.useMemo<EditorToolbarEntry[]>(() => [
    {
      id: 'workspace',
      items: [
        {
          id: 'node-list',
          action: 'toggle-node-list',
          icon: ListTree,
          title: 'Узлы',
          active: nodeListOpen,
          disabled: controlsDisabled
        },
        {
          id: 'inspector',
          action: 'toggle-inspector',
          icon: SlidersHorizontal,
          title: 'Инспектор',
          active: inspectorOpen,
          disabled: controlsDisabled
        }
      ]
    },
    {
      id: 'layout-direction',
      items: [
        {
          id: 'layout-horizontal',
          action: 'layout-horizontal',
          icon: ArrowRight,
          title: 'Упорядочить слева направо',
          active: layoutDirection === 'horizontal',
          disabled: controlsDisabled || nodes.length === 0
        },
        {
          id: 'layout-vertical',
          action: 'layout-vertical',
          icon: ArrowDown,
          title: 'Упорядочить сверху вниз',
          active: layoutDirection === 'vertical',
          disabled: controlsDisabled || nodes.length === 0
        }
      ]
    },
    {
      id: 'history',
      items: [
        { id: 'undo', action: 'undo', icon: Undo2, title: 'Отменить', disabled: controlsDisabled || !canUndo },
        { id: 'redo', action: 'redo', icon: Redo2, title: 'Повторить', disabled: controlsDisabled || !canRedo }
      ]
    },
    ...createEditorToolbarUtilityGroup({
      delete: {
        action: 'delete-selected',
        title: 'Удалить выбранное',
        disabled: controlsDisabled || (!activeNodeId && !activeTransitionId)
      },
      position: {
        action: 'toolbar-position',
        title: 'Положение панели'
      }
    })
  ], [
    activeNodeId,
    activeTransitionId,
    canRedo,
    canUndo,
    controlsDisabled,
    inspectorOpen,
    layoutDirection,
    nodeListOpen,
    nodes.length
  ]);

  const handleToolbarAction = (action: string) => {
    if (action === 'toggle-node-list') {
      onToggleNodeList();
      return;
    }

    if (action === 'toggle-inspector') {
      onToggleInspector();
      return;
    }

    if (action === 'toolbar-position') {
      setToolbarPosition((current) => getNextEditorToolbarPosition(current));
      return;
    }

    if (action === 'layout-horizontal' || action === 'layout-vertical') {
      const nextDirection = action === 'layout-horizontal' ? 'horizontal' : 'vertical';
      setLayoutDirection(nextDirection);
      graphCanvasRef.current?.runLayout(nextDirection);
      return;
    }

    if (action === 'undo') {
      void onUndo();
      return;
    }

    if (action === 'redo') {
      void onRedo();
      return;
    }

    if (action === 'delete-selected') {
      graphCanvasRef.current?.deleteSelected();
    }
  };

  return (
    <EditorShell
      className="flex-1 min-h-0"
      header={(
        <div className="h-12 shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-4 flex items-center justify-between gap-4">
        <div className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">
          {graphLoading ? 'Загрузка графа...' : `${nodes.length} узлов / ${transitions.length} переходов`}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={validation.hasErrors ? 'accent-red' : 'accent-yellow'}
            size="sm"
            inverted
            onClick={() => {
              onInspectorTabChange('validation');
              if (!inspectorOpen) onToggleInspector();
            }}
          >
            <AlertTriangle size={13} /> Проверка
            {(validation.errorCount > 0 || validation.warningCount > 0) && (
              <span className="ml-1 mono text-[9px] font-black">
                {validation.errorCount > 0 ? validation.errorCount : validation.warningCount}
              </span>
            )}
          </Button>
          <Button
            variant="accent-red"
            size="sm"
            inverted
            disabled={controlsDisabled || !activeScenarioId}
            onClick={() => activeScenarioId && onReloadGraph(activeScenarioId)}
          >
            <RefreshCw size={13} className={graphLoading ? 'animate-spin' : ''} /> Перезагрузить
          </Button>
        </div>
        </div>
      )}
      errorBanner={graphError && (
        <div className="shrink-0 border-b border-[var(--col-red)] bg-[var(--col-red)]/10 px-4 py-3 mono text-[10px] uppercase font-black text-[var(--col-red)]">
          {graphError}
        </div>
      )}
      toolbar={(
        <EditorToolbar
          position={toolbarPosition}
          groups={toolbarGroups}
          onAction={handleToolbarAction}
        />
      )}
      toolbarPosition={toolbarPosition}
      leftPanelConfig={{ width: '18rem', scroll: false }}
      leftPanel={nodeListOpen && (
        <GraphNodeList
          nodes={nodes}
          transitions={transitions}
          activeNodeId={activeNodeId}
          newNodeType={newNodeType}
          loading={graphLoading}
          disabled={graphActionPending}
          onNewNodeTypeChange={onNewNodeTypeChange}
          onCreateNode={onCreateNode}
          onSelectNode={onSelectNode}
        />
      )}
      canvas={(
        <GraphCanvas
          ref={graphCanvasRef}
          nodes={nodes}
          transitions={transitions}
          activeNodeId={activeNodeId}
          activeTransitionId={activeTransitionId}
          validation={validation}
          disabled={controlsDisabled}
          onSelectNode={onSelectNode}
          onSelectTransition={onSelectTransition}
          onClearSelection={onClearSelection}
          onMoveNode={onMoveNode}
          onLayoutNodes={onLayoutNodes}
          onCreateTransition={onCreateTransitionBetween}
          onUpdateTransition={onUpdateTransition}
          onDeleteNode={onDeleteNode}
          onDeleteTransition={onDeleteTransition}
          canUndoShortcut={canUndo}
          canRedoShortcut={canRedo}
          onUndoShortcut={onUndo}
          onRedoShortcut={onRedo}
        />
      )}
      rightPanelConfig={{ placement: 'body', width: '420px', scroll: false }}
      rightPanel={inspectorOpen && (
        <GraphInspector
          isOpen={inspectorOpen}
          mode="panel"
          activeTab={inspectorTab}
          selectedNode={selectedNode}
          nodes={nodes}
          transitions={selectedNodeTransitions}
          validation={validation}
          entityLinks={entityLinks}
          entityLinksLoading={entityLinksLoading}
          busy={graphActionPending}
          maps={maps}
          characters={characters}
          items={items}
          scenarioCharacters={scenarioCharacters}
          scenarioMaps={scenarioMaps}
          scenarioItems={scenarioItems}
          assets={assets}
          locations={locations}
          factions={factions}
          events={events}
          onClose={onCloseInspector}
          onTabChange={onInspectorTabChange}
          onUpdateNode={onUpdateNode}
          onDeleteNode={onDeleteNode}
          onCreateEntityLink={onCreateEntityLink}
          onDeleteEntityLink={onDeleteEntityLink}
          onOpenEntityLink={onOpenEntityLink}
          onCreateTransition={onCreateTransition}
          onUpdateTransition={onUpdateTransition}
          onDeleteTransition={onDeleteTransition}
          onSelectValidationIssue={onSelectValidationIssue}
        />
      )}
    />
  );
};
