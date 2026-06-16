import React, { useEffect, useState } from 'react';
import { Save, Trash2, X } from 'lucide-react';
import {
  ScenarioTransition,
  ScenarioTransitionCondition,
  ScenarioTransitionType
} from '../../../types';
import { NodePosition } from '../graphCanvasUtils';
import { TRANSITION_TYPE_OPTIONS } from './graphCanvasStyles';
import { TransitionUpdatePayload } from './graphCanvasTypes';

interface GraphEdgeQuickPanelProps {
  transition: ScenarioTransition;
  position: NodePosition;
  disabled: boolean;
  scale: number;
  hasWaypoints: boolean;
  onUpdate: (transitionId: string, payload: TransitionUpdatePayload) => void | Promise<void>;
  onDelete: (transitionId: string) => void | Promise<void>;
  onResetWaypoints: (transition: ScenarioTransition) => void | Promise<void>;
  onClose: () => void;
}

export const GraphEdgeQuickPanel: React.FC<GraphEdgeQuickPanelProps> = ({
  transition,
  position,
  disabled,
  scale,
  hasWaypoints,
  onUpdate,
  onDelete,
  onResetWaypoints,
  onClose
}) => {
  const [type, setType] = useState<ScenarioTransitionType>(transition.type);
  const [label, setLabel] = useState(transition.label ?? '');

  useEffect(() => {
    setType(transition.type);
    setLabel(transition.label ?? '');
  }, [transition]);

  const handleSave = async () => {
    if (disabled) return;

    const condition = type === transition.type
      ? transition.condition
      : (type === 'success' || type === 'failure' ? { outcome: type } : {});

    await onUpdate(transition.id, {
      type,
      label,
      condition: condition as ScenarioTransitionCondition,
      metadata: transition.metadata
    });
  };

  return (
    <div
      className="absolute z-30 w-72 border-2 border-[var(--col-red)] bg-[var(--bg-surface)] shadow-2xl p-3 space-y-3"
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -115%) scale(${1 / scale})`,
        transformOrigin: '50% 100%'
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="mono text-[8px] uppercase font-black text-[var(--col-red)]">Переход</div>
          <div className="mono text-[9px] uppercase text-[var(--text-muted)]">Быстрое редактирование</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 inline-flex items-center justify-center border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--col-red)]"
          title="Закрыть"
        >
          <X size={13} />
        </button>
      </div>

      <div className="grid grid-cols-[120px_1fr] gap-2">
        <select
          value={type}
          onChange={(event) => setType(event.target.value as ScenarioTransitionType)}
          disabled={disabled}
          className="h-9 bg-[var(--bg-main)] border-2 border-[var(--border-color)] px-2 mono text-[8px] uppercase font-black text-[var(--text-main)] focus:border-[var(--col-red)] focus:outline-none"
        >
          {TRANSITION_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          disabled={disabled}
          placeholder="Метка"
          className="h-9 bg-[var(--bg-main)] border-2 border-[var(--border-color)] px-3 mono text-[9px] text-[var(--text-main)] focus:border-[var(--col-red)] focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled}
          className="h-9 inline-flex items-center justify-center gap-2 bg-[var(--col-red)] text-white mono text-[8px] uppercase font-black disabled:opacity-40"
        >
          <Save size={13} />
          Сохранить
        </button>
        <button
          type="button"
          onClick={() => onDelete(transition.id)}
          disabled={disabled}
          className="h-9 inline-flex items-center justify-center gap-2 border border-[var(--col-red)] text-[var(--col-red)] mono text-[8px] uppercase font-black hover:bg-[var(--col-red)] hover:text-white disabled:opacity-40"
        >
          <Trash2 size={13} />
          Удалить
        </button>
      </div>
      {hasWaypoints && (
        <button
          type="button"
          onClick={() => onResetWaypoints(transition)}
          disabled={disabled}
          className="h-8 w-full inline-flex items-center justify-center gap-2 border border-[var(--border-color)] text-[var(--text-muted)] mono text-[8px] uppercase font-black hover:border-[var(--col-red)] hover:text-[var(--col-red)] disabled:opacity-40"
        >
          Сбросить маршрут
        </button>
      )}
    </div>
  );
};
