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

interface GraphToolbarButtonProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const GraphToolbarButton: React.FC<GraphToolbarButtonProps> = ({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  onClick
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className={`w-9 h-9 flex items-center justify-center border transition-all ${
      active
        ? 'bg-[var(--col-red)] text-[var(--bg-main)] border-[var(--col-red)]'
        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/10'
    } disabled:opacity-30 disabled:pointer-events-none`}
  >
    <Icon size={18} />
  </button>
);

const GraphToolbarDivider: React.FC = () => (
  <div className="w-full h-[1px] bg-[var(--border-color)] my-1" />
);

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

  return (
    <div className="flex flex-1 min-h-0 flex-col">
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
      {graphError && (
        <div className="shrink-0 border-b border-[var(--col-red)] bg-[var(--col-red)]/10 px-4 py-3 mono text-[10px] uppercase font-black text-[var(--col-red)]">
          {graphError}
        </div>
      )}
      <div className="relative flex flex-1 w-full min-h-0 overflow-hidden">
        <div className="z-30 flex w-14 shrink-0 flex-col items-center gap-1 border-r border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-4">
          <GraphToolbarButton icon={ListTree} label="Узлы" active={nodeListOpen} onClick={onToggleNodeList} />
          <GraphToolbarButton
            icon={SlidersHorizontal}
            label="Инспектор"
            active={inspectorOpen}
            onClick={onToggleInspector}
          />
          <GraphToolbarDivider />
          <GraphToolbarButton
            icon={Undo2}
            label="Отменить"
            disabled={controlsDisabled || !canUndo}
            onClick={onUndo}
          />
          <GraphToolbarButton
            icon={Redo2}
            label="Повторить"
            disabled={controlsDisabled || !canRedo}
            onClick={onRedo}
          />
        </div>
        {nodeListOpen && (
          <div className="absolute inset-y-0 left-14 z-30 flex shadow-2xl">
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
      </div>
    </div>
  );
};
