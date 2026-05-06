import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Globe2, Lock, Send, Trash2 } from 'lucide-react';
import {
  PublishedContent,
  PublicationStatus,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload,
  PublicationVisibility
} from '../types';
import { Button, Input, Select } from './UI';

const STATUS_LABELS: Record<PublicationStatus, string> = {
  draft: 'ЧЕРНОВИК',
  published: 'ОПУБЛИКОВАНО',
  archived: 'АРХИВ'
};

const VISIBILITY_LABELS: Record<PublicationVisibility, string> = {
  private: 'ПРИВАТНО',
  unlisted: 'ПО ССЫЛКЕ',
  public: 'ПУБЛИЧНО'
};

interface PublicationPanelProps {
  targetType: PublicationTargetType;
  targetId: string;
  publication?: PublishedContent;
  accentColor?: string;
  validationSummary?: { errorCount: number; warningCount: number };
  onUpsertPublication: (
    type: PublicationTargetType,
    id: string,
    payload: PublicationUpsertPayload
  ) => Promise<PublishedContent>;
  onUpdatePublication: (id: string, payload: PublicationUpdatePayload) => Promise<PublishedContent>;
  onDeletePublication: (id: string) => Promise<void>;
}

export const PublicationPanel: React.FC<PublicationPanelProps> = ({
  targetType,
  targetId,
  publication,
  accentColor = 'var(--col-teal)',
  validationSummary,
  onUpsertPublication,
  onUpdatePublication,
  onDeletePublication
}) => {
  const [status, setStatus] = useState<PublicationStatus>(publication?.status ?? 'draft');
  const [visibility, setVisibility] = useState<PublicationVisibility>(publication?.visibility ?? 'private');
  const [summary, setSummary] = useState(publication?.metadata.summary ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setStatus(publication?.status ?? 'draft');
    setVisibility(publication?.visibility ?? 'private');
    setSummary(publication?.metadata.summary ?? '');
    setError('');
  }, [publication?.id, publication?.status, publication?.visibility, publication?.metadata.summary]);

  const statusTone = useMemo(() => {
    if (publication?.status === 'published') return 'text-[var(--col-green)]';
    if (publication?.status === 'archived') return 'text-[var(--text-muted)]';
    return 'text-[var(--col-yellow)]';
  }, [publication?.status]);

  const save = async (nextStatus = status) => {
    if (busy) return;

    if (targetType === 'scenario' && nextStatus === 'published' && validationSummary?.errorCount) {
      const ok = confirm(
        `Проверка сценария нашла ${validationSummary.errorCount} ошибок и ${validationSummary.warningCount} предупреждений. Backend заблокирует публикацию при ошибках. Продолжить?`
      );
      if (!ok) return;
    }

    setBusy(true);
    setError('');
    try {
      const payload = {
        status: nextStatus,
        visibility,
        metadata: { summary: summary.trim() || undefined }
      };

      if (publication) {
        await onUpdatePublication(publication.id, payload);
      } else {
        await onUpsertPublication(targetType, targetId, payload);
      }
    } catch (publicationError) {
      setError(publicationError instanceof Error ? publicationError.message : 'Не удалось обновить публикацию');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!publication || busy) return;
    if (!confirm('Снять публикацию материала?')) return;
    setBusy(true);
    setError('');
    try {
      await onDeletePublication(publication.id);
    } catch (publicationError) {
      setError(publicationError instanceof Error ? publicationError.message : 'Не удалось снять публикацию');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe2 size={14} style={{ color: accentColor }} />
          <span className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">Публикация</span>
        </div>
        <span className={`mono text-[9px] uppercase font-black ${statusTone}`}>
          {publication ? STATUS_LABELS[publication.status] : 'НЕ СОЗДАНА'}
        </span>
      </div>

      {publication?.slug && (
        <div className="mono text-[9px] uppercase text-[var(--text-muted)]">
          SLUG: <span className="text-[var(--text-main)]">{publication.slug}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Select
          value={status}
          onChange={(value) => setStatus(value as PublicationStatus)}
          options={(Object.keys(STATUS_LABELS) as PublicationStatus[]).map((value) => ({
            value,
            label: STATUS_LABELS[value]
          }))}
          accentColor={accentColor}
        />
        <Select
          value={visibility}
          onChange={(value) => setVisibility(value as PublicationVisibility)}
          options={(Object.keys(VISIBILITY_LABELS) as PublicationVisibility[]).map((value) => ({
            value,
            label: VISIBILITY_LABELS[value]
          }))}
          accentColor={accentColor}
        />
      </div>

      <Input
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        placeholder="Краткое описание для ленты сообщества"
        accentColor={accentColor}
      />

      {targetType === 'scenario' && validationSummary && (
        <div className="mono text-[9px] uppercase text-[var(--text-muted)]">
          Проверка: {validationSummary.errorCount} ошибок / {validationSummary.warningCount} предупреждений
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Button inverted color="white" size="sm" disabled={busy} onClick={() => void save('draft')}>
          <Lock size={13} /> ЧЕРНОВИК
        </Button>
        <Button inverted color="white" size="sm" disabled={busy} onClick={() => void save('published')}>
          <Send size={13} /> ОПУБЛИКОВАТЬ
        </Button>
        <Button inverted color="white" size="sm" disabled={busy} onClick={() => void save('archived')}>
          <Eye size={13} /> АРХИВ
        </Button>
      </div>

      {publication && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="mono text-[8px] uppercase font-black text-[var(--text-muted)] hover:text-[var(--col-red)] inline-flex items-center gap-2"
        >
          <Trash2 size={12} /> Снять публикацию
        </button>
      )}

      {error && (
        <div className="border border-[var(--col-red)] bg-[var(--col-red)]/10 p-3 mono text-[9px] uppercase font-black text-[var(--col-red)]">
          {error}
        </div>
      )}
    </div>
  );
};
