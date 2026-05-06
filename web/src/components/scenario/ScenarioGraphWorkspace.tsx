import React from 'react';
import { AlertTriangle, ListTree, Redo2, RefreshCw, SlidersHorizontal, Undo2 } from 'lucide-react';
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
import { GraphCanvas } from './GraphCanvas';
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
}) => (
  <div className="flex flex-1 min-h-0 flex-col">
    <div className="h-12 shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="accent-red" size="sm" inverted={!nodeListOpen} onClick={onToggleNodeList}>
          <ListTree size={13} /> УЗЛЫ
        </Button>
        <Button variant="accent-red" size="sm" inverted={!inspectorOpen} onClick={onToggleInspector}>
          <SlidersHorizontal size={13} /> ИНСПЕКТОР
        </Button>
        <div className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">
          {graphLoading ? 'ЗАГРУЗКА ГРАФА...' : `${nodes.length} УЗЛОВ / ${transitions.length} ПЕРЕХОДОВ`}
        </div>
      </div>
      <Button
        variant="accent-red"
        size="sm"
        inverted
        disabled={graphLoading || graphActionPending || !canUndo}
        onClick={onUndo}
      >
        <Undo2 size={13} /> UNDO
      </Button>
      <Button
        variant="accent-red"
        size="sm"
        inverted
        disabled={graphLoading || graphActionPending || !canRedo}
        onClick={onRedo}
      >
        <Redo2 size={13} /> REDO
      </Button>
      <Button
        variant={validation.hasErrors ? 'accent-red' : 'accent-yellow'}
        size="sm"
        inverted
        onClick={() => {
          onInspectorTabChange('validation');
          if (!inspectorOpen) onToggleInspector();
        }}
      >
        <AlertTriangle size={13} /> ПРОВЕРКА
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
        disabled={graphLoading || graphActionPending || !activeScenarioId}
        onClick={() => activeScenarioId && onReloadGraph(activeScenarioId)}
      >
        <RefreshCw size={13} className={graphLoading ? 'animate-spin' : ''} /> ПЕРЕЗАГРУЗИТЬ
      </Button>
    </div>
    {graphError && (
      <div className="shrink-0 border-b border-[var(--col-red)] bg-[var(--col-red)]/10 px-4 py-3 mono text-[10px] uppercase font-black text-[var(--col-red)]">
        {graphError}
      </div>
    )}
    <div className="relative flex flex-1 w-full min-h-0 overflow-hidden">
      {nodeListOpen && (
        <div className="absolute inset-y-0 left-0 z-30 flex shadow-2xl">
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
        </div>
      )}
      <GraphCanvas
        nodes={nodes}
        transitions={transitions}
        activeNodeId={activeNodeId}
        activeTransitionId={activeTransitionId}
        validation={validation}
        disabled={graphLoading || graphActionPending}
        onSelectNode={onSelectNode}
        onSelectTransition={onSelectTransition}
        onClearSelection={onClearSelection}
        onMoveNode={onMoveNode}
        onLayoutNodes={onLayoutNodes}
        onCreateTransition={onCreateTransitionBetween}
        onUpdateTransition={onUpdateTransition}
        onDeleteNode={onDeleteNode}
        onDeleteTransition={onDeleteTransition}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
      />
      <GraphInspector
        isOpen={inspectorOpen}
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
    </div>
  </div>
);
