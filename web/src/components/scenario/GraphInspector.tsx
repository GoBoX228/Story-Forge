import React from 'react';
import { AlertTriangle, GitBranch, Link2, SlidersHorizontal, X } from 'lucide-react';
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
import { GraphNodeDetails } from './GraphNodeDetails';
import { GraphNodeEntityLinks } from './GraphNodeEntityLinks';
import { GraphTransitionsPanel } from './GraphTransitionsPanel';
import { GraphValidationIssue, GraphValidationResult } from './graphValidation';

export type GraphInspectorTab = 'properties' | 'links' | 'transitions' | 'validation';

interface GraphInspectorProps {
  isOpen: boolean;
  activeTab: GraphInspectorTab;
  selectedNode: ScenarioNode | null;
  nodes: ScenarioNode[];
  transitions: ScenarioTransition[];
  validation?: GraphValidationResult;
  entityLinks: ScenarioNodeEntityLink[];
  entityLinksLoading?: boolean;
  busy?: boolean;
  maps: MapData[];
  characters: Character[];
  items: Item[];
  assets: Asset[];
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
  onClose: () => void;
  onTabChange: (tab: GraphInspectorTab) => void;
  onUpdateNode: (nodeId: string, payload: {
    type: ScenarioNodeType;
    title: string;
    content: string;
    config: ScenarioNodeConfig;
  }) => void | Promise<void>;
  onDeleteNode: (nodeId: string) => void | Promise<void>;
  onCreateEntityLink: (payload: ScenarioNodeEntityLinkCreatePayload) => void | Promise<void>;
  onDeleteEntityLink: (linkId: string) => void | Promise<void>;
  onOpenEntityLink?: (targetType: ScenarioNodeEntityTargetType, targetId: string) => void;
  onCreateTransition: (toNodeId: string) => void | Promise<void>;
  onUpdateTransition: (
    transitionId: string,
    payload: {
      type: ScenarioTransitionType;
      label: string;
      condition: ScenarioTransitionCondition;
      metadata?: ScenarioTransitionMetadata;
    }
  ) => void | Promise<void>;
  onDeleteTransition: (transitionId: string) => void | Promise<void>;
  onSelectValidationIssue?: (issue: GraphValidationIssue) => void;
}

const TABS: { value: GraphInspectorTab; label: string; icon: React.ReactNode }[] = [
  { value: 'properties', label: 'СВОЙСТВА', icon: <SlidersHorizontal size={13} /> },
  { value: 'links', label: 'СВЯЗИ', icon: <Link2 size={13} /> },
  { value: 'transitions', label: 'ПЕРЕХОДЫ', icon: <GitBranch size={13} /> },
  { value: 'validation', label: 'ПРОВЕРКА', icon: <AlertTriangle size={13} /> }
];

const GraphValidationPanel: React.FC<{
  validation?: GraphValidationResult;
  nodes: ScenarioNode[];
  onSelectIssue?: (issue: GraphValidationIssue) => void;
}> = ({ validation, nodes, onSelectIssue }) => {
  const nodeTitleById = new Map(nodes.map((node) => [node.id, node.title || `Узел ${node.orderIndex + 1}`]));
  const issues = validation?.issues ?? [];
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');

  if (issues.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-10 text-center">
        <div className="border border-dashed border-[var(--col-teal)] bg-[var(--col-teal)]/10 p-6 mono text-[10px] uppercase text-[var(--col-teal)]">
          Проверка пройдена: ошибок и предупреждений нет
        </div>
      </div>
    );
  }

  const renderIssue = (issue: GraphValidationIssue) => {
        const title = issue.nodeId
          ? nodeTitleById.get(issue.nodeId) ?? `#${issue.nodeId}`
          : issue.transitionId
            ? `Переход #${issue.transitionId}`
            : 'Граф сценария';
        const color = issue.severity === 'error' ? 'var(--col-red)' : 'var(--col-yellow)';

        return (
          <button
            key={issue.id}
            type="button"
            onClick={() => onSelectIssue?.(issue)}
            className="w-full text-left border border-[var(--border-color)] bg-[var(--input-bg)] p-4 transition-colors"
            style={{ '--issue-color': color } as React.CSSProperties}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="mono text-[8px] uppercase font-black" style={{ color }}>
                {issue.severity === 'error' ? 'ERROR' : 'WARNING'}
              </span>
              <span className="mono text-[8px] uppercase text-[var(--text-muted)]">{issue.target}</span>
            </div>
            <div className="mt-2 mono text-[9px] uppercase font-black text-[var(--text-main)]">
              {title}
            </div>
            <div className="mt-2 mono text-[9px] uppercase text-[var(--text-muted)] leading-relaxed">
              {issue.message}
            </div>
          </button>
        );
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className={`border p-4 ${
        validation?.hasErrors
          ? 'border-[var(--col-red)] bg-[var(--col-red)]/10'
          : 'border-[var(--col-yellow)] bg-[var(--col-yellow)]/10'
      }`}>
        <div className={`mono text-[9px] uppercase font-black ${
          validation?.hasErrors ? 'text-[var(--col-red)]' : 'text-[var(--col-yellow)]'
        }`}>
          {validation?.errorCount ?? 0} ошибок / {validation?.warningCount ?? 0} предупреждений
        </div>
        <div className="mt-2 mono text-[8px] uppercase text-[var(--text-muted)]">
          Проверка не блокирует сохранение, но показывает проблемы перед экспортом или публикацией.
        </div>
      </div>

      {errors.length > 0 && (
        <section className="space-y-2">
          <div className="mono text-[9px] uppercase font-black text-[var(--col-red)]">Ошибки</div>
          {errors.map(renderIssue)}
        </section>
      )}

      {warnings.length > 0 && (
        <section className="space-y-2">
          <div className="mono text-[9px] uppercase font-black text-[var(--col-yellow)]">Предупреждения</div>
          {warnings.map(renderIssue)}
        </section>
      )}
    </div>
  );
};

export const GraphInspector: React.FC<GraphInspectorProps> = ({
  isOpen,
  activeTab,
  selectedNode,
  nodes,
  transitions,
  validation,
  entityLinks,
  entityLinksLoading = false,
  busy = false,
  maps,
  characters,
  items,
  assets,
  locations,
  factions,
  events,
  onClose,
  onTabChange,
  onUpdateNode,
  onDeleteNode,
  onCreateEntityLink,
  onDeleteEntityLink,
  onOpenEntityLink,
  onCreateTransition,
  onUpdateTransition,
  onDeleteTransition,
  onSelectValidationIssue
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-y-0 right-0 z-40 flex w-[420px] max-w-[calc(100vw-24px)] pointer-events-none">
      <div aria-hidden="true" aria-label="Закрыть инспектор" className="hidden" />
      <aside className="w-full h-full bg-[var(--bg-main)] border-l-2 border-[var(--col-red)] shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
        <div className="h-14 shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-4 flex items-center justify-between gap-3">
          <div>
            <div className="mono text-[8px] uppercase font-black text-[var(--text-muted)]">ГРАФ</div>
            <div className="mono text-[10px] uppercase font-black text-[var(--text-main)] tracking-widest">
              ИНСПЕКТОР УЗЛА
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--col-red)] transition-colors"
            title="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        <div className="shrink-0 grid grid-cols-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTabChange(tab.value)}
              className={`h-11 inline-flex items-center justify-center gap-2 mono text-[8px] uppercase font-black border-r border-[var(--border-color)] last:border-r-0 transition-colors ${
                activeTab === tab.value
                  ? 'bg-[var(--col-red)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1">
          {activeTab === 'properties' && (
            <GraphNodeDetails
              node={selectedNode}
              busy={busy}
              entityLinks={entityLinks}
              entityLinksLoading={entityLinksLoading}
              maps={maps}
              characters={characters}
              items={items}
              onUpdateNode={onUpdateNode}
              onDeleteNode={onDeleteNode}
              onCreateEntityLink={onCreateEntityLink}
              onDeleteEntityLink={onDeleteEntityLink}
              showEntityLinks={false}
            />
          )}
          {activeTab === 'links' && selectedNode && (
            <GraphNodeEntityLinks
              entityLinks={entityLinks}
              entityLinksLoading={entityLinksLoading}
              maps={maps}
              characters={characters}
              items={items}
              assets={assets}
              locations={locations}
              factions={factions}
              events={events}
              busy={busy}
              onCreateEntityLink={onCreateEntityLink}
              onDeleteEntityLink={onDeleteEntityLink}
              onOpenEntityLink={onOpenEntityLink}
            />
          )}
          {activeTab === 'links' && !selectedNode && (
            <div className="h-full flex items-center justify-center p-10 text-center mono text-[10px] uppercase text-[var(--text-muted)]">
              Выберите узел для связей
            </div>
          )}
          {activeTab === 'transitions' && (
            <GraphTransitionsPanel
              selectedNode={selectedNode}
              nodes={nodes}
              transitions={transitions}
              busy={busy}
              embedded
              onCreateTransition={onCreateTransition}
              onUpdateTransition={onUpdateTransition}
              onDeleteTransition={onDeleteTransition}
            />
          )}
          {activeTab === 'validation' && (
            <GraphValidationPanel
              validation={validation}
              nodes={nodes}
              onSelectIssue={onSelectValidationIssue}
            />
          )}
        </div>
      </aside>
    </div>
  );
};
