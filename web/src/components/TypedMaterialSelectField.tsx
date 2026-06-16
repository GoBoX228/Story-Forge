import React from 'react';
import { X } from 'lucide-react';
import { Select } from './UI';

export interface TypedMaterialOption {
  id: string;
  label: string;
}

interface TypedMaterialSelectFieldProps {
  label: string;
  options: TypedMaterialOption[];
  selected: TypedMaterialOption[];
  accentColor: string;
  placeholder?: string;
  disabled?: boolean;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}

export const TypedMaterialSelectField: React.FC<TypedMaterialSelectFieldProps> = ({
  label,
  options,
  selected,
  accentColor,
  placeholder = 'Добавить...',
  disabled = false,
  onAdd,
  onRemove
}) => {
  const selectOptions = options.map((option) => ({
    value: option.id,
    label: option.label
  }));

  return (
    <div className="space-y-3">
      <label className="mono text-[9px] uppercase font-black tracking-wider text-[var(--text-muted)]">
        {label}
      </label>

      <Select
        value=""
        onChange={onAdd}
        options={selectOptions}
        placeholder={selectOptions.length > 0 ? placeholder : 'Все материалы добавлены'}
        accentColor={accentColor}
        disabled={disabled || selectOptions.length === 0}
      />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((material) => (
            <span
              key={material.id}
              className="inline-flex min-h-8 items-center gap-2 border px-3 py-1.5 mono text-[9px] font-black uppercase"
              style={{
                borderColor: accentColor,
                color: 'var(--text-main)',
                backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)`
              }}
            >
              <span className="max-w-[220px] truncate">{material.label}</span>
              <button
                type="button"
                onClick={() => onRemove(material.id)}
                className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]"
                title="Удалить связь"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
