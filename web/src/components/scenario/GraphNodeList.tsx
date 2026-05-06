import React, { useMemo } from 'react';
import { FileText, GitBranch, Plus } from 'lucide-react';
import { ScenarioNode, ScenarioNodeType, ScenarioTransition } from '../../types';
import { Button, Select } from '../UI';

const NODE_TYPE_LABELS: Record<ScenarioNodeType, string> = {
  description: 'Описание',
  dialog: 'Диалог',
  location: 'Локация',
  check: 'Проверка',
  loot: 'Добыча',
  combat: 'Бой'
};

export const NODE_TYPE_OPTIONS: { value: ScenarioNodeType; label: string }[] = [
  { value: 'description', label: 'Описание' },
  { value: 'dialog', label: 'Диалог' },
  { value: 'location', label: 'Локация' },
  { value: 'check', label: 'Проверка' },
  { value: 'loot', label: 'Добыча' },
  { value: 'combat', label: 'Бой' }
];

interface GraphNodeListProps {
  nodes: ScenarioNode[];
  transitions: ScenarioTransition[];
  activeNodeId: string | null;
  newNodeType: ScenarioNodeType;
  loading: boolean;
  disabled?: boolean;
  onNewNodeTypeChange: (type: ScenarioNodeType) => void;
  onCreateNode: () => void;
  onSelectNode: (nodeId: string) => void;
}

export const getNodeTypeLabel = (type: ScenarioNodeType): string => NODE_TYPE_LABELS[type] ?? type;

export const GraphNodeList: React.FC<GraphNodeListProps> = ({
  nodes,
  transitions,
  activeNodeId,
  newNodeType,
  loading,
  disabled = false,
  onNewNodeTypeChange,
  onCreateNode,
  onSelectNode
}) => {
  const outgoingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    transitions.forEach((transition) => {
      counts.set(transition.fromNodeId, (counts.get(transition.fromNodeId) ?? 0) + 1);
    });
    return counts;
  }, [transitions]);

  return (
    <div className="w-72 bg-[var(--bg-surface)] border-r border-[var(--border-color)] flex flex-col z-20">
      <div className="p-4 border-b border-[var(--border-color)] space-y-3">
        <div className="flex justify-between items-center">
          <span className="mono text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest">УЗЛЫ ГРАФА</span>
          <span className="mono text-[9px] text-[var(--text-muted)]">{loading ? '...' : nodes.length}</span>
        </div>
        <Select
          value={newNodeType}
          onChange={(value) => onNewNodeTypeChange(value as ScenarioNodeType)}
          options={NODE_TYPE_OPTIONS}
          accentColor="var(--col-red)"
        />
        <Button variant="accent-red" inverted className="w-full" onClick={onCreateNode} disabled={disabled || loading}>
          <Plus size={14} /> {nodes.length === 0 ? 'Создать первый узел' : 'Добавить узел'}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && nodes.length === 0 && (
          <div className="p-6 border border-dashed border-[var(--border-color)] text-center">
            <span className="mono text-[9px] uppercase text-[var(--text-muted)]">Загрузка узлов графа...</span>
          </div>
        )}
        {!loading && nodes.length === 0 && (
          <div className="p-6 border border-dashed border-[var(--border-color)] text-center space-y-3">
            <div className="mono text-[9px] uppercase text-[var(--text-muted)]">В графе пока нет узлов</div>
            <button
              type="button"
              onClick={onCreateNode}
              disabled={disabled}
              className="mono text-[9px] uppercase font-black text-[var(--col-red)] hover:text-[var(--text-main)] disabled:opacity-40"
            >
              Создать первый узел
            </button>
          </div>
        )}
        {nodes.map((node) => (
          <button
            key={node.id}
            onClick={() => onSelectNode(node.id)}
            disabled={disabled}
            className={`group w-full p-3 border text-left transition-all ${
              activeNodeId === node.id
                ? 'bg-[var(--bg-main)] border-[var(--col-red)]'
                : 'bg-transparent border-transparent hover:bg-[var(--bg-main)] hover:border-[var(--border-color)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <FileText size={14} className="mt-0.5 text-[var(--col-red)] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="mono text-[10px] uppercase font-black text-[var(--text-main)] truncate">
                  {node.title || `Узел ${node.orderIndex + 1}`}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="mono text-[8px] uppercase text-[var(--text-muted)]">{getNodeTypeLabel(node.type)}</span>
                  <span className="inline-flex items-center gap-1 mono text-[8px] text-[var(--text-muted)]">
                    <GitBranch size={10} /> {outgoingCounts.get(node.id) ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
