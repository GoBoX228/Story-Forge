import React, { useMemo, useState } from 'react';
import { ExternalLink, Eye, Filter, Globe, Search } from 'lucide-react';
import { PublishedContent, PublicationTargetType } from '../types';
import { Button, SearchInput, SectionHeader, Select } from './UI';

const ACCENT = 'var(--col-teal)';

const TYPE_LABELS: Record<PublicationTargetType, string> = {
  scenario: 'СЦЕНАРИЙ',
  map: 'КАРТА',
  character: 'ПЕРСОНАЖ',
  item: 'ПРЕДМЕТ',
  asset: 'АССЕТ',
  location: 'ЛОКАЦИЯ',
  faction: 'ФРАКЦИЯ',
  event: 'СОБЫТИЕ'
};

interface CommunityViewProps {
  publications: PublishedContent[];
}

export const CommunityView: React.FC<CommunityViewProps> = ({ publications }) => {
  const [typeFilter, setTypeFilter] = useState<PublicationTargetType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const publicFeed = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return publications
      .filter((publication) => publication.status === 'published' && publication.visibility === 'public')
      .filter((publication) => typeFilter === 'all' || publication.contentType === typeFilter)
      .filter((publication) => {
        if (!query) return true;
        const title = publication.targetTitle?.toLowerCase() ?? '';
        const summary = publication.metadata.summary?.toLowerCase() ?? '';
        return title.includes(query) || summary.includes(query);
      });
  }, [publications, searchQuery, typeFilter]);

  return (
    <div className="h-full overflow-auto bauhaus-bg p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <SectionHeader
          title="СООБЩЕСТВО"
          subtitle="ОПУБЛИКОВАННЫЕ МАТЕРИАЛЫ"
          accentColor={ACCENT}
          actions={
            <div className="mono text-[10px] uppercase font-black text-[var(--text-muted)]">
              {publicFeed.length} материалов
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          <aside className="space-y-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 space-y-3">
              <div className="flex items-center gap-2 mono text-[9px] uppercase font-black text-[var(--text-muted)]">
                <Filter size={13} style={{ color: ACCENT }} /> Фильтр
              </div>
              <Select
                value={typeFilter}
                onChange={(value) => setTypeFilter(value as PublicationTargetType | 'all')}
                options={[
                  { value: 'all', label: 'ВСЕ МАТЕРИАЛЫ' },
                  ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))
                ]}
                accentColor={ACCENT}
              />
              <SearchInput
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ПОИСК..."
                accentColor={ACCENT}
              />
            </div>
          </aside>

          <main className="space-y-4">
            {publicFeed.length === 0 ? (
              <div className="border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] p-10 text-center">
                <Globe className="mx-auto mb-4 text-[var(--text-muted)]" size={32} />
                <div className="mono text-[10px] uppercase font-black text-[var(--text-muted)]">
                  Публичных материалов пока нет
                </div>
              </div>
            ) : (
              publicFeed.map((publication) => (
                <article
                  key={publication.id}
                  className="bg-[var(--bg-surface)] border-2 border-[var(--border-color)] p-6 hover:border-[var(--col-teal)] transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-1 border border-[var(--col-teal)] mono text-[8px] uppercase font-black text-[var(--col-teal)]">
                          {TYPE_LABELS[publication.contentType]}
                        </span>
                        <span className="mono text-[8px] uppercase font-black text-[var(--text-muted)]">
                          {publication.publishedAt ? new Date(publication.publishedAt).toLocaleDateString('ru-RU') : 'без даты'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black uppercase text-[var(--text-main)]">
                        {publication.targetTitle ?? `Материал #${publication.contentId}`}
                      </h3>
                      {publication.metadata.summary && (
                        <p className="mono text-[11px] leading-relaxed text-[var(--text-muted)] max-w-3xl">
                          {publication.metadata.summary}
                        </p>
                      )}
                    </div>
                    <Button inverted color="white" size="sm" disabled>
                      <ExternalLink size={13} /> ОТКРЫТИЕ ПОЗЖЕ
                    </Button>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[var(--border-color)] flex items-center justify-between mono text-[9px] uppercase text-[var(--text-muted)]">
                    <span>slug: {publication.slug}</span>
                    <span className="flex items-center gap-2">
                      <Eye size={12} /> {publication.visibility}
                    </span>
                  </div>
                </article>
              ))
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
