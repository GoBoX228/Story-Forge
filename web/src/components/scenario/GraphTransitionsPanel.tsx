import React, { useEffect, useMemo, useState } from 'react';
import { GitBranch, Plus, Save, Trash2 } from 'lucide-react';
import {
  ScenarioNode,
  ScenarioTransition,
  ScenarioTransitionCondition,
  ScenarioTransitionMetadata,
  ScenarioTransitionType
} from '../../types';
import { Button, Select } from '../UI';

const TRANSITION_TYPE_OPTIONS: { value: ScenarioTransitionType; label: string }[] = [
  { value: 'linear', label: 'ЛИНЕЙНЫЙ' },
  { value: 'choice', label: 'ВЫБОР' },
  { value: 'success', label: 'УСПЕХ' },
  { value: 'failure', label: 'ПРОВАЛ' },
];

const getConditionDc = (condition: ScenarioTransitionCondition): string => {
  const value = (condition as Record<string, unknown>).dc;
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
};

interface TransitionRowProps {
  transition: ScenarioTransition;
  targetTitle: string;
  busy: boolean;
  onUpdate: (
    transitionId: string,
    payload: {
      type: ScenarioTransitionType;
      label: string;
      condition: ScenarioTransitionCondition;
      metadata?: ScenarioTransitionMetadata;
    }
  ) => void | Promise<void>;
  onDelete: (transitionId: string) => void | Promise<void>;
}

const TransitionRow: React.FC<TransitionRowProps> = ({ transition, targetTitle, busy, onUpdate, onDelete }) => {
  const [type, setType] = useState<ScenarioTransitionType>(transition.type);
  const [label, setLabel] = useState(transition.label ?? '');
  const [dc, setDc] = useState(getConditionDc(transition.condition));
  const [conditionError, setConditionError] = useState<string | null>(null);

  useEffect(() => {
    setType(transition.type);
    setLabel(transition.label ?? '');
    setDc(getConditionDc(transition.condition));
    setConditionError(null);
  }, [transition]);

  const handleTypeChange = (value: string) => {
    const nextType = value as ScenarioTransitionType;
    setType(nextType);
    if (nextType === 'linear' || nextType === 'choice') {
      setDc('');
    }
  };

  const handleSave = async () => {
    if (busy) return;

    const condition = (type === 'success' || type === 'failure'
      ? { outcome: type }
      : {}) as ScenarioTransitionCondition & { dc?: number };

    if ((type === 'success' || type === 'failure') && dc.trim()) {
      const parsedDc = Number(dc);
      if (!Number.isInteger(parsedDc) || parsedDc < 1 || parsedDc > 40) {
        setConditionError('DC должен быть целым числом от 1 до 40');
        return;
      }
      condition.dc = parsedDc;
    }

    setConditionError(null);
    await onUpdate(transition.id, { type, label, condition, metadata: transition.metadata });
  };

  const showConditionFields = type === 'success' || type === 'failure';

  return (
    <div className="border border-[var(--border-color)] bg-[var(--input-bg)] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mono text-[8px] uppercase text-[var(--text-muted)]">Переход к</div>
          <div className="mono text-[10px] uppercase font-black text-[var(--text-main)] truncate">{targetTitle}</div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={handleSave} disabled={busy} className="text-[var(--col-red)] hover:text-[var(--text-main)] disabled:opacity-40" title="Сохранить переход">
            <Save size={14} />
          </button>
          <button onClick={() => onDelete(transition.id)} disabled={busy} className="text-[var(--col-red)] hover:text-[var(--text-main)] disabled:opacity-40" title="Удалить переход">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select
          value={type}
          onChange={handleTypeChange}
          options={TRANSITION_TYPE_OPTIONS}
          accentColor="var(--col-red)"
        />
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          disabled={busy}
          placeholder="Метка"
          className="w-full h-10 bg-[var(--bg-main)] border-2 border-[var(--border-color)] px-3 mono text-[9px] text-[var(--text-main)] focus:border-[var(--col-red)] focus:outline-none"
        />
      </div>
      {showConditionFields && (
        <div className="space-y-2">
          <div className="flex justify-between items-center gap-3">
            <label className="mono text-[8px] uppercase text-[var(--text-muted)]">Условие исхода</label>
            {conditionError && <span className="mono text-[8px] text-[var(--col-red)] uppercase">{conditionError}</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={type}
              disabled
              className="w-full h-9 bg-[var(--bg-main)] border border-[var(--border-color)] px-3 mono text-[9px] uppercase text-[var(--text-muted)]"
            />
            <input
              value={dc}
              onChange={(event) => setDc(event.target.value)}
              disabled={busy}
              placeholder="DC"
              className="w-full h-9 bg-[var(--bg-main)] border border-[var(--border-color)] px-3 mono text-[9px] text-[var(--text-main)] focus:border-[var(--col-red)] focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface GraphTransitionsPanelProps {
  selectedNode: ScenarioNode | null;
  nodes: ScenarioNode[];
  transitions: ScenarioTransition[];
  busy?: boolean;
  embedded?: boolean;
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
}

export const GraphTransitionsPanel: React.FC<GraphTransitionsPanelProps> = ({
  selectedNode,
  nodes,
  transitions,
  busy = false,
  embedded = false,
  onCreateTransition,
  onUpdateTransition,
  onDeleteTransition
}) => {
  const targetOptions = useMemo(
    () =>
      nodes
        .filter((node) => node.id !== selectedNode?.id)
        .map((node) => ({ value: node.id, label: node.title || `Узел ${node.orderIndex + 1}` })),
    [nodes, selectedNode]
  );
  const [targetNodeId, setTargetNodeId] = useState('');

  useEffect(() => {
    setTargetNodeId(targetOptions[0]?.value ?? '');
  }, [targetOptions]);

  const nodeTitleById = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach((node) => map.set(node.id, node.title || `Узел ${node.orderIndex + 1}`));
    return map;
  }, [nodes]);

  if (!selectedNode) {
    return null;
  }

  return (
    <div className={`${embedded ? 'h-full' : 'w-96 border-l'} border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col`}>
      <div className="p-4 border-b border-[var(--border-color)] space-y-3">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-[var(--col-red)]" />
          <span className="mono text-[10px] uppercase font-black text-[var(--text-main)] tracking-widest">ИСХОДЯЩИЕ ПЕРЕХОДЫ</span>
        </div>
        {targetOptions.length > 0 && (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Select
              value={targetNodeId}
              onChange={setTargetNodeId}
              options={targetOptions}
              placeholder="ЦЕЛЕВОЙ УЗЕЛ"
              accentColor="var(--col-red)"
            />
            <Button variant="accent-red" size="sm" disabled={busy || !targetNodeId} onClick={() => targetNodeId && onCreateTransition(targetNodeId)}>
              <Plus size={14} />
            </Button>
          </div>
        )}
        {targetOptions.length === 0 && (
          <div className="mono text-[8px] uppercase text-[var(--text-muted)]">
            Чтобы создать переход, нужен еще один узел.
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {transitions.length === 0 ? (
          <div className="border border-dashed border-[var(--border-color)] p-6 text-center space-y-4">
            <div className="mono text-[9px] uppercase text-[var(--text-muted)]">У выбранного узла нет переходов</div>
            {targetOptions.length > 0 && (
              <Button variant="accent-red" inverted disabled={busy || !targetNodeId} onClick={() => targetNodeId && onCreateTransition(targetNodeId)}>
                <Plus size={14} /> Добавить переход
              </Button>
            )}
          </div>
        ) : (
          transitions.map((transition) => (
            <TransitionRow
              key={transition.id}
              transition={transition}
              targetTitle={nodeTitleById.get(transition.toNodeId) ?? `#${transition.toNodeId}`}
              busy={busy}
              onUpdate={onUpdateTransition}
              onDelete={onDeleteTransition}
            />
          ))
        )}
      </div>
    </div>
  );
};
