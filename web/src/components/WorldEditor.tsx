import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Edit3,
  Flag,
  MapPin,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';
import {
  Campaign,
  Character,
  Chronicle,
  ChroniclePayload,
  ChronicleUpdatePayload,
  EntityLink,
  EntityLinkAssignmentMap,
  EntityLinkCreatePayload,
  EntityLinkTargetType,
  EntityLinkUpdatePayload,
  Faction,
  MapData,
  PublishedContent,
  PublicationAssignmentMap,
  PublicationTargetType,
  PublicationUpdatePayload,
  PublicationUpsertPayload,
  Scenario,
  Tag,
  TagAssignmentMap,
  TaggableTargetType,
  WorldEntityPayload,
  WorldEntityUpdatePayload,
  WorldEvent,
  WorldEventPayload,
  WorldEventUpdatePayload,
  WorldLocation
} from '../types';
import { BaseCard } from './BaseCard';
import { Button, Input, SearchInput, SectionHeader, Select, TextArea } from './UI';
import { Modal } from './Modal';
import { entityLinkAssignmentKey, publicationAssignmentKey, tagAssignmentKey } from '../lib/mappers';
import { TagFilter, TagPicker } from './TagPicker';
import { PublicationPanel } from './PublicationPanel';
import ChronicleEditor from './ChronicleEditor';

type EditableKind = 'chronicle' | 'location' | 'faction' | 'event';
type AtlasEntityKind = 'location' | 'faction' | 'event';

interface WorldEditorProps {
  locations: WorldLocation[];
  factions: Faction[];
  chronicles: Chronicle[];
  events: WorldEvent[];
  campaigns: Campaign[];
  scenarios: Scenario[];
  maps: MapData[];
  characters: Character[];
  items?: unknown[];
  assets?: unknown[];
  onCreateLocation: (payload: WorldEntityPayload) => Promise<WorldLocation>;
  onUpdateLocation: (id: string, payload: WorldEntityUpdatePayload) => Promise<WorldLocation>;
  onDeleteLocation: (id: string) => Promise<void>;
  onCreateFaction: (payload: WorldEntityPayload) => Promise<Faction>;
  onUpdateFaction: (id: string, payload: WorldEntityUpdatePayload) => Promise<Faction>;
  onDeleteFaction: (id: string) => Promise<void>;
  onCreateChronicle: (payload: ChroniclePayload) => Promise<Chronicle>;
  onUpdateChronicle: (id: string, payload: ChronicleUpdatePayload) => Promise<Chronicle>;
  onDeleteChronicle: (id: string) => Promise<void>;
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
  initialTarget?: { type: AtlasEntityKind; id: string } | null;
}

interface AtlasMaterialOption {
  id: string;
  label: string;
}

interface AtlasTypedLinkField {
  targetType: EntityLinkTargetType;
  label: string;
  removeTitle: string;
  accentColor: string;
  options: AtlasMaterialOption[];
}

interface AtlasFormState {
  id: string;
  kind: EditableKind | null;
  title: string;
  description: string;
  campaignId: string;
  startLabel: string;
  endLabel: string;
  stepSize: string;
  position: string;
  endPosition: string;
}

const SECTION_ACCENT = 'var(--col-purple)';

const EMPTY_FORM: AtlasFormState = {
  id: '',
  kind: null,
  title: '',
  description: '',
  campaignId: '',
  startLabel: '',
  endLabel: '',
  stepSize: '10',
  position: '0',
  endPosition: ''
};

const WorldEditor: React.FC<WorldEditorProps> = ({
  locations,
  factions,
  chronicles,
  events,
  campaigns,
  scenarios,
  maps,
  characters,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
  onCreateFaction,
  onUpdateFaction,
  onDeleteFaction,
  onCreateChronicle,
  onUpdateChronicle,
  onDeleteChronicle,
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
  onDeleteMaterialLink,
  onUpsertPublication,
  onUpdatePublication,
  onDeletePublication,
  initialTarget
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [selectedChronicleId, setSelectedChronicleId] = useState<string | null>(null);
  const [form, setForm] = useState<AtlasFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedChronicle = selectedChronicleId
    ? chronicles.find((chronicle) => chronicle.id === selectedChronicleId) ?? null
    : null;

  useEffect(() => {
    if (!initialTarget) return;

    if (initialTarget.type === 'location') {
      const target = locations.find((location) => location.id === initialTarget.id);
      if (target) openLocationModal(target);
      return;
    }

    if (initialTarget.type === 'faction') {
      const target = factions.find((faction) => faction.id === initialTarget.id);
      if (target) openFactionModal(target);
      return;
    }

    const target = events.find((event) => event.id === initialTarget.id);
    if (target) {
      setSelectedChronicleId(target.chronicleId ?? null);
      setForm({
        ...EMPTY_FORM,
        id: target.id,
        kind: 'event',
        title: target.title,
        description: target.description ?? '',
        campaignId: target.chronicleId ?? '',
        startLabel: target.startLabel ?? '',
        endLabel: target.endLabel ?? '',
        position: String(target.position ?? 0),
        endPosition: target.endPosition === null || target.endPosition === undefined ? '' : String(target.endPosition)
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

  const eventChronicleOptions = useMemo(
    () => [
      { value: '', label: 'БЕЗ ХРОНИКИ' },
      ...chronicles.map((chronicle) => ({ value: chronicle.id, label: chronicle.title.toUpperCase() }))
    ],
    [chronicles]
  );

  const filteredChronicles = useMemo(
    () => filterChronicles(chronicles, searchQuery, campaignFilter),
    [chronicles, campaignFilter, searchQuery]
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

  const currentEvents = useMemo(() => {
    if (selectedChronicle) {
      return events.filter((event) => event.chronicleId === selectedChronicle.id);
    }

    return [];
  }, [events, selectedChronicle]);

  const filteredCurrentEvents = useMemo(
    () => [...currentEvents].sort((left, right) => left.position - right.position || left.title.localeCompare(right.title)),
    [currentEvents]
  );

  const editingSourceType = form.id && isAtlasEntityKind(form.kind) ? editableKindToTargetType(form.kind) : null;
  const editingLinks = form.id && editingSourceType
    ? entityLinks[entityLinkAssignmentKey(editingSourceType, form.id)] ?? []
    : [];

  const atlasTypedLinkFields = useMemo<AtlasTypedLinkField[]>(() => {
    const scenarioOptions = scenarios.map((scenario) => ({ id: scenario.id, label: scenario.title }));
    const mapOptions = maps.map((map) => ({ id: map.id, label: map.name }));
    const characterOptions = characters.map((character) => ({ id: character.id, label: character.name }));
    const locationOptions = locations.map((location) => ({ id: location.id, label: location.name }));
    const factionOptions = factions.map((faction) => ({ id: faction.id, label: faction.name }));

    if (form.kind === 'location') {
      return [
        { targetType: 'map', label: 'Карты', removeTitle: 'Убрать карту', accentColor: 'var(--col-white)', options: mapOptions }
      ];
    }

    if (form.kind === 'faction') {
      return [
        { targetType: 'character', label: 'Участники', removeTitle: 'Убрать участника', accentColor: 'var(--col-yellow)', options: characterOptions }
      ];
    }

    if (form.kind === 'event') {
      return [
        { targetType: 'scenario', label: 'Сценарии', removeTitle: 'Убрать сценарий', accentColor: 'var(--col-red)', options: scenarioOptions },
        { targetType: 'location', label: 'Места', removeTitle: 'Убрать место', accentColor: 'var(--col-purple)', options: locationOptions },
        { targetType: 'faction', label: 'Организации', removeTitle: 'Убрать организацию', accentColor: 'var(--col-purple)', options: factionOptions }
      ];
    }

    return [];
  }, [characters, factions, form.kind, locations, maps, scenarios]);

  const openCreateModal = (
    kind: EditableKind,
    defaults: { position?: number; endPosition?: number | null; chronicleId?: string | null } = {}
  ) => {
    const nextPosition = selectedChronicle
      ? Math.max(0, ...currentEvents.map((event) => event.endPosition ?? event.position)) + (selectedChronicle?.stepSize ?? 10)
      : 0;

    setForm({
      ...EMPTY_FORM,
      kind,
      campaignId: kind === 'event' ? defaults.chronicleId ?? selectedChronicle?.id ?? '' : '',
      stepSize: '10',
      position: kind === 'event' ? String(defaults.position ?? nextPosition) : '0',
      endPosition: kind === 'event' && defaults.endPosition !== undefined && defaults.endPosition !== null
        ? String(defaults.endPosition)
        : ''
    });
    setError('');
  };

  const openChronicleModal = (chronicle: Chronicle) => {
    setForm({
      id: chronicle.id,
      kind: 'chronicle',
      title: chronicle.title,
      description: chronicle.description ?? '',
      campaignId: chronicle.campaignId ?? '',
      startLabel: chronicle.startLabel ?? '',
      endLabel: chronicle.endLabel ?? '',
      stepSize: String(chronicle.stepSize || 10),
      position: '0',
      endPosition: ''
    });
    setError('');
  };

  function openLocationModal(location: WorldLocation) {
    setForm({
      ...EMPTY_FORM,
      id: location.id,
      kind: 'location',
      title: location.name,
      description: location.description ?? '',
      campaignId: location.campaignId ?? ''
    });
    setError('');
  }

  function openFactionModal(faction: Faction) {
    setForm({
      ...EMPTY_FORM,
      id: faction.id,
      kind: 'faction',
      title: faction.name,
      description: faction.description ?? '',
      campaignId: faction.campaignId ?? ''
    });
    setError('');
  }

  function openEventModal(event: WorldEvent) {
    setForm({
      ...EMPTY_FORM,
      id: event.id,
      kind: 'event',
      title: event.title,
      description: event.description ?? '',
      campaignId: event.chronicleId ?? selectedChronicle?.id ?? '',
      startLabel: event.startLabel ?? '',
      endLabel: event.endLabel ?? '',
      position: String(event.position ?? 0),
      endPosition: event.endPosition === null || event.endPosition === undefined ? '' : String(event.endPosition)
    });
    setError('');
  }

  const closeModal = () => {
    if (isSubmitting) return;
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.kind || !form.title.trim() || isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      if (form.kind === 'chronicle') {
        const payload: ChroniclePayload = {
          title: form.title.trim(),
          description: form.description.trim() || null,
          startLabel: form.startLabel.trim() || null,
          endLabel: form.endLabel.trim() || null,
          stepSize: Math.max(1, Number(form.stepSize) || 10),
          campaignId: form.campaignId || null,
          metadata: {}
        };

        const saved = form.id
          ? await onUpdateChronicle(form.id, payload)
          : await onCreateChronicle(payload);

        if (!form.id) {
          setSelectedChronicleId(saved.id);
        }
      } else if (form.kind === 'event') {
        const payload: WorldEventPayload = {
          title: form.title.trim(),
          description: form.description.trim() || null,
          chronicleId: form.campaignId || selectedChronicle?.id || null,
          position: Number(form.position) || 0,
          endPosition: form.endPosition.trim() === '' ? null : Number(form.endPosition),
          startLabel: form.startLabel.trim() || null,
          endLabel: form.endLabel.trim() || null,
          metadata: {}
        };

        if (form.id) await onUpdateEvent(form.id, payload);
        else await onCreateEvent(payload);
      } else {
        const payload: WorldEntityPayload = {
          name: form.title.trim(),
          description: form.description.trim() || null,
          campaignId: form.campaignId || null,
          metadata: {}
        };

        if (form.kind === 'location') {
          if (form.id) await onUpdateLocation(form.id, payload);
          else await onCreateLocation(payload);
        } else {
          if (form.id) await onUpdateFaction(form.id, payload);
          else await onCreateFaction(payload);
        }
      }

      closeModal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить запись Атласа');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChronicle = async (chronicle: Chronicle) => {
    if (!confirm(`Удалить хронику "${chronicle.title}"? События останутся без хроники.`)) return;
    setError('');
    setIsSubmitting(true);

    try {
      await onDeleteChronicle(chronicle.id);
      if (selectedChronicleId === chronicle.id) {
        setSelectedChronicleId(null);
      }
      if (form.id === chronicle.id && form.kind === 'chronicle') closeModal();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить хронику');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAtlasEntity = async (kind: AtlasEntityKind, id: string, title: string) => {
    if (!confirm(`Удалить "${title}" из Атласа?`)) return;
    setError('');
    setIsSubmitting(true);

    try {
      if (kind === 'location') await onDeleteLocation(id);
      if (kind === 'faction') await onDeleteFaction(id);
      if (kind === 'event') await onDeleteEvent(id);
      if (form.id === id) closeModal();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить запись Атласа');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAtlasLink = async (targetType: EntityLinkTargetType, targetId: string) => {
    if (!editingSourceType || !form.id || !targetId || isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      await onCreateMaterialLink(editingSourceType, form.id, {
        targetType,
        targetId,
        relationType: 'related',
        label: null
      });
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'Не удалось добавить материал в Атлас');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAtlasLink = async (linkId: string) => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      await onDeleteMaterialLink(linkId);
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'Не удалось убрать материал из Атласа');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full">
      <div className={`flex-1 bg-[var(--bg-main)] overflow-auto bauhaus-bg relative ${selectedChronicle ? 'p-0' : 'p-12'}`}>
        <div className={selectedChronicle ? 'h-full' : 'max-w-7xl mx-auto space-y-8'}>
          {selectedChronicle ? (
            <ChronicleEditor
              chronicle={selectedChronicle}
              events={filteredCurrentEvents}
              onBack={() => {
                setSelectedChronicleId(null);
              }}
              onEditChronicle={() => openChronicleModal(selectedChronicle)}
              onCreatePointEvent={(position) => openCreateModal('event', { position, endPosition: null })}
              onCreateRangeEvent={(position, endPosition) => openCreateModal('event', { position, endPosition })}
              onEditEvent={openEventModal}
              onDeleteEvent={(event) => void handleDeleteAtlasEntity('event', event.id, event.title)}
              onUpdateEvent={onUpdateEvent}
            />
          ) : (
            <SectionHeader
              title="АТЛАС"
              subtitle="ХРОНИКИ / МЕСТА / ОРГАНИЗАЦИИ"
              accentColor={SECTION_ACCENT}
              actions={
                <Button color="purple" size="lg" onClick={() => openCreateModal('chronicle')}>
                  <Plus size={18} /> СОЗДАТЬ ХРОНИКУ
                </Button>
              }
            />
          )}

          {error && (
            <div className="border border-[var(--col-red)] bg-[var(--col-red)]/10 p-4 mono text-[10px] uppercase font-black text-[var(--col-red)]">
              {error}
            </div>
          )}

          {!selectedChronicle && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
            <SearchInput
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Поиск по Атласу"
              accentColor={SECTION_ACCENT}
            />
            <Select value={campaignFilter} onChange={setCampaignFilter} options={campaignOptions} accentColor={SECTION_ACCENT} />
            <TagFilter tags={tags} value={selectedTagFilter} onChange={setSelectedTagFilter} accentColor={SECTION_ACCENT} />
          </div>
          )}

          {!selectedChronicle && (
            <AtlasDashboard
              chronicles={filteredChronicles}
              locations={filteredLocations}
              factions={filteredFactions}
              events={events}
              campaigns={campaigns}
              unassignedEvents={events.filter((event) => !event.chronicleId)}
              onOpenChronicle={(chronicle) => setSelectedChronicleId(chronicle.id)}
              onEditChronicle={openChronicleModal}
              onDeleteChronicle={(chronicle) => void handleDeleteChronicle(chronicle)}
              onEditUnassignedEvent={openEventModal}
              onDeleteUnassignedEvent={(event) => void handleDeleteAtlasEntity('event', event.id, event.title)}
              onCreateChronicle={() => openCreateModal('chronicle')}
              onCreateLocation={() => openCreateModal('location')}
              onEditLocation={openLocationModal}
              onDeleteLocation={(location) => void handleDeleteAtlasEntity('location', location.id, location.name)}
              onCreateFaction={() => openCreateModal('faction')}
              onEditFaction={openFactionModal}
              onDeleteFaction={(faction) => void handleDeleteAtlasEntity('faction', faction.id, faction.name)}
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={form.kind !== null}
        onClose={closeModal}
        title={getModalTitle(form)}
        accentColor={SECTION_ACCENT}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5">
          <Input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder={getTitlePlaceholder(form.kind)}
            accentColor={SECTION_ACCENT}
          />
          <TextArea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Описание"
            accentColor={SECTION_ACCENT}
            rows={6}
          />
          {form.kind === 'event' && !selectedChronicle ? (
            <Select
              value={form.campaignId}
              onChange={(value) => setForm((prev) => ({ ...prev, campaignId: value }))}
              options={eventChronicleOptions}
              accentColor={SECTION_ACCENT}
            />
          ) : form.kind !== 'event' ? (
            <Select
              value={form.campaignId}
              onChange={(value) => setForm((prev) => ({ ...prev, campaignId: value }))}
              options={editCampaignOptions}
              accentColor={SECTION_ACCENT}
            />
          ) : null}

          {form.kind === 'chronicle' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                value={form.startLabel}
                onChange={(event) => setForm((prev) => ({ ...prev, startLabel: event.target.value }))}
                placeholder="Метка начала"
                accentColor={SECTION_ACCENT}
              />
              <Input
                value={form.endLabel}
                onChange={(event) => setForm((prev) => ({ ...prev, endLabel: event.target.value }))}
                placeholder="Метка конца"
                accentColor={SECTION_ACCENT}
              />
              <Input
                type="number"
                min={1}
                value={form.stepSize}
                onChange={(event) => setForm((prev) => ({ ...prev, stepSize: event.target.value }))}
                placeholder="Шаг шкалы"
                accentColor={SECTION_ACCENT}
              />
            </div>
          )}

          {form.kind === 'event' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                value={form.position}
                onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
                placeholder="Позиция"
                accentColor={SECTION_ACCENT}
              />
              <Input
                type="number"
                value={form.endPosition}
                onChange={(event) => setForm((prev) => ({ ...prev, endPosition: event.target.value }))}
                placeholder="Конец диапазона"
                accentColor={SECTION_ACCENT}
              />
              <Input
                value={form.startLabel}
                onChange={(event) => setForm((prev) => ({ ...prev, startLabel: event.target.value }))}
                placeholder="Метка события"
                accentColor={SECTION_ACCENT}
              />
              <Input
                value={form.endLabel}
                onChange={(event) => setForm((prev) => ({ ...prev, endLabel: event.target.value }))}
                placeholder="Метка конца события"
                accentColor={SECTION_ACCENT}
              />
            </div>
          )}

          {form.id && isAtlasEntityKind(form.kind) && editingSourceType && (
            <TagPicker
              allTags={tags}
              selectedTags={tagAssignments[tagAssignmentKey(editingSourceType, form.id)] ?? []}
              accentColor={SECTION_ACCENT}
              onReplaceTags={(tagIds, newTags) => onReplaceTargetTags(editingSourceType, form.id, tagIds, newTags)}
              onUpdateTag={onUpdateTag}
              onDeleteTag={onDeleteTag}
            />
          )}

          {form.id && isAtlasEntityKind(form.kind) && editingSourceType && (
            <AtlasTypedLinksPanel
              sourceType={editingSourceType}
              sourceId={form.id}
              fields={atlasTypedLinkFields}
              links={editingLinks}
              busy={isSubmitting}
              onAddLink={handleAddAtlasLink}
              onRemoveLink={handleRemoveAtlasLink}
            />
          )}

          {form.id && isAtlasEntityKind(form.kind) && editingSourceType && (
            <PublicationPanel
              targetType={editingSourceType}
              targetId={form.id}
              publication={publicationAssignments[publicationAssignmentKey(editingSourceType, form.id)]}
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

const AtlasDashboard: React.FC<{
  chronicles: Chronicle[];
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
  campaigns: Campaign[];
  unassignedEvents: WorldEvent[];
  onOpenChronicle: (chronicle: Chronicle) => void;
  onEditChronicle: (chronicle: Chronicle) => void;
  onDeleteChronicle: (chronicle: Chronicle) => void;
  onEditUnassignedEvent: (event: WorldEvent) => void;
  onDeleteUnassignedEvent: (event: WorldEvent) => void;
  onCreateChronicle: () => void;
  onCreateLocation: () => void;
  onEditLocation: (location: WorldLocation) => void;
  onDeleteLocation: (location: WorldLocation) => void;
  onCreateFaction: () => void;
  onEditFaction: (faction: Faction) => void;
  onDeleteFaction: (faction: Faction) => void;
}> = ({
  chronicles,
  locations,
  factions,
  events,
  campaigns,
  unassignedEvents,
  onOpenChronicle,
  onEditChronicle,
  onDeleteChronicle,
  onEditUnassignedEvent,
  onDeleteUnassignedEvent,
  onCreateChronicle,
  onCreateLocation,
  onEditLocation,
  onDeleteLocation,
  onCreateFaction,
  onEditFaction,
  onDeleteFaction
}) => (
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
    <AtlasSection title="Хроники" icon={<CalendarDays size={18} />} onCreate={onCreateChronicle} createLabel="Хроника">
      {chronicles.length === 0 ? (
        <MiniEmptyState label="Хроники еще не созданы" actionLabel="Создать хронику" onAction={onCreateChronicle} />
      ) : (
        <div className="space-y-4">
          {chronicles.map((chronicle) => (
            <ChronicleCard
              key={chronicle.id}
              chronicle={chronicle}
              eventsCount={events.filter((event) => event.chronicleId === chronicle.id).length}
              campaignName={getCampaignName(campaigns, chronicle.campaignId)}
              onOpen={() => onOpenChronicle(chronicle)}
              onEdit={() => onEditChronicle(chronicle)}
              onDelete={() => onDeleteChronicle(chronicle)}
            />
          ))}
        </div>
      )}
      {unassignedEvents.length > 0 && (
        <button
          type="button"
          onClick={() => onEditUnassignedEvent(unassignedEvents[0])}
          className="mt-4 w-full border border-dashed border-[var(--border-color)] bg-[var(--bg-main)] p-4 text-left hover:border-[var(--col-purple)] transition-colors"
        >
          <div className="mono text-[10px] uppercase font-black text-[var(--text-main)]">События без хроники</div>
          <div className="mono text-[9px] uppercase text-[var(--text-muted)]">{unassignedEvents.length} событий</div>
        </button>
      )}
      {unassignedEvents.length > 0 && (
        <div className="space-y-2">
          {unassignedEvents.slice(0, 5).map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-3 border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2">
              <button
                type="button"
                onClick={() => onEditUnassignedEvent(event)}
                className="min-w-0 text-left mono text-[9px] uppercase font-black text-[var(--text-muted)] hover:text-[var(--col-purple)]"
              >
                <span className="block truncate">{event.title}</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteUnassignedEvent(event)}
                className="text-[var(--text-muted)] hover:text-[var(--col-red)]"
                title="Удалить событие"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </AtlasSection>

    <AtlasSection title="Места" icon={<MapPin size={18} />} onCreate={onCreateLocation} createLabel="Место">
      {locations.length === 0 ? (
        <MiniEmptyState label="Места еще не созданы" actionLabel="Создать место" onAction={onCreateLocation} />
      ) : (
        <div className="space-y-4">
          {locations.map((location) => (
            <NamedAtlasCard
              key={location.id}
              title={location.name}
              description={location.description}
              campaignName={getCampaignName(campaigns, location.campaignId)}
              onEdit={() => onEditLocation(location)}
              onDelete={() => onDeleteLocation(location)}
            />
          ))}
        </div>
      )}
    </AtlasSection>

    <AtlasSection title="Организации" icon={<Flag size={18} />} onCreate={onCreateFaction} createLabel="Организация">
      {factions.length === 0 ? (
        <MiniEmptyState label="Организации еще не созданы" actionLabel="Создать организацию" onAction={onCreateFaction} />
      ) : (
        <div className="space-y-4">
          {factions.map((faction) => (
            <NamedAtlasCard
              key={faction.id}
              title={faction.name}
              description={faction.description}
              campaignName={getCampaignName(campaigns, faction.campaignId)}
              onEdit={() => onEditFaction(faction)}
              onDelete={() => onDeleteFaction(faction)}
            />
          ))}
        </div>
      )}
    </AtlasSection>
  </div>
);

const AtlasSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  createLabel: string;
  onCreate: () => void;
  children: React.ReactNode;
}> = ({ title, icon, createLabel, onCreate, children }) => (
  <section className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-5">
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
      <div className="flex items-center gap-2 text-[var(--col-purple)]">
        {icon}
        <h2 className="mono text-[11px] uppercase font-black text-[var(--text-main)]">{title}</h2>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="h-9 px-3 border border-[var(--border-color)] mono text-[9px] uppercase font-black text-[var(--text-muted)] hover:border-[var(--col-purple)] hover:text-[var(--col-purple)] transition-colors"
      >
        + {createLabel}
      </button>
    </div>
    {children}
  </section>
);

const ChronicleCard: React.FC<{
  chronicle: Chronicle;
  eventsCount: number;
  campaignName: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ chronicle, eventsCount, campaignName, onOpen, onEdit, onDelete }) => (
  <BaseCard accentColor={SECTION_ACCENT} className="min-h-[210px]">
    <div className="flex h-full flex-col gap-4">
      <div className="flex justify-between gap-3">
        <button type="button" onClick={onOpen} className="text-left space-y-2 flex-1">
          <div className="mono text-[9px] uppercase font-black text-[var(--col-purple)]">{campaignName}</div>
          <h3 className="text-lg font-black uppercase leading-tight text-[var(--text-main)]">{chronicle.title}</h3>
        </button>
        <CardActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <p className="mono text-[10px] leading-relaxed text-[var(--text-muted)] whitespace-pre-wrap flex-1">
        {chronicle.description || 'Описание пока не добавлено.'}
      </p>
      <div className="grid grid-cols-3 gap-2 mono text-[9px] uppercase text-[var(--text-muted)]">
        <span>{chronicle.startLabel || 'Начало не задано'}</span>
        <span className="text-center">{eventsCount} событий</span>
        <span className="text-right">{chronicle.endLabel || 'Конец не задан'}</span>
      </div>
    </div>
  </BaseCard>
);

const NamedAtlasCard: React.FC<{
  title: string;
  description?: string | null;
  campaignName: string;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ title, description, campaignName, onEdit, onDelete }) => (
  <BaseCard accentColor={SECTION_ACCENT} className="min-h-[180px]">
    <div className="flex h-full flex-col gap-4">
      <div className="flex justify-between gap-3">
        <div className="space-y-2">
          <div className="mono text-[9px] uppercase font-black text-[var(--col-purple)]">{campaignName}</div>
          <h3 className="text-base font-black uppercase leading-tight text-[var(--text-main)]">{title}</h3>
        </div>
        <CardActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <p className="mono text-[10px] leading-relaxed text-[var(--text-muted)] whitespace-pre-wrap flex-1">
        {description || 'Описание пока не добавлено.'}
      </p>
    </div>
  </BaseCard>
);

const AtlasTypedLinksPanel: React.FC<{
  sourceType: EntityLinkTargetType;
  sourceId: string;
  fields: AtlasTypedLinkField[];
  links: EntityLink[];
  busy: boolean;
  onAddLink: (targetType: EntityLinkTargetType, targetId: string) => Promise<void>;
  onRemoveLink: (linkId: string) => Promise<void>;
}> = ({ sourceType, sourceId, fields, links, busy, onAddLink, onRemoveLink }) => (
  <div className="space-y-5 border-t border-[var(--border-color)] pt-5">
    <div className="flex items-center gap-2">
      <MapPin size={14} style={{ color: SECTION_ACCENT }} />
      <span className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">Материалы Атласа</span>
    </div>
    <div className="space-y-4">
      {fields.map((field) => {
        const fieldLinks = links.filter((link) => link.targetType === field.targetType);
        const selectedIds = new Set(fieldLinks.map((link) => link.targetId));
        const availableOptions = field.options.filter(
          (option) => !selectedIds.has(option.id) && !(field.targetType === sourceType && option.id === sourceId)
        );

        return (
          <div key={field.targetType} className="space-y-2">
            <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black">{field.label}</label>
            <Select
              value=""
              onChange={(targetId) => void onAddLink(field.targetType, targetId)}
              options={availableOptions.map((option) => ({ value: option.id, label: option.label.toUpperCase() }))}
              placeholder="Добавить..."
              accentColor={field.accentColor}
              disabled={busy || availableOptions.length === 0}
            />
            {fieldLinks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {fieldLinks.map((link) => {
                  const title = field.options.find((option) => option.id === link.targetId)?.label ?? `#${link.targetId}`;

                  return (
                    <div
                      key={link.id}
                      className="flex items-center gap-2 px-2 py-1 border bg-[var(--bg-main)] animate-appear"
                      style={{ borderColor: field.accentColor }}
                    >
                      <span className="mono text-[8px] font-black uppercase" style={{ color: field.accentColor }}>
                        {title}
                      </span>
                      <button
                        type="button"
                        onClick={() => void onRemoveLink(link.id)}
                        className="hover:text-[var(--text-main)] disabled:opacity-40"
                        style={{ color: field.accentColor }}
                        disabled={busy}
                        title={field.removeTitle}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

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

const MiniEmptyState: React.FC<{ label: string; actionLabel?: string; onAction?: () => void }> = ({ label, actionLabel, onAction }) => (
  <div className="min-h-[220px] border-2 border-dashed border-[var(--border-color)] flex flex-col items-center justify-center gap-4 text-[var(--text-muted)]">
    <Search size={28} />
    <span className="mono text-[10px] uppercase font-black">{label}</span>
    {actionLabel && onAction && (
      <Button color="purple" inverted onClick={onAction}>
        <Plus size={14} /> {actionLabel.toUpperCase()}
      </Button>
    )}
  </div>
);

const getCampaignName = (campaigns: Campaign[], campaignId?: string | null): string => {
  if (!campaignId) return 'Без кампании';
  return campaigns.find((campaign) => campaign.id === campaignId)?.title ?? 'Кампания не найдена';
};

const getModalTitle = (form: AtlasFormState): string => {
  const action = form.id ? 'Редактировать' : 'Создать';
  if (form.kind === 'chronicle') return `${action} хронику`;
  if (form.kind === 'location') return `${action} место`;
  if (form.kind === 'faction') return `${action} организацию`;
  if (form.kind === 'event') return `${action} событие хроники`;
  return action;
};

const getTitlePlaceholder = (kind: EditableKind | null): string => {
  if (kind === 'chronicle') return 'Название хроники';
  if (kind === 'location') return 'Название места';
  if (kind === 'faction') return 'Название организации';
  if (kind === 'event') return 'Название события';
  return 'Название';
};

const editableKindToTargetType = (kind: Exclude<EditableKind, 'chronicle'>): TaggableTargetType => {
  if (kind === 'location') return 'location';
  if (kind === 'faction') return 'faction';
  return 'event';
};

const isAtlasEntityKind = (kind: EditableKind | null): kind is Exclude<EditableKind, 'chronicle'> => (
  kind === 'location' || kind === 'faction' || kind === 'event'
);

const matchesTag = (
  id: string,
  type: TaggableTargetType,
  selectedTagId: string,
  assignments: TagAssignmentMap
): boolean => {
  if (!selectedTagId) return true;
  return (assignments[tagAssignmentKey(type, id)] ?? []).some((tag) => tag.id === selectedTagId);
};

const filterChronicles = (records: Chronicle[], query: string, campaignId: string): Chronicle[] => {
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

export default WorldEditor;
