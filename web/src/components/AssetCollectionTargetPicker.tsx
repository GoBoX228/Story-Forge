import React, { useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { AssetCollection } from '../types';

interface AssetCollectionTargetPickerProps {
  label: string;
  collections: AssetCollection[];
  value: string[];
  accentColor?: string;
  emptyLabel?: string;
  onChange: (collectionIds: string[]) => Promise<unknown> | unknown;
}

export const AssetCollectionTargetPicker: React.FC<AssetCollectionTargetPickerProps> = ({
  label,
  collections,
  value,
  accentColor = 'var(--col-teal)',
  emptyLabel = 'Если наборы не выбраны, доступны все подходящие ассеты',
  onChange
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = useMemo(() => new Set(value), [value]);

  const apply = async (collectionIds: string[]) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onChange(collectionIds);
    } catch (pickerError) {
      setError(pickerError instanceof Error ? pickerError.message : 'Не удалось обновить наборы ассетов');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (collectionId: string) => {
    const next = selected.has(collectionId)
      ? value.filter((id) => id !== collectionId)
      : [...value, collectionId];
    void apply(next);
  };

  return (
    <div className="space-y-3 border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">{label || 'Наборы ассетов'}</span>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => void apply([])}
            disabled={busy}
            className="mono text-[8px] uppercase font-black text-[var(--text-muted)] hover:text-[var(--col-red)]"
          >
            Сбросить
          </button>
        )}
      </div>

      {collections.length > 0 ? (
        <div className="space-y-2">
          {collections.map((collection) => {
            const active = selected.has(collection.id);
            return (
              <button
                key={collection.id}
                type="button"
                disabled={busy}
                onClick={() => toggle(collection.id)}
                className={`w-full border px-3 py-2 text-left transition-all ${
                  active ? 'bg-[var(--text-main)]/10' : 'bg-transparent hover:bg-[var(--bg-surface)]'
                }`}
                style={{ borderColor: active ? accentColor : 'var(--border-color)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 mono text-[10px] uppercase font-black text-[var(--text-main)] truncate">
                    <Package size={13} style={{ color: active ? accentColor : 'var(--text-muted)' }} />
                    <span className="truncate">{collection.name}</span>
                  </span>
                  <span className="mono text-[8px] uppercase font-black text-[var(--text-muted)]">
                    {collection.assetIds.length}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-[var(--border-color)] p-3 mono text-[9px] uppercase text-[var(--text-muted)]">
          Наборы ассетов еще не созданы
        </div>
      )}

      <div className="mono text-[8px] uppercase text-[var(--text-muted)] leading-relaxed">{emptyLabel}</div>

      {error && (
        <div className="mono text-[9px] uppercase font-black text-[var(--col-red)]">{error}</div>
      )}
    </div>
  );
};
