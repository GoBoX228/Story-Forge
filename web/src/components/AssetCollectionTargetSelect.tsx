import React, { useMemo, useState } from 'react';
import { AssetCollection } from '../types';
import { Select } from './UI';

interface AssetCollectionTargetSelectProps {
  label: string;
  collections: AssetCollection[];
  value: string[];
  accentColor?: string;
  emptyOptionLabel?: string;
  helperText?: string;
  onChange: (collectionIds: string[]) => Promise<unknown> | unknown;
}

const MULTIPLE_VALUE = '__multiple_asset_collections__';

export const AssetCollectionTargetSelect: React.FC<AssetCollectionTargetSelectProps> = ({
  label,
  collections,
  value,
  accentColor = 'var(--col-teal)',
  emptyOptionLabel = 'ВСЕ АССЕТЫ',
  helperText = 'Пусто = доступны все подходящие ассеты',
  onChange
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedValue = value.length === 0 ? '' : value.length === 1 ? value[0] : MULTIPLE_VALUE;

  const options = useMemo(() => [
    { value: '', label: emptyOptionLabel },
    ...(value.length > 1 ? [{ value: MULTIPLE_VALUE, label: `НЕСКОЛЬКО НАБОРОВ (${value.length})`, disabled: true }] : []),
    ...collections.map((collection) => ({
      value: collection.id,
      label: `${collection.name.toUpperCase()} (${collection.assetIds.length})`
    }))
  ], [collections, emptyOptionLabel, value.length]);

  const apply = async (nextValue: string) => {
    if (busy || nextValue === MULTIPLE_VALUE) return;
    setBusy(true);
    setError('');
    try {
      await onChange(nextValue ? [nextValue] : []);
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : 'Не удалось обновить набор ассетов');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-w-[230px] space-y-1.5">
      <div className="mono text-[8px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
      <Select
        value={selectedValue}
        onChange={(nextValue) => void apply(nextValue)}
        options={options}
        accentColor={accentColor}
        disabled={busy || collections.length === 0}
      />
      <div className="mono text-[7px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {collections.length === 0 ? 'Наборы ассетов ещё не созданы' : helperText}
      </div>
      {error && <div className="mono text-[8px] font-black uppercase text-[var(--col-red)]">{error}</div>}
    </div>
  );
};
