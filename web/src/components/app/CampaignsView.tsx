import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileArchive,
  FileText,
  Loader2,
  Map as MapIcon,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
  Users
} from 'lucide-react';
import {
  Campaign,
  CampaignExportJob,
  CampaignExportOptions,
  CampaignPayload,
  Character,
  EntityLink,
  EntityLinkAssignmentMap,
  EntityLinkCreatePayload,
  EntityLinkTargetType,
  Item,
  MapData,
  Scenario,
  Tag,
  TagAssignmentMap
} from '../../types';
import { COLORS } from '../../constants';
import {
  downloadCampaignExport,
  getCampaignExportJob,
  queueCampaignExport
} from '../../lib/campaignApi';
import { entityLinkAssignmentKey, tagAssignmentKey } from '../../lib/mappers';
import { EntityLibraryCard, EntityLibraryWorkspace } from '../entityLibrary';
import { TagPicker, TagFilter } from '../TagPicker';
import { Button, Input, Select, TextArea } from '../UI';

type CampaignTab = 'overview' | 'scenarios' | 'maps' | 'characters' | 'items' | 'export';
type Material = Scenario | MapData | Character | Item;

interface CampaignsViewProps {
  campaigns: Campaign[];
  scenarios: Scenario[];
  maps: MapData[];
  characters: Character[];
  items: Item[];
  tags: Tag[];
  tagAssignments: TagAssignmentMap;
  entityLinks: EntityLinkAssignmentMap;
  initialCampaignId?: string | null;
  onCreateCampaign: (payload: CampaignPayload) => Promise<Campaign>;
  onUpdateCampaign: (id: string, payload: CampaignPayload) => Promise<Campaign>;
  onDeleteCampaign: (id: string) => Promise<void>;
  onUpdateScenarioCampaign: (scenarioId: string, campaignId: string | null) => Promise<Scenario>;
  onReplaceTargetTags: (type: 'campaign', id: string, tagIds: string[], newTags?: string[]) => Promise<Tag[]>;
  onUpdateTag: (id: string, name: string) => Promise<Tag>;
  onDeleteTag: (id: string) => Promise<void>;
  onCreateMaterialLink: (
    sourceType: EntityLinkTargetType,
    sourceId: string,
    payload: EntityLinkCreatePayload
  ) => Promise<EntityLink>;
  onDeleteMaterialLink: (id: string) => Promise<void>;
  onOpenScenario: (id: string) => void;
  onOpenMap: (id: string) => void;
  onOpenCharacter: (id: string) => void;
  onOpenItem: (id: string) => void;
}

const ACCENT = COLORS.accentPurple;

const MATERIAL_CONFIG = {
  maps: { type: 'map' as const, label: 'Карты', icon: MapIcon, color: 'var(--col-blue)' },
  characters: { type: 'character' as const, label: 'Персонажи', icon: Users, color: 'var(--col-yellow)' },
  items: { type: 'item' as const, label: 'Предметы', icon: Package, color: 'var(--col-teal)' }
};

const campaignLinks = (assignments: EntityLinkAssignmentMap, campaignId: string): EntityLink[] =>
  assignments[entityLinkAssignmentKey('campaign', campaignId)] ?? [];

const scenarioLinks = (assignments: EntityLinkAssignmentMap, scenarioId: string): EntityLink[] =>
  assignments[entityLinkAssignmentKey('scenario', scenarioId)] ?? [];

const materialTitle = (material: Material): string =>
  'title' in material ? material.title : material.name;

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  campaigns,
  scenarios,
  maps,
  characters,
  items,
  tags,
  tagAssignments,
  entityLinks,
  initialCampaignId,
  onCreateCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
  onUpdateScenarioCampaign,
  onReplaceTargetTags,
  onUpdateTag,
  onDeleteTag,
  onCreateMaterialLink,
  onDeleteMaterialLink,
  onOpenScenario,
  onOpenMap,
  onOpenCharacter,
  onOpenItem
}) => {
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(initialCampaignId ?? null);
  const [tab, setTab] = useState<CampaignTab>('overview');
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exportOptions, setExportOptions] = useState<CampaignExportOptions>({
    mapPageSize: 'a4',
    mapOrientation: 'landscape',
    duplexEdge: 'long'
  });
  const [exportJob, setExportJob] = useState<CampaignExportJob | null>(null);

  useEffect(() => {
    if (initialCampaignId) setActiveCampaignId(initialCampaignId);
  }, [initialCampaignId]);

  const activeCampaign = campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null;
  const activeCampaignKey = activeCampaign?.id ?? null;
  const activeCampaignTitle = activeCampaign?.title ?? '';
  const activeCampaignDescription = activeCampaign?.description ?? '';

  useEffect(() => {
    if (!activeCampaignKey) return;
    setTitle(activeCampaignTitle);
    setDescription(activeCampaignDescription);
    setTab('overview');
    setExportJob(null);
    setError('');
  }, [activeCampaignKey, activeCampaignTitle, activeCampaignDescription]);

  useEffect(() => {
    if (!exportJob || !['queued', 'running'].includes(exportJob.status)) return;

    const timer = window.setTimeout(async () => {
      try {
        setExportJob(await getCampaignExportJob(String(exportJob.id)));
      } catch (pollError) {
        setError(pollError instanceof Error ? pollError.message : 'Не удалось проверить экспорт');
      }
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [exportJob]);

  const campaignTagIds = useMemo(
    () => new Set(
      (activeCampaign
        ? tagAssignments[tagAssignmentKey('campaign', activeCampaign.id)] ?? []
        : []
      ).map((tag) => tag.id)
    ),
    [activeCampaign, tagAssignments]
  );

  const filteredCampaigns = useMemo(() => {
    const query = search.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      const matchesSearch = !query
        || campaign.title.toLowerCase().includes(query)
        || campaign.description.toLowerCase().includes(query);
      const matchesTag = !tagFilter
        || (tagAssignments[tagAssignmentKey('campaign', campaign.id)] ?? []).some((tag) => tag.id === tagFilter);
      return matchesSearch && matchesTag;
    });
  }, [campaigns, search, tagAssignments, tagFilter]);

  const assignedScenarios = useMemo(
    () => activeCampaign ? scenarios.filter((scenario) => scenario.campaignId === activeCampaign.id) : [],
    [activeCampaign, scenarios]
  );

  const directLinks = useMemo(
    () => activeCampaign
      ? campaignLinks(entityLinks, activeCampaign.id).filter((link) => link.relationType === 'uses')
      : [],
    [activeCampaign, entityLinks]
  );

  const inheritedLinks = useMemo(
    () => assignedScenarios.flatMap((scenario) =>
      scenarioLinks(entityLinks, scenario.id).filter((link) => link.relationType === 'uses')
    ),
    [assignedScenarios, entityLinks]
  );

  const materialContext = (type: 'map' | 'character' | 'item') => {
    const source = type === 'map' ? maps : type === 'character' ? characters : items;
    const directIds = new Set(directLinks.filter((link) => link.targetType === type).map((link) => link.targetId));
    const inheritedIds = new Set(inheritedLinks.filter((link) => link.targetType === type).map((link) => link.targetId));
    const effectiveIds = new Set([...directIds, ...inheritedIds]);
    return {
      source,
      directIds,
      inheritedIds,
      materials: source.filter((material) => effectiveIds.has(material.id)),
      available: source.filter((material) => !effectiveIds.has(material.id))
    };
  };

  const campaignCounts = (campaign: Campaign) => {
    const campaignScenarioIds = scenarios.filter((scenario) => scenario.campaignId === campaign.id).map((scenario) => scenario.id);
    const links = [
      ...campaignLinks(entityLinks, campaign.id),
      ...campaignScenarioIds.flatMap((id) => scenarioLinks(entityLinks, id))
    ].filter((link) => link.relationType === 'uses');

    return {
      scenarios: campaignScenarioIds.length,
      maps: new Set(links.filter((link) => link.targetType === 'map').map((link) => link.targetId)).size,
      characters: new Set(links.filter((link) => link.targetType === 'character').map((link) => link.targetId)).size,
      items: new Set(links.filter((link) => link.targetType === 'item').map((link) => link.targetId)).size
    };
  };

  const createNewCampaign = async () => {
    setBusy(true);
    setError('');
    try {
      const campaign = await onCreateCampaign({ title: 'НОВАЯ КАМПАНИЯ', description: '' });
      setActiveCampaignId(campaign.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Не удалось создать кампанию');
    } finally {
      setBusy(false);
    }
  };

  const saveCampaign = async () => {
    if (!activeCampaign || !title.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onUpdateCampaign(activeCampaign.id, { title: title.trim(), description: description.trim() });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить кампанию');
    } finally {
      setBusy(false);
    }
  };

  const deleteActiveCampaign = async () => {
    if (!activeCampaign || !confirm(`Удалить кампанию «${activeCampaign.title}»? Материалы останутся в библиотеке.`)) return;
    await onDeleteCampaign(activeCampaign.id);
    setActiveCampaignId(null);
  };

  const addMaterial = async (type: 'map' | 'character' | 'item') => {
    if (!activeCampaign || !selectedMaterialId) return;
    setBusy(true);
    try {
      await onCreateMaterialLink('campaign', activeCampaign.id, {
        targetType: type,
        targetId: selectedMaterialId,
        relationType: 'uses'
      });
      setSelectedMaterialId('');
    } finally {
      setBusy(false);
    }
  };

  const removeDirectMaterial = async (type: 'map' | 'character' | 'item', id: string) => {
    const link = directLinks.find((candidate) => candidate.targetType === type && candidate.targetId === id);
    if (link) await onDeleteMaterialLink(link.id);
  };

  const startExport = async () => {
    if (!activeCampaign) return;
    setBusy(true);
    setError('');
    try {
      setExportJob(await queueCampaignExport(activeCampaign.id, exportOptions));
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Не удалось запустить экспорт');
    } finally {
      setBusy(false);
    }
  };

  const downloadExport = async () => {
    if (!activeCampaign || !exportJob) return;
    const blob = await downloadCampaignExport(exportJob);
    if (blob) saveBlob(blob, `${activeCampaign.title}.zip`);
  };

  const renderMaterialTab = (type: 'map' | 'character' | 'item') => {
    const config = Object.values(MATERIAL_CONFIG).find((entry) => entry.type === type)!;
    const context = materialContext(type);
    const Icon = config.icon;
    const open = type === 'map' ? onOpenMap : type === 'character' ? onOpenCharacter : onOpenItem;

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Select
            value={selectedMaterialId}
            onChange={setSelectedMaterialId}
            options={context.available.map((material) => ({ value: material.id, label: materialTitle(material).toUpperCase() }))}
            placeholder={`ДОБАВИТЬ: ${config.label.toUpperCase()}`}
            accentColor={config.color}
          />
          <Button inverted color="white" disabled={!selectedMaterialId || busy} onClick={() => void addMaterial(type)}>
            <Plus size={14} /> ДОБАВИТЬ
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {context.materials.map((material) => {
            const direct = context.directIds.has(material.id);
            const inherited = context.inheritedIds.has(material.id);
            return (
              <div key={material.id} className="border border-[var(--border-color)] bg-[var(--bg-main)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <button type="button" onClick={() => open(material.id)} className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <Icon size={14} style={{ color: config.color }} />
                      <span className="mono truncate text-[10px] font-black uppercase text-[var(--text-main)]">
                        {materialTitle(material)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {direct && <span className="border px-2 py-1 mono text-[8px] uppercase" style={{ borderColor: config.color, color: config.color }}>Прямой материал</span>}
                      {inherited && <span className="border border-[var(--border-color)] px-2 py-1 mono text-[8px] uppercase text-[var(--text-muted)]">Из сценария</span>}
                    </div>
                  </button>
                  {direct && (
                    <button type="button" onClick={() => void removeDirectMaterial(type, material.id)} className="text-[var(--text-muted)] hover:text-[var(--col-red)]">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {context.materials.length === 0 && (
          <div className="border border-dashed border-[var(--border-color)] p-8 text-center mono text-[10px] uppercase text-[var(--text-muted)]">
            Материалов этого типа пока нет
          </div>
        )}
      </div>
    );
  };

  if (!activeCampaign) {
    return (
      <div className="flex h-full flex-col bg-[var(--bg-main)]">
        <div className="shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-8 py-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4">
            <div>
              <h1 className="text-3xl font-black uppercase text-[var(--text-main)]">Кампании</h1>
              <p className="mono text-[9px] uppercase text-[var(--text-muted)]">Сценарии и общие материалы мира</p>
            </div>
            <div className="flex-1" />
            <div className="min-w-[220px]">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск..." accentColor={ACCENT} />
            </div>
            <div className="min-w-[190px]">
              <TagFilter tags={tags} value={tagFilter} onChange={setTagFilter} accentColor={ACCENT} />
            </div>
            <Button color="purple" onClick={() => void createNewCampaign()} disabled={busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Новая кампания
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 px-8 pb-8 pt-5">
          <div className="mx-auto h-full max-w-7xl">
            <EntityLibraryWorkspace<Campaign>
              items={filteredCampaigns}
              getItemId={(campaign) => campaign.id}
              surface="transparent"
              framed
              onOpenItem={(id) => setActiveCampaignId(id)}
              renderItem={(campaign) => {
                const counts = campaignCounts(campaign);
                return (
                  <EntityLibraryCard title={campaign.title} accentColor={ACCENT}>
                    <div className="flex h-full flex-col gap-5">
                      <p className="mono line-clamp-5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                        {campaign.description || 'Описание кампании пока не добавлено.'}
                      </p>
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        {[
                          ['Сценарии', counts.scenarios],
                          ['Карты', counts.maps],
                          ['Персонажи', counts.characters],
                          ['Предметы', counts.items]
                        ].map(([label, count]) => (
                          <div key={String(label)} className="border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-3">
                            <div className="mono text-lg font-black text-[var(--text-main)]">{count}</div>
                            <div className="mono text-[8px] uppercase text-[var(--text-muted)]">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </EntityLibraryCard>
                );
              }}
              emptyTitle="Кампаний пока нет"
              emptyDescription="Создайте кампанию, чтобы объединить сценарии и переиспользуемые материалы."
              emptyAction={<Button color="purple" onClick={() => void createNewCampaign()}><Plus size={14} /> Создать кампанию</Button>}
            />
          </div>
        </div>
        {error && <div className="fixed bottom-6 right-6 border border-[var(--col-red)] bg-[var(--bg-surface)] p-4 mono text-[9px] uppercase text-[var(--col-red)]">{error}</div>}
      </div>
    );
  }

  const selectedTags = tagAssignments[tagAssignmentKey('campaign', activeCampaign.id)] ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-main)]">
      <div className="shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-8 py-5">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <Button inverted color="white" onClick={() => setActiveCampaignId(null)}><ArrowLeft size={14} /> Библиотека</Button>
          <div className="min-w-0">
            <div className="mono text-[8px] uppercase tracking-widest text-[var(--text-muted)]">Рабочая область кампании</div>
            <h1 className="truncate text-2xl font-black uppercase text-[var(--text-main)]">{activeCampaign.title}</h1>
          </div>
          <div className="flex-1" />
          <Button inverted color="white" onClick={() => void deleteActiveCampaign()}><Trash2 size={14} /> Удалить</Button>
        </div>
      </div>
      <div className="shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-8">
        <div className="mx-auto flex max-w-7xl overflow-x-auto">
          {([
            ['overview', 'Обзор'],
            ['scenarios', `Сценарии · ${assignedScenarios.length}`],
            ['maps', 'Карты'],
            ['characters', 'Персонажи'],
            ['items', 'Предметы'],
            ['export', 'Экспорт ZIP']
          ] as [CampaignTab, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setTab(id); setSelectedMaterialId(''); }}
              className={`border-b-2 px-5 py-4 mono text-[9px] font-black uppercase ${tab === id ? 'border-[var(--col-purple)] text-[var(--col-purple)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl">
          {tab === 'overview' && (
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_.8fr]">
              <div className="space-y-5 border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Название кампании" accentColor={ACCENT} />
                <TextArea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Описание кампании" accentColor={ACCENT} className="min-h-48" />
                <Button color="purple" disabled={!title.trim() || busy} onClick={() => void saveCampaign()}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Сохранить
                </Button>
              </div>
              <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
                <TagPicker
                  allTags={tags}
                  selectedTags={selectedTags}
                  accentColor={ACCENT}
                  onReplaceTags={(tagIds, newTags) => onReplaceTargetTags('campaign', activeCampaign.id, tagIds, newTags)}
                  onUpdateTag={onUpdateTag}
                  onDeleteTag={onDeleteTag}
                />
              </div>
            </div>
          )}

          {tab === 'scenarios' && (
            <div className="space-y-5">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Select
                  value={selectedMaterialId}
                  onChange={setSelectedMaterialId}
                  options={scenarios.filter((scenario) => scenario.campaignId !== activeCampaign.id).map((scenario) => ({ value: scenario.id, label: scenario.title.toUpperCase() }))}
                  placeholder="ДОБАВИТЬ СЦЕНАРИЙ"
                  accentColor="var(--col-red)"
                />
                <Button inverted color="white" disabled={!selectedMaterialId || busy} onClick={() => {
                  void onUpdateScenarioCampaign(selectedMaterialId, activeCampaign.id).then(() => setSelectedMaterialId(''));
                }}>
                  <Plus size={14} /> Добавить
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {assignedScenarios.map((scenario) => (
                  <div key={scenario.id} className="flex items-center justify-between gap-4 border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
                    <button type="button" onClick={() => onOpenScenario(scenario.id)} className="flex min-w-0 items-center gap-3 text-left">
                      <FileText size={15} className="text-[var(--col-red)]" />
                      <span className="mono truncate text-[10px] font-black uppercase text-[var(--text-main)]">{scenario.title}</span>
                    </button>
                    <button type="button" onClick={() => void onUpdateScenarioCampaign(scenario.id, null)} className="text-[var(--text-muted)] hover:text-[var(--col-red)]"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'maps' && renderMaterialTab('map')}
          {tab === 'characters' && renderMaterialTab('character')}
          {tab === 'items' && renderMaterialTab('item')}

          {tab === 'export' && (
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_.8fr]">
              <div className="space-y-5 border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
                <div className="flex items-center gap-3">
                  <FileArchive size={22} className="text-[var(--col-purple)]" />
                  <div>
                    <h2 className="text-xl font-black uppercase text-[var(--text-main)]">Экспорт кампании</h2>
                    <p className="mono text-[9px] uppercase text-[var(--text-muted)]">Отдельные PDF сценариев, карт и карточек внутри ZIP</p>
                  </div>
                </div>
                <Select value={exportOptions.mapPageSize} onChange={(value) => setExportOptions((current) => ({ ...current, mapPageSize: value as CampaignExportOptions['mapPageSize'] }))} options={['a4', 'a3', 'a2', 'a1', 'a0'].map((value) => ({ value, label: `КАРТЫ: ${value.toUpperCase()}` }))} accentColor={ACCENT} />
                <Select value={exportOptions.mapOrientation} onChange={(value) => setExportOptions((current) => ({ ...current, mapOrientation: value as CampaignExportOptions['mapOrientation'] }))} options={[{ value: 'landscape', label: 'КАРТЫ: АЛЬБОМНАЯ' }, { value: 'portrait', label: 'КАРТЫ: КНИЖНАЯ' }]} accentColor={ACCENT} />
                <Select value={exportOptions.duplexEdge} onChange={(value) => setExportOptions((current) => ({ ...current, duplexEdge: value as CampaignExportOptions['duplexEdge'] }))} options={[{ value: 'long', label: 'КАРТОЧКИ: ДЛИННЫЙ КРАЙ' }, { value: 'short', label: 'КАРТОЧКИ: КОРОТКИЙ КРАЙ' }]} accentColor={ACCENT} />
                <Button color="purple" disabled={busy || exportJob?.status === 'queued' || exportJob?.status === 'running'} onClick={() => void startExport()}>
                  <FileArchive size={15} /> Собрать ZIP
                </Button>
              </div>
              <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
                {!exportJob && <div className="mono text-[10px] uppercase text-[var(--text-muted)]">Экспорт ещё не запускался.</div>}
                {exportJob && (
                  <div className="space-y-5">
                    <div className="mono text-[9px] uppercase text-[var(--text-muted)]">Задание #{exportJob.id}</div>
                    <div className="flex items-center gap-3">
                      {['queued', 'running'].includes(exportJob.status) && <Loader2 size={20} className="animate-spin text-[var(--col-purple)]" />}
                      <span className="mono text-sm font-black uppercase text-[var(--text-main)]">
                        {exportJob.status === 'queued' ? 'В очереди' : exportJob.status === 'running' ? 'Собирается' : exportJob.status === 'completed' ? 'Готово' : 'Ошибка'}
                      </span>
                    </div>
                    {exportJob.status === 'completed' && (
                      <Button inverted color="white" onClick={() => void downloadExport()}><Download size={15} /> Скачать ZIP</Button>
                    )}
                    {exportJob.error && <div className="border border-[var(--col-red)] p-3 mono text-[9px] uppercase text-[var(--col-red)]">{exportJob.error}</div>}
                  </div>
                )}
              </div>
            </div>
          )}
          {error && <div className="mt-6 border border-[var(--col-red)] bg-[var(--col-red)]/10 p-4 mono text-[9px] uppercase text-[var(--col-red)]">{error}</div>}
        </div>
      </div>
    </div>
  );
};
