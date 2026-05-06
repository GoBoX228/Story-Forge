import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Edit3, ExternalLink, FileText, ImageIcon, Package, Trash2, UploadCloud } from 'lucide-react';
import {
  Asset,
  AssetType,
  AssetUpdatePayload,
  AssetUploadPayload,
  Campaign,
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
  Tag,
  TagAssignmentMap,
  TaggableTargetType,
  WorldEvent,
  WorldLocation
} from '../types';
import { BaseCard } from './BaseCard';
import { Button, Input, SearchInput, SectionHeader, Select } from './UI';
import { Modal } from './Modal';
import { entityLinkAssignmentKey, publicationAssignmentKey, tagAssignmentKey } from '../lib/mappers';
import { TagFilter, TagPicker } from './TagPicker';
import { EntityLinksPanel } from './EntityLinksPanel';
import { PublicationPanel } from './PublicationPanel';

interface AssetsEditorProps {
  data: Asset[];
  campaigns: Campaign[];
  scenarios: Scenario[];
  maps: MapData[];
  characters: Character[];
  items: Item[];
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
  onUploadAsset: (payload: AssetUploadPayload) => Promise<Asset>;
  onUpdateAsset: (id: string, payload: AssetUpdatePayload) => Promise<Asset>;
  onDeleteAsset: (id: string) => Promise<void>;
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
  initialAssetId?: string | null;
}

const SECTION_ACCENT = 'var(--col-teal)';
const ASSET_TYPE_OPTIONS: { value: AssetType | 'all'; label: string }[] = [
  { value: 'all', label: 'ВСЕ' },
  { value: 'image', label: 'ИЗОБРАЖЕНИЯ' },
  { value: 'token', label: 'ТОКЕНЫ' },
  { value: 'document', label: 'ДОКУМЕНТЫ' },
  { value: 'other', label: 'ПРОЧЕЕ' }
];

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  image: 'Изображение',
  token: 'Токен',
  document: 'Документ',
  other: 'Прочее'
};

const formatSize = (size?: number | null): string => {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getAssetIcon = (type: AssetType) => {
  if (type === 'image') return <ImageIcon size={18} />;
  if (type === 'token') return <Package size={18} />;
  return <FileText size={18} />;
};

const AssetsEditor: React.FC<AssetsEditorProps> = ({
  data,
  campaigns,
  scenarios,
  maps,
  characters,
  items,
  locations,
  factions,
  events,
  onUploadAsset,
  onUpdateAsset,
  onDeleteAsset,
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
  initialAssetId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeType, setActiveType] = useState<AssetType | 'all'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<AssetType | ''>('');
  const [uploadCampaignId, setUploadCampaignId] = useState<string>('');
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<AssetType>('other');
  const [editCampaignId, setEditCampaignId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialAssetId) return;
    const target = data.find((asset) => asset.id === initialAssetId);
    if (!target) return;
    setEditingAsset(target);
    setEditName(target.name);
    setEditType(target.type);
    setEditCampaignId(target.campaignId ?? '');
  }, [data, initialAssetId]);

  const campaignOptions = useMemo(
    () => [
      { value: '', label: 'БЕЗ КАМПАНИИ' },
      ...campaigns.map((campaign) => ({ value: campaign.id, label: campaign.title.toUpperCase() }))
    ],
    [campaigns]
  );

  const filteredAssets = data.filter((asset) => {
    const matchesType = activeType === 'all' || asset.type === activeType;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || asset.name.toLowerCase().includes(query) || asset.mimeType?.toLowerCase().includes(query);
    const assignedTags = tagAssignments[tagAssignmentKey('asset', asset.id)] ?? [];
    const matchesTag = !selectedTagFilter || assignedTags.some((tag) => tag.id === selectedTagFilter);
    return matchesType && matchesSearch && matchesTag;
  });

  const resetUpload = () => {
    setUploadFile(null);
    setUploadName('');
    setUploadType('');
    setUploadCampaignId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!uploadFile || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onUploadAsset({
        file: uploadFile,
        name: uploadName.trim() || undefined,
        type: uploadType || undefined,
        campaignId: uploadCampaignId || null
      });
      resetUpload();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Не удалось загрузить ассет');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setEditName(asset.name);
    setEditType(asset.type);
    setEditCampaignId(asset.campaignId ?? '');
  };

  const handleUpdate = async () => {
    if (!editingAsset || !editName.trim() || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onUpdateAsset(editingAsset.id, {
        name: editName.trim(),
        type: editType,
        campaignId: editCampaignId || null
      });
      setEditingAsset(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Не удалось обновить ассет');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Удалить ассет "${asset.name}"?`)) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onDeleteAsset(asset.id);
      if (editingAsset?.id === asset.id) setEditingAsset(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить ассет');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 bg-[var(--bg-main)] overflow-auto p-12 bauhaus-bg relative">
        <div className="max-w-7xl mx-auto space-y-10">
          <SectionHeader
            title="БИБЛИОТЕКА АССЕТОВ"
            subtitle="ФАЙЛЫ / ИЗОБРАЖЕНИЯ / ТОКЕНЫ"
            accentColor={SECTION_ACCENT}
            actions={
              <Button color="teal" size="lg" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud size={18} /> ВЫБРАТЬ ФАЙЛ
              </Button>
            }
          />

          {error && (
            <div className="border border-[var(--col-red)] bg-[var(--col-red)]/10 p-4 mono text-[10px] uppercase font-black text-[var(--col-red)]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8">
            <div className="border-2 border-dashed border-[var(--col-teal)] bg-[var(--col-teal)]/5 p-6 space-y-5">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setUploadFile(file);
                  if (file && !uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ''));
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-40 border border-[var(--border-color)] bg-[var(--bg-main)] flex flex-col items-center justify-center gap-3 text-[var(--col-teal)] hover:border-[var(--col-teal)] transition-colors"
              >
                <UploadCloud size={36} />
                <span className="mono text-[10px] uppercase font-black">
                  {uploadFile ? uploadFile.name : 'Выберите файл до 10 MB'}
                </span>
                {uploadFile && (
                  <span className="mono text-[9px] uppercase text-[var(--text-muted)]">
                    {formatSize(uploadFile.size)} · {uploadFile.type || 'unknown'}
                  </span>
                )}
              </button>
              <Input
                value={uploadName}
                onChange={(event) => setUploadName(event.target.value)}
                placeholder="Название ассета"
                accentColor={SECTION_ACCENT}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  value={uploadType}
                  onChange={(value) => setUploadType(value as AssetType | '')}
                  options={[{ value: '', label: 'АВТО ТИП' }, ...ASSET_TYPE_OPTIONS.filter((option) => option.value !== 'all')]}
                  accentColor={SECTION_ACCENT}
                />
                <Select
                  value={uploadCampaignId}
                  onChange={setUploadCampaignId}
                  options={campaignOptions}
                  accentColor={SECTION_ACCENT}
                />
              </div>
              <Button
                color="teal"
                className="w-full h-12"
                disabled={!uploadFile || isSubmitting}
                onClick={() => void handleUpload()}
              >
                <UploadCloud size={16} /> ЗАГРУЗИТЬ В БИБЛИОТЕКУ
              </Button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <SearchInput
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="ПОИСК ПО НАЗВАНИЮ И MIME..."
                  accentColor={SECTION_ACCENT}
                />
                <Select
                  value={activeType}
                  onChange={(value) => setActiveType(value as AssetType | 'all')}
                  options={ASSET_TYPE_OPTIONS}
                  accentColor={SECTION_ACCENT}
                />
                <TagFilter tags={tags} value={selectedTagFilter} onChange={setSelectedTagFilter} accentColor={SECTION_ACCENT} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {filteredAssets.map((asset) => (
                  <BaseCard key={asset.id} title={asset.name} accentColor={SECTION_ACCENT}>
                    <div className="h-full flex flex-col gap-4">
                      <div className="h-44 border border-[var(--border-color)] bg-[var(--bg-main)] overflow-hidden flex items-center justify-center">
                        {(asset.type === 'image' || asset.type === 'token') && asset.url ? (
                          <div
                            className="h-full w-full bg-center bg-cover"
                            style={{ backgroundImage: `url(${asset.url})` }}
                            title={asset.name}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
                            {getAssetIcon(asset.type)}
                            <span className="mono text-[9px] uppercase font-black">{asset.mimeType ?? 'FILE'}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="mono text-[10px] uppercase font-black text-[var(--col-teal)]">
                          {ASSET_TYPE_LABELS[asset.type]}
                        </span>
                        <span className="mono text-[9px] uppercase text-[var(--text-muted)]">{formatSize(asset.size)}</span>
                      </div>
                      <div className="mono text-[9px] uppercase text-[var(--text-muted)] truncate">
                        {asset.mimeType ?? 'MIME НЕ УКАЗАН'}
                      </div>
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <Button inverted color="teal" size="sm" onClick={() => openEditModal(asset)}>
                          <Edit3 size={13} /> ПРАВКА
                        </Button>
                        <Button
                          inverted
                          color="white"
                          size="sm"
                          disabled={!asset.url}
                          onClick={() => asset.url && window.open(asset.url, '_blank', 'noopener,noreferrer')}
                        >
                          <ExternalLink size={13} /> ОТКРЫТЬ
                        </Button>
                        <a
                          href={asset.url ?? '#'}
                          download={asset.name}
                          className={`h-8 col-span-1 inline-flex items-center justify-center gap-2 border-2 mono text-[10px] uppercase font-black transition-colors ${
                            asset.url
                              ? 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--col-teal)] hover:text-[var(--col-teal)]'
                              : 'pointer-events-none opacity-40 border-[var(--border-color)] text-[var(--text-muted)]'
                          }`}
                        >
                          <Download size={13} /> Скачать
                        </a>
                        <button
                          type="button"
                          onClick={() => void handleDelete(asset)}
                          className="h-8 inline-flex items-center justify-center gap-2 border-2 border-[var(--border-color)] mono text-[10px] uppercase font-black text-[var(--text-muted)] hover:border-[var(--col-red)] hover:text-[var(--col-red)] transition-colors"
                        >
                          <Trash2 size={13} /> Удалить
                        </button>
                      </div>
                    </div>
                  </BaseCard>
                ))}
              </div>
              {filteredAssets.length === 0 && (
                <div className="border border-dashed border-[var(--border-color)] p-10 text-center mono text-[10px] uppercase text-[var(--text-muted)]">
                  Ассеты не найдены
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(editingAsset)}
        onClose={() => setEditingAsset(null)}
        title="РЕДАКТИРОВАТЬ АССЕТ"
        accentColor={SECTION_ACCENT}
        maxWidth="max-w-xl"
      >
        <div className="space-y-5">
          <Input
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            placeholder="Название"
            accentColor={SECTION_ACCENT}
          />
          <Select
            value={editType}
            onChange={(value) => setEditType(value as AssetType)}
            options={ASSET_TYPE_OPTIONS.filter((option) => option.value !== 'all') as { value: AssetType; label: string }[]}
            accentColor={SECTION_ACCENT}
          />
          <Select
            value={editCampaignId}
            onChange={setEditCampaignId}
            options={campaignOptions}
            accentColor={SECTION_ACCENT}
          />
          {editingAsset && (
            <TagPicker
              allTags={tags}
              selectedTags={tagAssignments[tagAssignmentKey('asset', editingAsset.id)] ?? []}
              accentColor={SECTION_ACCENT}
              onReplaceTags={(tagIds, newTags) => onReplaceTargetTags('asset', editingAsset.id, tagIds, newTags)}
              onUpdateTag={onUpdateTag}
              onDeleteTag={onDeleteTag}
            />
          )}
          {editingAsset && (
            <EntityLinksPanel
              sourceType="asset"
              sourceId={editingAsset.id}
              links={entityLinks[entityLinkAssignmentKey('asset', editingAsset.id)] ?? []}
              scenarios={scenarios}
              maps={maps}
              characters={characters}
              items={items}
              assets={data}
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
          {editingAsset && (
            <PublicationPanel
              targetType="asset"
              targetId={editingAsset.id}
              publication={publicationAssignments[publicationAssignmentKey('asset', editingAsset.id)]}
              accentColor={SECTION_ACCENT}
              onUpsertPublication={onUpsertPublication}
              onUpdatePublication={onUpdatePublication}
              onDeletePublication={onDeletePublication}
            />
          )}
          <Button color="teal" size="lg" className="w-full" disabled={!editName.trim() || isSubmitting} onClick={() => void handleUpdate()}>
            СОХРАНИТЬ АССЕТ
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AssetsEditor;
