import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Scenario, Tag } from '../../types';
import { Button, SearchInput } from '../UI';
import { TagFilter } from '../TagPicker';

interface ScenarioListPanelProps {
  scenarios: Scenario[];
  searchQuery: string;
  tags: Tag[];
  selectedTagId: string;
  loadingScenarioId: string | null;
  onSearchChange: (value: string) => void;
  onTagFilterChange: (value: string) => void;
  onSelectScenario: (scenarioId: string) => void;
  onDeleteScenario: (scenarioId: string, event: React.MouseEvent) => void;
  onCreateScenario: () => void;
}

export const ScenarioListPanel: React.FC<ScenarioListPanelProps> = ({
  scenarios,
  searchQuery,
  tags,
  selectedTagId,
  loadingScenarioId,
  onSearchChange,
  onTagFilterChange,
  onSelectScenario,
  onDeleteScenario,
  onCreateScenario
}) => (
  <div className="w-80 bg-[var(--bg-surface)] border-l-4 border-[var(--col-red)] flex flex-col p-8 space-y-10 z-10 overflow-y-auto">
    <div className="flex items-start justify-between gap-4">
      <h2 className="text-4xl font-black uppercase tracking-tighter text-[var(--col-red)] glitch-text leading-none">
        БИБЛИОТЕКА
      </h2>
      <Button variant="accent-red" size="sm" onClick={onCreateScenario}>
        <Plus size={14} />
      </Button>
    </div>
    <SearchInput
      value={searchQuery}
      onChange={(event) => onSearchChange(event.target.value)}
      placeholder="НАЗВАНИЕ..."
      accentColor="var(--col-red)"
    />
    <TagFilter
      tags={tags}
      value={selectedTagId}
      onChange={onTagFilterChange}
      accentColor="var(--col-red)"
    />
    <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-1">
      {scenarios
        .map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onSelectScenario(scenario.id)}
            disabled={loadingScenarioId === scenario.id}
            className="w-full text-left p-4 border border-[var(--border-color)] hover:border-[var(--col-red)] hover:bg-[var(--bg-main)] transition-all group relative bg-[var(--bg-surface)] disabled:opacity-60"
          >
            <div className="mono text-[11px] font-black uppercase text-[var(--text-main)] mb-2 group-hover:text-[var(--col-red)] transition-colors truncate pr-6">
              {scenario.title}
            </div>
            <div className="flex justify-between items-center border-t border-[var(--border-color)] pt-2 mt-2">
              <span className="mono text-[9px] text-[var(--text-muted)]">
                {loadingScenarioId === scenario.id ? 'Загрузка...' : scenario.createdAt.split('T')[0]}
              </span>
              <div className="mono text-[9px] text-[var(--text-muted)]">GRAPH</div>
            </div>
            <span
              onClick={(event) => onDeleteScenario(scenario.id, event)}
              className="absolute right-3 top-4 p-1 text-[var(--col-red)] opacity-0 group-hover:opacity-100 transition-opacity hover:brightness-125"
              role="button"
              aria-label="Удалить сценарий"
              title="Удалить сценарий"
            >
              <Trash2 size={14} />
            </span>
          </button>
        ))}
    </div>
  </div>
);
