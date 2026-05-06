import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Edit3, Flag, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import {
  Campaign,
  Asset,
  Character,
  EntityLink,
  EntityLinkAssignmentMap,
  EntityLinkCreatePayload,
  EntityLinkTargetType,
  EntityLinkUpdatePayload,
  Faction,
  Item,
  MapData,
  PublishedContent,
  PublicationAssignmentMap,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload,
  Scenario,
  WorldEntityPayload,
  WorldEntityUpdatePayload,
  WorldEvent,
  WorldEventPayload,
  WorldEventUpdatePayload,
  WorldLocation,
  Tag,
  TagAssignmentMap,
  TaggableTargetType
} from '../types';
import { BaseCard } from './BaseCard';
import { Button, Input, SearchInput, SectionHeader, Select, TextArea } from './UI';
import { Modal } from './Modal';
import { entityLinkAssignmentKey, publicationAssignmentKey, tagAssignmentKey } from '../lib/mappers';
import { TagFilter, TagPicker } from './TagPicker';
import { EntityLinksPanel } from './EntityLinksPanel';
import { PublicationPanel } from './PublicationPanel';

type WorldTab = 'locations' | 'factions' | 'events';

interface WorldEditorProps {
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
  campaigns: Campaign[];
  scenarios: Scenario[];
  maps: MapData[];
  characters: Character[];
  items: Item[];
  assets: Asset[];
  onCreateLocation: (payload: WorldEntityPayload) => Promise<WorldLocation>;
  onUpdateLocation: (id: string, payload: WorldEntityUpdatePayload) => Promise<WorldLocation>;
  onDeleteLocation: (id: string) => Promise<void>;
  onCreateFaction: (payload: WorldEntityPayload) => Promise<Faction>;
  onUpdateFaction: (id: string, payload: WorldEntityUpdatePayload) => Promise<Faction>;
  onDeleteFaction: (id: string) => Promise<void>;
  onCreateEvent: (payload: WorldEventPayload) => Promise<WorldEvent>;
  onUpdateEvent: (id: string, payload: WorldEventUpdatePayload) => Promise<WorldEvent>;
  onDeleteEvent: (id: string) => Promise<void>;
  tags: Tag[];
  tagAssignments: TagAssignmentMap;
  entityLinks: EntityLinkAssignmentMap;
  publicationAssignments: PublicationAssignmentMap;
  onReplaceTargetTags: (type: TaggableTargetType, id: string, tagIds: string[], newTags?: string[]) => Promise<Tag[]>;
  onUpdateTag: (id: string, name: string) => Promise<Tag>;
  onDeleteTag: (id: string) => Promise<void>;
  onCreateMaterialLink: (sourceType: EntityLinkTargetType, sourceId: string, payload: EntityLinkCreatePayload) => Promise<EntityLink>;
  onUpdateMaterialLink: (id: string, payload: EntityLinkUpdatePayload) => Promise<EntityLink>;
  onDeleteMaterialLink: (id: string) => Promise<void>;
  onUpsertPublication: (type: PublicationTargetType, id: string, payload: PublicationUpsertPayload) => Promise<PublishedContent>;
  onUpdatePublication: (id: string, payload: PublicationUpdatePayload) => Promise<PublishedContent>;
  onDeletePublication: (id: string) => Promise<void>;
  onOpenMaterialLink?: (targetType: EntityLinkTargetType, targetId: string) => void;
  initialTarget?: { type: 'location' | 'faction' | 'event'; id: string } | null;
}

const SECTION_ACCENT = 'var(--col-purple)';

const TAB_LABELS: Record<WorldTab, string> = {
  locations: 'ЛОКАЦИИ',
  factions: 'ФРАКЦИИ',
  events: 'СОБЫТИЯ'
};

const EMPTY_FORM = {
  id: '',
  title: '',
  description: '',
  campaignId: '',
  startsAt: '',
  endsAt: ''
};

const getCampaignName = (campaigns: Campaign[], campaignId?: string | null): string => {
  if (!campaignId) return 'Без кампании';
  return campaigns.find((campaign) => campaign.id === campaignId)?.title ?? 'Кампания не найдена';
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const toDateTimeInput = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const WorldEditor: React.FC<WorldEditorProps> = ({
  locations,
  factions,
  events,
  campaigns,
  scenarios,
  maps,
  characters,
  items,
  assets,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
  onCreateFaction,
  onUpdateFaction,
  onDeleteFaction,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  tags,
  tagAssignments,
  entityLinks,
  publicationAssignments,
  onReplaceTargetTags,
  onUpdateTag,
  onDeleteTag,
  onCreateMaterialLink,
  onUpdateMaterialLink,
  onDeleteMaterialLink,
  onUpsertPublication,
  onUpdatePublication,
  onDeletePublication,
  onOpenMaterialLink,
  initialTarget
}) => {
  const [activeTab, setActiveTab] = useState<WorldTab>('locations');
  const [searchQuery, setSearchQuery] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [editingKind, setEditingKind] = useState<WorldTab | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialTarget) return;

    if (initialTarget.type === 'location') {
      const target = locations.find((location) => location.id === initialTarget.id);
      if (target) {
        setActiveTab('locations');
        setEditingKind('locations');
        setForm({
          id: target.id,
          title: target.name,
          description: target.description ?? '',
          campaignId: target.campaignId ?? '',
          startsAt: '',
          endsAt: ''
        });
        setError('');
      }
      return;
    }

    if (initialTarget.type === 'faction') {
      const target = factions.find((faction) => faction.id === initialTarget.id);
      if (target) {
        setActiveTab('factions');
        setEditingKind('factions');
        setForm({
          id: target.id,
          title: target.name,
          description: target.description ?? '',
          campaignId: target.campaignId ?? '',
          startsAt: '',
          endsAt: ''
        });
        setError('');
      }
      return;
    }

    const target = events.find((event) => event.id === initialTarget.id);
    if (target) {
      setActiveTab('events');
      setEditingKind('events');
      setForm({
        id: target.id,
        title: target.title,
        description: target.description ?? '',
        campaignId: target.campaignId ?? '',
        startsAt: toDateTimeInput(target.startsAt),
        endsAt: toDateTimeInput(target.endsAt)
      });
      setError('');
    }
  }, [events, factions, initialTarget, locations]);

  const campaignOptions = useMemo(
    () => [
      { value: '', label: 'ВСЕ КАМПАНИИ' },
      ...campaigns.map((campaign) => ({ value: campaign.id, label: campaign.title.toUpperCase() }))
    ],
    [campaigns]
  );

  const editCampaignOptions = useMemo(
    () => [
      { value: '', label: 'БЕЗ КАМПАНИИ' },
      ...campaigns.map((campaign) => ({ value: campaign.id, label: campaign.title.toUpperCase() }))
    ],
    [campaigns]
  );

  const filteredLocations = useMemo(
    () => filterNamedRecords(locations, searchQuery, campaignFilter)
      .filter((record) => matchesTag(record.id, 'location', selectedTagFilter, tagAssignments)),
    [locations, searchQuery, campaignFilter, selectedTagFilter, tagAssignments]
  );
  const filteredFactions = useMemo(
    () => filterNamedRecords(factions, searchQuery, campaignFilter)
      .filter((record) => matchesTag(record.id, 'faction', selectedTagFilter, tagAssignments)),
    [factions, searchQuery, campaignFilter, selectedTagFilter, tagAssignments]
  );
  const filteredEvents = useMemo(
    () => filterEventRecords(events, searchQuery, campaignFilter)
      .filter((record) => matchesTag(record.id, 'event', selectedTagFilter, tagAssignments)),
    [events, searchQuery, campaignFilter, selectedTagFilter, tagAssignments]
  );

  const openCreateModal = (kind: WorldTab) => {
    setEditingKind(kind);
    setForm(EMPTY_FORM);
    setError('');
  };

  const openLocationModal = (location: WorldLocation) => {
    setEditingKind('locations');
    setForm({
      id: location.id,
      title: location.name,
      description: location.description ?? '',
      campaignId: location.campaignId ?? '',
      startsAt: '',
      endsAt: ''
    });
    setError('');
  };

  const openFactionModal = (faction: Faction) => {
    setEditingKind('factions');
    setForm({
      id: faction.id,
      title: faction.name,
      description: faction.description ?? '',
      campaignId: faction.campaignId ?? '',
      startsAt: '',
      endsAt: ''
    });
    setError('');
  };

  const openEventModal = (event: WorldEvent) => {
    setEditingKind('events');
    setForm({
      id: event.id,
      title: event.title,
      description: event.description ?? '',
      campaignId: event.campaignId ?? '',
      startsAt: toDateTimeInput(event.startsAt),
      endsAt: toDateTimeInput(event.endsAt)
    });
    setError('');
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setEditingKind(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!editingKind || !form.title.trim() || isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      if (editingKind === 'events') {
        const payload: WorldEventPayload = {
          title: form.title.trim(),
          description: form.description.trim() || null,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
          campaignId: form.campaignId || null,
          metadata: {}
        };

        if (form.id) {
          await onUpdateEvent(form.id, payload);
        } else {
          await onCreateEvent(payload);
        }
      } else {
        const payload: WorldEntityPayload = {
          name: form.title.trim(),
          description: form.description.trim() || null,
          campaignId: form.campaignId || null,
          metadata: {}
        };

        if (editingKind === 'locations') {
          if (form.id) await onUpdateLocation(form.id, payload);
          else await onCreateLocation(payload);
        } else {
          if (form.id) await onUpdateFaction(form.id, payload);
          else await onCreateFaction(payload);
        }
      }

      closeModal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить запись мира');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (kind: WorldTab, id: string, title: string) => {
    if (!confirm(`Удалить "${title}" из мира?`)) return;
    setError('');
    setIsSubmitting(true);

    try {
      if (kind === 'locations') await onDeleteLocation(id);
      if (kind === 'factions') await onDeleteFaction(id);
      if (kind === 'events') await onDeleteEvent(id);
      if (form.id === id) closeModal();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить запись мира');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = activeTab === 'locations' ? locations.length : activeTab === 'factions' ? factions.length : events.length;
  const filteredCount = activeTab === 'locations'
    ? filteredLocations.length
    : activeTab === 'factions'
      ? filteredFactions.length
      : filteredEvents.length;

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 bg-[var(--bg-main)] overflow-auto p-12 bauhaus-bg relative">
        <div className="max-w-7xl mx-auto space-y-10">
          <SectionHeader
            title="АТЛАС МИРА"
            subtitle="ЛОКАЦИИ / ФРАКЦИИ / СОБЫТИЯ"
            accentColor={SECTION_ACCENT}
            actions={
              <Button color="purple" size="lg" onClick={() => openCreateModal(activeTab)}>
                <Plus size={18} /> ДОБАВИТЬ
              </Button>
            }
          />

          {error && (
            <div className="border border-[var(--col-red)] bg-[var(--col-red)]/10 p-4 mono text-[10px] uppercase font-black text-[var(--col-red)]">
              {error}
            </div>
          )}

          <div className="border border-[var(--border-color)] bg-[var(--bg-surface)]">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-color)] p-4">
              {(['locations', 'factions', 'events'] as WorldTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`h-10 px-5 border-2 mono text-[10px] uppercase font-black transition-colors ${
                    activeTab === tab
                      ? 'bg-[var(--col-purple)] border-[var(--col-purple)] text-[var(--text-inverted)]'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--col-purple)] hover:text-[var(--col-purple)]'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
              <span className="mono text-[10px] uppercase text-[var(--text-muted)] ml-auto">
                {filteredCount} / {activeCount}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 p-4 border-b border-[var(--border-color)]">
              <SearchInput
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск по миру"
              />
              <Select
                value={campaignFilter}
                onChange={setCampaignFilter}
                options={campaignOptions}
                accentColor={SECTION_ACCENT}
              />
              <TagFilter tags={tags} value={selectedTagFilter} onChange={setSelectedTagFilter} accentColor={SECTION_ACCENT} />
            </div>

            <div className="p-6">
              {activeTab === 'locations' && (
                <RecordGrid
                  records={filteredLocations}
                  campaigns={campaigns}
                  emptyLabel="Локации еще не созданы"
                  icon={<MapPin size={18} />}
                  onEdit={openLocationModal}
                  onDelete={(location) => void handleDelete('locations', location.id, location.name)}
                />
              )}

              {activeTab === 'factions' && (
                <RecordGrid
                  records={filteredFactions}
                  campaigns={campaigns}
                  emptyLabel="Фракции еще не созданы"
                  icon={<Flag size={18} />}
                  onEdit={openFactionModal}
                  onDelete={(faction) => void handleDelete('factions', faction.id, faction.name)}
                />
              )}

              {activeTab === 'events' && (
                <EventGrid
                  records={filteredEvents}
                  campaigns={campaigns}
                  onEdit={openEventModal}
                  onDelete={(event) => void handleDelete('events', event.id, event.title)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={editingKind !== null}
        onClose={closeModal}
        title={`${form.id ? 'Редактировать' : 'Создать'} ${editingKind ? TAB_LABELS[editingKind].toLowerCase() : ''}`}
        accentColor={SECTION_ACCENT}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5">
          <Input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder={editingKind === 'events' ? 'Название события' : 'Название'}
            accentColor={SECTION_ACCENT}
          />
          <TextArea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Описание"
            accentColor={SECTION_ACCENT}
            rows={6}
          />
          <Select
            value={form.campaignId}
            onChange={(value) => setForm((prev) => ({ ...prev, campaignId: value }))}
            options={editCampaignOptions}
            accentColor={SECTION_ACCENT}
          />

          {editingKind === 'events' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                accentColor={SECTION_ACCENT}
              />
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                accentColor={SECTION_ACCENT}
              />
            </div>
          )}

          {form.id && editingKind && (
            <TagPicker
              allTags={tags}
              selectedTags={tagAssignments[tagAssignmentKey(worldTabToTargetType(editingKind), form.id)] ?? []}
              accentColor={SECTION_ACCENT}
              onReplaceTags={(tagIds, newTags) => onReplaceTargetTags(worldTabToTargetType(editingKind), form.id, tagIds, newTags)}
              onUpdateTag={onUpdateTag}
              onDeleteTag={onDeleteTag}
            />
          )}
          {form.id && editingKind && (
            <EntityLinksPanel
              sourceType={worldTabToTargetType(editingKind)}
              sourceId={form.id}
              links={entityLinks[entityLinkAssignmentKey(worldTabToTargetType(editingKind), form.id)] ?? []}
              scenarios={scenarios}
              maps={maps}
              characters={characters}
              items={items}
              assets={assets}
              locations={locations}
              factions={factions}
              events={events}
              accentColor={SECTION_ACCENT}
              onCreateLink={onCreateMaterialLink}
              onUpdateLink={onUpdateMaterialLink}
              onDeleteLink={onDeleteMaterialLink}
              onOpenLink={onOpenMaterialLink}
            />
          )}
          {form.id && editingKind && (
            <PublicationPanel
              targetType={worldTabToTargetType(editingKind)}
              targetId={form.id}
              publication={publicationAssignments[publicationAssignmentKey(worldTabToTargetType(editingKind), form.id)]}
              accentColor={SECTION_ACCENT}
              onUpsertPublication={onUpsertPublication}
              onUpdatePublication={onUpdatePublication}
              onDeletePublication={onDeletePublication}
            />
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button color="grey" inverted onClick={closeModal} disabled={isSubmitting}>
              ОТМЕНА
            </Button>
            <Button color="purple" onClick={() => void handleSave()} disabled={!form.title.trim() || isSubmitting}>
              СОХРАНИТЬ
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const worldTabToTargetType = (tab: WorldTab): TaggableTargetType => {
  if (tab === 'locations') return 'location';
  if (tab === 'factions') return 'faction';
  return 'event';
};

const matchesTag = (
  id: string,
  type: TaggableTargetType,
  selectedTagId: string,
  assignments: TagAssignmentMap
): boolean => {
  if (!selectedTagId) return true;
  return (assignments[tagAssignmentKey(type, id)] ?? []).some((tag) => tag.id === selectedTagId);
};

const filterNamedRecords = <T extends { name: string; description?: string | null; campaignId?: string | null }>(
  records: T[],
  query: string,
  campaignId: string
): T[] => {
  const search = query.trim().toLowerCase();
  return records.filter((record) => {
    const matchesCampaign = !campaignId || record.campaignId === campaignId;
    const matchesSearch =
      !search ||
      record.name.toLowerCase().includes(search) ||
      (record.description ?? '').toLowerCase().includes(search);
    return matchesCampaign && matchesSearch;
  });
};

const filterEventRecords = (records: WorldEvent[], query: string, campaignId: string): WorldEvent[] => {
  const search = query.trim().toLowerCase();
  return records.filter((record) => {
    const matchesCampaign = !campaignId || record.campaignId === campaignId;
    const matchesSearch =
      !search ||
      record.title.toLowerCase().includes(search) ||
      (record.description ?? '').toLowerCase().includes(search);
    return matchesCampaign && matchesSearch;
  });
};

interface RecordGridProps<T extends WorldLocation | Faction> {
  records: T[];
  campaigns: Campaign[];
  emptyLabel: string;
  icon: React.ReactNode;
  onEdit: (record: T) => void;
  onDelete: (record: T) => void;
}

const RecordGrid = <T extends WorldLocation | Faction>({
  records,
  campaigns,
  emptyLabel,
  icon,
  onEdit,
  onDelete
}: RecordGridProps<T>) => {
  if (records.length === 0) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {records.map((record) => (
        <BaseCard key={record.id} accentColor={SECTION_ACCENT} className="min-h-[220px]">
          <div className="flex h-full flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[var(--col-purple)]">
                  {icon}
                  <span className="mono text-[9px] uppercase font-black">
                    {getCampaignName(campaigns, record.campaignId)}
                  </span>
                </div>
                <h3 className="text-lg font-black uppercase leading-tight text-[var(--text-main)]">
                  {record.name}
                </h3>
              </div>
              <CardActions onEdit={() => onEdit(record)} onDelete={() => onDelete(record)} />
            </div>
            <p className="mono text-[11px] leading-relaxed text-[var(--text-muted)] whitespace-pre-wrap flex-1">
              {record.description || 'Описание пока не добавлено.'}
            </p>
          </div>
        </BaseCard>
      ))}
    </div>
  );
};

interface EventGridProps {
  records: WorldEvent[];
  campaigns: Campaign[];
  onEdit: (record: WorldEvent) => void;
  onDelete: (record: WorldEvent) => void;
}

const EventGrid: React.FC<EventGridProps> = ({ records, campaigns, onEdit, onDelete }) => {
  if (records.length === 0) {
    return <EmptyState label="События еще не созданы" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {records.map((record) => (
        <BaseCard key={record.id} accentColor={SECTION_ACCENT} className="min-h-[240px]">
          <div className="flex h-full flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[var(--col-purple)]">
                  <CalendarDays size={18} />
                  <span className="mono text-[9px] uppercase font-black">
                    {getCampaignName(campaigns, record.campaignId)}
                  </span>
                </div>
                <h3 className="text-lg font-black uppercase leading-tight text-[var(--text-main)]">
                  {record.title}
                </h3>
              </div>
              <CardActions onEdit={() => onEdit(record)} onDelete={() => onDelete(record)} />
            </div>
            <div className="mono text-[10px] uppercase text-[var(--text-muted)] space-y-1">
              <div>Начало: {formatDateTime(record.startsAt) || 'Не указано'}</div>
              <div>Конец: {formatDateTime(record.endsAt) || 'Не указано'}</div>
            </div>
            <p className="mono text-[11px] leading-relaxed text-[var(--text-muted)] whitespace-pre-wrap flex-1">
              {record.description || 'Описание пока не добавлено.'}
            </p>
          </div>
        </BaseCard>
      ))}
    </div>
  );
};

const CardActions: React.FC<{ onEdit: () => void; onDelete: () => void }> = ({ onEdit, onDelete }) => (
  <div className="flex gap-2">
    <button
      type="button"
      onClick={onEdit}
      className="h-9 w-9 border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--col-purple)] hover:text-[var(--col-purple)] transition-colors flex items-center justify-center"
      title="Редактировать"
    >
      <Edit3 size={15} />
    </button>
    <button
      type="button"
      onClick={onDelete}
      className="h-9 w-9 border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--col-red)] hover:text-[var(--col-red)] transition-colors flex items-center justify-center"
      title="Удалить"
    >
      <Trash2 size={15} />
    </button>
  </div>
);

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="min-h-[260px] border-2 border-dashed border-[var(--border-color)] flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
    <Search size={28} />
    <span className="mono text-[10px] uppercase font-black">{label}</span>
  </div>
);

export default WorldEditor;
