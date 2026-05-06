import React from 'react';
import { ScenarioNodeType } from '../../types';

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
    return renderField(
      { field: 'speaker', label: 'Говорящий', placeholder: 'Имя NPC или ключ персонажа' },
      values,
      errors,
      disabled,
      onChange
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
    return renderField(
      { field: 'itemHint', label: 'Награда', placeholder: 'Предмет, ресурс или подсказка награды' },
      values,
      errors,
      disabled,
      onChange
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
