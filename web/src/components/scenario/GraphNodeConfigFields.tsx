import React from 'react';
import { X } from 'lucide-react';
import { Character, Item, ScenarioNodeType } from '../../types';
import { Select } from '../UI';

export interface GraphNodeConfigValues {
  scene: string;
  speaker: string;
  mapHint: string;
  skill: string;
  dc: string;
  itemHint: string;
  encounter: string;
}

export type GraphNodeConfigField = keyof GraphNodeConfigValues;

export type GraphNodeConfigErrors = Partial<Record<GraphNodeConfigField, string>>;

interface GraphNodeConfigFieldsProps {
  type: ScenarioNodeType;
  values: GraphNodeConfigValues;
  errors: GraphNodeConfigErrors;
  disabled?: boolean;
  linkedCharacters?: Character[];
  linkedItems?: Item[];
  rewardItemIds?: string[];
  onRewardItemIdsChange?: (ids: string[]) => void;
  onChange: (field: GraphNodeConfigField, value: string) => void;
}

interface FieldDefinition {
  field: GraphNodeConfigField;
  label: string;
  placeholder: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

const inputClassName = (hasError: boolean): string =>
  `w-full h-10 bg-[var(--input-bg)] border-2 px-4 mono text-[10px] text-[var(--text-main)] focus:outline-none ${
    hasError
      ? 'border-[var(--col-red)] focus:border-[var(--col-red)]'
      : 'border-[var(--border-color)] focus:border-[var(--col-red)]'
  }`;

const renderField = (
  definition: FieldDefinition,
  values: GraphNodeConfigValues,
  errors: GraphNodeConfigErrors,
  disabled: boolean,
  onChange: (field: GraphNodeConfigField, value: string) => void
) => {
  const error = errors[definition.field];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black">
          {definition.label}
        </label>
        {error && (
          <span className="mono text-[8px] uppercase text-[var(--col-red)] text-right">
            {error}
          </span>
        )}
      </div>
      <input
        value={values[definition.field]}
        onChange={(event) => onChange(definition.field, event.target.value)}
        disabled={disabled}
        placeholder={definition.placeholder}
        inputMode={definition.inputMode}
        className={inputClassName(Boolean(error))}
      />
    </div>
  );
};

export const GraphNodeConfigFields: React.FC<GraphNodeConfigFieldsProps> = ({
  type,
  values,
  errors,
  disabled = false,
  linkedCharacters = [],
  linkedItems = [],
  rewardItemIds = [],
  onRewardItemIdsChange,
  onChange
}) => {
  if (type === 'description') {
    return renderField(
      { field: 'scene', label: 'Сцена', placeholder: 'Например: вступление, кульминация, финал' },
      values,
      errors,
      disabled,
      onChange
    );
  }

  if (type === 'dialog') {
    const options = linkedCharacters.map((character) => ({
      value: character.id,
      label: character.name || `Персонаж ${character.id}`
    }));

    return (
      <div className="space-y-2">
        <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black">
          Говорящий
        </label>
        <Select
          value={values.speaker}
          onChange={(value) => onChange('speaker', value)}
          options={options}
          placeholder="Сначала добавьте материал во вкладке Связи"
          disabled={disabled || options.length === 0}
          accentColor="var(--col-red)"
        />
      </div>
    );
  }

  if (type === 'location') {
    return renderField(
      { field: 'mapHint', label: 'Ориентир локации', placeholder: 'Карта, зона или место действия' },
      values,
      errors,
      disabled,
      onChange
    );
  }

  if (type === 'loot') {
    const selectedIds = new Set(rewardItemIds);
    const options = linkedItems
      .filter((item) => !selectedIds.has(item.id))
      .map((item) => ({ value: item.id, label: item.name || `Предмет ${item.id}` }));
    const selectedItems = rewardItemIds
      .map((id) => linkedItems.find((item) => item.id === id))
      .filter((item): item is Item => Boolean(item));

    return (
      <div className="space-y-3">
        <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black">
          Награда
        </label>
        {selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => onRewardItemIdsChange?.(rewardItemIds.filter((id) => id !== item.id))}
                className="inline-flex items-center gap-2 border border-[var(--col-red)] px-3 py-2 mono text-[9px] uppercase font-black text-[var(--text-main)] disabled:opacity-40"
              >
                {item.name || `Предмет ${item.id}`}
                <X size={12} className="text-[var(--col-red)]" />
              </button>
            ))}
          </div>
        )}
        <Select
          value=""
          onChange={(value) => {
            if (!value || selectedIds.has(value)) return;
            onRewardItemIdsChange?.([...rewardItemIds, value]);
          }}
          options={options}
          placeholder="Сначала добавьте материал во вкладке Связи"
          disabled={disabled || options.length === 0}
          accentColor="var(--col-red)"
        />
      </div>
    );
  }

  if (type === 'combat') {
    return renderField(
      { field: 'encounter', label: 'Столкновение', placeholder: 'Противники, сложность или ключ боя' },
      values,
      errors,
      disabled,
      onChange
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
      {renderField(
        { field: 'skill', label: 'Навык', placeholder: 'Например: харизма, сила, ловкость' },
        values,
        errors,
        disabled,
        onChange
      )}
      {renderField(
        { field: 'dc', label: 'DC', placeholder: '1-40', inputMode: 'numeric' },
        values,
        errors,
        disabled,
        onChange
      )}
    </div>
  );
};
