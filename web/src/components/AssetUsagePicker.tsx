import Image from 'next/image';
import React, { useMemo, useState } from 'react';
import { ImageIcon, X } from 'lucide-react';
import { Asset, AssetType } from '../types';
import { Select } from './UI';

interface AssetUsagePickerProps {
  label: string;
  assets: Asset[];
  value?: string | null;
  allowedTypes?: AssetType[];
  accentColor?: string;
  onChange: (assetId: string | null) => Promise<void> | void;
}

export const AssetUsagePicker: React.FC<AssetUsagePickerProps> = ({
  label,
  assets,
  value,
  allowedTypes = ['image', 'token'],
  accentColor = 'var(--col-teal)',
  onChange
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const options = useMemo(
    () => assets.filter((asset) => allowedTypes.includes(asset.type)),
    [allowedTypes, assets]
  );
  const selectedAsset = assets.find((asset) => asset.id === value);

  const apply = async (assetId: string | null) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onChange(assetId);
    } catch (pickerError) {
      setError(pickerError instanceof Error ? pickerError.message : 'Не удалось обновить ассет');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} style={{ color: accentColor }} />
          <span className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">{label}</span>
        </div>
        {selectedAsset && (
          <button
            type="button"
            onClick={() => void apply(null)}
            disabled={busy}
            className="text-[var(--text-muted)] hover:text-[var(--col-red)] transition-colors"
            title="Убрать ассет"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {selectedAsset?.url ? (
        <div className="relative h-28 border border-[var(--border-color)] bg-black overflow-hidden">
          <Image
            src={selectedAsset.url}
            alt={selectedAsset.name}
            fill
            sizes="320px"
            unoptimized
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-16 border border-dashed border-[var(--border-color)] flex items-center justify-center mono text-[9px] uppercase text-[var(--text-muted)]">
          {value ? 'Ассет не найден' : 'Ассет не выбран'}
        </div>
      )}

      <Select
        value={value ?? ''}
        onChange={(assetId) => void apply(assetId)}
        options={options.map((asset) => ({ value: asset.id, label: asset.name.toUpperCase() }))}
        placeholder={options.length > 0 ? 'ВЫБРАТЬ АССЕТ' : 'НЕТ IMAGE/TOKEN АССЕТОВ'}
        accentColor={accentColor}
      />

      {error && (
        <div className="mono text-[9px] uppercase font-black text-[var(--col-red)]">{error}</div>
      )}
    </div>
  );
};
