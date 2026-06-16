import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckSquare,
  ClipboardPaste,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Folder,
  FolderOpen,
  ImageIcon,
  Plus,
  Scissors,
  Square,
  Trash2,
  UploadCloud
} from 'lucide-react';
import {
  Asset,
  AssetCollection,
  AssetCollectionCreatePayload,
  AssetCollectionUpdatePayload,
  AssetFolder,
  AssetFolderCreatePayload,
  AssetFolderUpdatePayload,
  AssetKind,
  AssetType,
  AssetUpdatePayload,
  AssetUploadPayload,
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
  folders: AssetFolder[];
  collections: AssetCollection[];
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
  onCreateFolder: (payload: AssetFolderCreatePayload) => Promise<AssetFolder>;
  onUpdateFolder: (id: string, payload: AssetFolderUpdatePayload) => Promise<AssetFolder>;
  onDeleteFolder: (id: string) => Promise<void>;
  onCreateCollection: (payload: AssetCollectionCreatePayload) => Promise<AssetCollection>;
  onUpdateCollection: (id: string, payload: AssetCollectionUpdatePayload) => Promise<AssetCollection>;
  onDeleteCollection: (id: string) => Promise<void>;
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
type AssetFolderId = 'all' | string;
type AssetLibraryMode = 'files' | 'sets';
type AssetClipboard = { assetIds: string[] } | null;
type AssetContextMenu =
  | { x: number; y: number; type: 'workspace' }
  | { x: number; y: number; type: 'asset'; assetId: string }
  | { x: number; y: number; type: 'folder'; folderId: AssetFolderId }
  | { x: number; y: number; type: 'set'; setId: string }
  | { x: number; y: number; type: 'set-asset'; setId: string; assetId: string };

const ASSET_TYPE_OPTIONS: { value: AssetType | 'all'; label: string }[] = [
  { value: 'all', label: 'ВСЕ' },
  { value: 'image', label: 'ИЗОБРАЖЕНИЯ' },
  { value: 'document', label: 'ДОКУМЕНТЫ' },
  { value: 'other', label: 'ПРОЧЕЕ' }
];

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  image: 'Изображение',
  document: 'Документ',
  other: 'Прочее'
};

const ASSET_KIND_OPTIONS: { value: AssetKind | 'all'; label: string }[] = [
  { value: 'all', label: 'ВСЕ НАЗНАЧЕНИЯ' },
  { value: 'tile', label: 'ТАЙЛЫ' },
  { value: 'token', label: 'ТОКЕНЫ' },
  { value: 'portrait', label: 'ПОРТРЕТЫ' },
  { value: 'background', label: 'ФОНЫ КАРТ' },
  { value: 'item_image', label: 'ИЗОБРАЖЕНИЯ ПРЕДМЕТОВ' },
  { value: 'handout', label: 'РАЗДАТКИ' },
  { value: 'document', label: 'ДОКУМЕНТЫ' },
  { value: 'icon', label: 'ИКОНКИ' },
  { value: 'other', label: 'ПРОЧЕЕ' }
];

const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  tile: 'Тайл',
  token: 'Токен',
  portrait: 'Портрет',
  background: 'Фон карты',
  item_image: 'Изображение предмета',
  handout: 'Раздатка',
  document: 'Документ',
  icon: 'Иконка',
  other: 'Прочее'
};

const formatSize = (size?: number | null): string => {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getAssetIcon = (type: AssetType) => {
  if (type === 'image') return <ImageIcon size={18} />;
  return <FileText size={18} />;
};

const AssetsEditor: React.FC<AssetsEditorProps> = ({
  data,
  folders,
  collections,
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
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
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
  const [activeKind, setActiveKind] = useState<AssetKind | 'all'>('all');
  const [activeCollectionId, setActiveCollectionId] = useState<AssetFolderId>('all');
  const [draggedAssetId, setDraggedAssetId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<AssetFolderId | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<AssetType | ''>('');
  const [uploadKind, setUploadKind] = useState<AssetKind>('other');
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<AssetType>('other');
  const [editKind, setEditKind] = useState<AssetKind>('other');
  const [editFolderId, setEditFolderId] = useState<AssetFolderId>('all');
  const [editCollectionIds, setEditCollectionIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assetClipboard, setAssetClipboard] = useState<AssetClipboard>(null);
  const [contextMenu, setContextMenu] = useState<AssetContextMenu | null>(null);
  const [libraryMode, setLibraryMode] = useState<AssetLibraryMode>('files');
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [dragOverSetId, setDragOverSetId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingFolderName, setRenamingFolderName] = useState('');
  const [renamingAssetId, setRenamingAssetId] = useState<string | null>(null);
  const [renamingAssetName, setRenamingAssetName] = useState('');
  const [renamingSetId, setRenamingSetId] = useState<string | null>(null);
  const [renamingSetName, setRenamingSetName] = useState('');
  const [setDescriptionDraft, setSetDescriptionDraft] = useState('');

  useEffect(() => {
    if (!initialAssetId) return;
    const target = data.find((asset) => asset.id === initialAssetId);
    if (!target) return;
    setEditingAsset(target);
    setEditName(target.name);
    setEditType(target.type);
    setEditKind(target.kind);
    setEditFolderId(target.folderId ?? 'all');
    setEditCollectionIds(target.collectionIds);
  }, [data, initialAssetId]);

  useEffect(() => {
    setSelectedAssetIds((prev) => prev.filter((assetId) => data.some((asset) => asset.id === assetId)));
  }, [data]);

  useEffect(() => {
    const activeSet = collections.find((collection) => collection.id === activeSetId);
    setSetDescriptionDraft(activeSet?.description ?? '');
    if (activeSetId && !activeSet) {
      setActiveSetId(null);
    }
  }, [activeSetId, collections]);

  const folderOptions = useMemo(
    () => [
      { value: 'all', label: 'Библиотека' },
      ...folders.map((folder) => ({ value: folder.id, label: folder.name.toUpperCase() }))
    ],
    [folders]
  );

  const getPrimaryFolderId = (asset: Asset): string | null =>
    folders.find((folder) => folder.id === asset.folderId)?.id ?? null;

  const getFolderAssetCount = (folderId: AssetFolderId): number => {
    if (folderId === 'all') return data.filter((asset) => !asset.folderId).length;
    return data.filter((asset) => asset.folderId === folderId).length;
  };

  const activeFolderName = activeCollectionId === 'all'
    ? 'Библиотека'
    : folders.find((folder) => folder.id === activeCollectionId)?.name ?? 'Папка';

  const filteredAssets = data.filter((asset) => {
    const matchesType = activeType === 'all' || asset.type === activeType;
    const matchesKind = activeKind === 'all' || asset.kind === activeKind;
    const matchesCollection = activeCollectionId === 'all'
      ? !asset.folderId
      : asset.folderId === activeCollectionId;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || asset.name.toLowerCase().includes(query) || asset.mimeType?.toLowerCase().includes(query);
    const assignedTags = tagAssignments[tagAssignmentKey('asset', asset.id)] ?? [];
    const matchesTag = !selectedTagFilter || assignedTags.some((tag) => tag.id === selectedTagFilter);
    return matchesType && matchesKind && matchesCollection && matchesSearch && matchesTag;
  });

  const visibleFolders = activeCollectionId === 'all'
    ? folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        count: getFolderAssetCount(folder.id)
      }))
    : [];

  const selectedAssets = selectedAssetIds
    .map((assetId) => data.find((asset) => asset.id === assetId))
    .filter((asset): asset is Asset => Boolean(asset));

  const activeSet = collections.find((collection) => collection.id === activeSetId) ?? null;
  const activeSetAssets = activeSet
    ? data.filter((asset) => asset.collectionIds.includes(activeSet.id))
    : [];

  const activeFolderAssetCount = getFolderAssetCount(activeCollectionId);
  const hasActiveFilters = Boolean(searchQuery.trim() || selectedTagFilter || activeType !== 'all' || activeKind !== 'all');

  const resetExplorerFilters = () => {
    setActiveType('all');
    setActiveKind('all');
    setSelectedTagFilter('');
    setSearchQuery('');
  };

  const switchLibraryMode = (mode: AssetLibraryMode) => {
    setLibraryMode(mode);
    setContextMenu(null);
    cancelAssetRename();
    cancelFolderRename();
    if (mode === 'files') {
      setActiveSetId(null);
      setDragOverSetId(null);
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadName('');
    setUploadType('');
    setUploadKind('other');
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
        kind: uploadKind,
        folderId: activeCollectionId !== 'all' ? activeCollectionId : null
      });
      resetExplorerFilters();
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
    setEditKind(asset.kind);
    setEditFolderId(asset.folderId ?? 'all');
    setEditCollectionIds(asset.collectionIds);
  };

  const handleUpdate = async () => {
    if (!editingAsset || !editName.trim() || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onUpdateAsset(editingAsset.id, {
        name: editName.trim(),
        type: editType,
        kind: editKind,
        folderId: editFolderId === 'all' ? null : editFolderId,
        collectionIds: editCollectionIds
      });
      setEditingAsset(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Не удалось обновить ассет');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (asset: Asset) => {
    setContextMenu(null);
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

  const handleDeleteAssets = async (assets: Asset[]) => {
    if (assets.length === 0) return;
    const message = assets.length === 1
      ? `Удалить ассет "${assets[0].name}"?`
      : `Удалить выбранные ассеты (${assets.length})?`;
    setContextMenu(null);
    if (!confirm(message)) return;
    setError('');
    setIsSubmitting(true);
    try {
      await Promise.all(assets.map((asset) => onDeleteAsset(asset.id)));
      setSelectedAssetIds((prev) => prev.filter((assetId) => !assets.some((asset) => asset.id === assetId)));
      if (editingAsset && assets.some((asset) => asset.id === editingAsset.id)) setEditingAsset(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить ассеты');
    } finally {
      setIsSubmitting(false);
      setContextMenu(null);
    }
  };

  const applyFolderToAssets = async (assets: Asset[], folderId: AssetFolderId) => {
    if (isSubmitting || assets.length === 0) return;
    setError('');
    setIsSubmitting(true);
    try {
      const updatedAssets = await Promise.all(assets.map((asset) => {
        return onUpdateAsset(asset.id, { folderId: folderId === 'all' ? null : folderId });
      }));

      const updatedEditingAsset = updatedAssets.find((asset) => asset.id === editingAsset?.id);
      if (updatedEditingAsset) {
        setEditingAsset(updatedEditingAsset);
        setEditFolderId(updatedEditingAsset.folderId ?? 'all');
        setEditCollectionIds(updatedEditingAsset.collectionIds);
      }
      setSelectedAssetIds((prev) => (
        folderId === activeCollectionId ? prev : prev.filter((id) => !assets.some((asset) => asset.id === id))
      ));
      setAssetClipboard(null);
    } catch (collectionError) {
      setError(collectionError instanceof Error ? collectionError.message : 'Не удалось обновить папку ассетов');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDropAssetToFolder = async (folderId: AssetFolderId, assetId?: string) => {
    setDragOverFolderId(null);
    const targetAsset = data.find((asset) => asset.id === (assetId ?? draggedAssetId));
    setDraggedAssetId(null);
    if (!targetAsset) return;
    const draggedSelection = selectedAssetIds.includes(targetAsset.id) ? selectedAssets : [targetAsset];
    await applyFolderToAssets(draggedSelection, folderId);
  };

  const applySetToAssets = async (assets: Asset[], collectionId: string) => {
    if (isSubmitting || assets.length === 0) return;
    setError('');
    setIsSubmitting(true);
    try {
      const updatedAssets = await Promise.all(assets.map((asset) => {
        const collectionIds = asset.collectionIds.includes(collectionId)
          ? asset.collectionIds
          : [...asset.collectionIds, collectionId];
        return onUpdateAsset(asset.id, { collectionIds });
      }));

      const updatedEditingAsset = updatedAssets.find((asset) => asset.id === editingAsset?.id);
      if (updatedEditingAsset) {
        setEditingAsset(updatedEditingAsset);
        setEditCollectionIds(updatedEditingAsset.collectionIds);
      }
    } catch (collectionError) {
      setError(collectionError instanceof Error ? collectionError.message : 'Не удалось добавить ассеты в набор');
    } finally {
      setIsSubmitting(false);
      setContextMenu(null);
      setDragOverSetId(null);
    }
  };

  const removeAssetFromSet = async (asset: Asset, collectionId: string) => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const updatedAsset = await onUpdateAsset(asset.id, {
        collectionIds: asset.collectionIds.filter((id) => id !== collectionId)
      });
      if (editingAsset?.id === updatedAsset.id) {
        setEditingAsset(updatedAsset);
        setEditCollectionIds(updatedAsset.collectionIds);
      }
    } catch (collectionError) {
      setError(collectionError instanceof Error ? collectionError.message : 'Не удалось удалить ассет из набора');
    } finally {
      setIsSubmitting(false);
      setContextMenu(null);
    }
  };

  const handleDropAssetsToSet = async (collectionId: string, assetId?: string) => {
    const targetAsset = data.find((asset) => asset.id === (assetId ?? draggedAssetId));
    const assets = targetAsset
      ? selectedAssetIds.includes(targetAsset.id) ? selectedAssets : [targetAsset]
      : selectedAssets;
    setDraggedAssetId(null);
    await applySetToAssets(assets, collectionId);
  };

  const getCollectionById = (collectionId: string): AssetCollection | undefined => (
    collections.find((collection) => collection.id === collectionId)
  );

  const openFolder = (folderId: AssetFolderId) => {
    setActiveCollectionId(folderId);
    setSelectedAssetIds([]);
    setContextMenu(null);
  };

  const getActionAssets = (assetId?: string): Asset[] => {
    if (assetId && selectedAssetIds.includes(assetId) && selectedAssets.length > 0) return selectedAssets;
    if (selectedAssets.length > 0 && !assetId) return selectedAssets;
    const asset = data.find((item) => item.id === assetId);
    return asset ? [asset] : [];
  };

  const openAsset = (asset?: Asset) => {
    if (!asset?.url) return;
    window.open(asset.url, '_blank', 'noopener,noreferrer');
    setContextMenu(null);
  };

  const downloadAsset = (asset?: Asset) => {
    if (!asset?.url) return;
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = asset.name;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setContextMenu(null);
  };

  const moveAssetsClipboard = (assetId?: string) => {
    const assets = getActionAssets(assetId);
    if (assets.length === 0) return;
    setAssetClipboard({ assetIds: assets.map((asset) => asset.id) });
    setContextMenu(null);
  };

  const pasteAssetsToFolder = async (folderId: AssetFolderId = activeCollectionId) => {
    if (!assetClipboard) return;
    const assets = assetClipboard.assetIds
      .map((assetId) => data.find((asset) => asset.id === assetId))
      .filter((asset): asset is Asset => Boolean(asset));
    await applyFolderToAssets(assets, folderId);
    setContextMenu(null);
  };

  const removeAssetsFromCurrentFolder = async (assetId?: string) => {
    if (activeCollectionId === 'all') return;
    const assets = getActionAssets(assetId).filter((asset) => asset.folderId === activeCollectionId);
    if (assets.length === 0 || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const updatedAssets = await Promise.all(assets.map((asset) => (
        onUpdateAsset(asset.id, { folderId: null })
      )));
      const updatedEditingAsset = updatedAssets.find((asset) => asset.id === editingAsset?.id);
      if (updatedEditingAsset) {
        setEditingAsset(updatedEditingAsset);
        setEditFolderId(updatedEditingAsset.folderId ?? 'all');
        setEditCollectionIds(updatedEditingAsset.collectionIds);
      }
      setSelectedAssetIds((prev) => prev.filter((id) => !assets.some((asset) => asset.id === id)));
    } catch (collectionError) {
      setError(collectionError instanceof Error ? collectionError.message : 'Не удалось убрать ассет из папки');
    } finally {
      setIsSubmitting(false);
      setContextMenu(null);
    }
  };

  const selectAsset = (assetId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      setSelectedAssetIds((prev) => (
        prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
      ));
      return;
    }
    setSelectedAssetIds([assetId]);
  };

  const selectAllVisibleAssets = () => {
    setSelectedAssetIds(filteredAssets.map((asset) => asset.id));
    setContextMenu(null);
  };

  const handleWorkspaceContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'workspace' });
  };

  const handleCreateFolderFromContext = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await onCreateFolder({ name: 'Новая папка' });
    } catch (collectionError) {
      setError(collectionError instanceof Error ? collectionError.message : 'Не удалось создать папку');
    } finally {
      setIsSubmitting(false);
      setContextMenu(null);
    }
  };

  const startRenameFolder = (folder: AssetFolder) => {
    setRenamingFolderId(folder.id);
    setRenamingFolderName(folder.name);
    setContextMenu(null);
  };

  const submitFolderRename = async () => {
    const folder = folders.find((item) => item.id === renamingFolderId);
    const name = renamingFolderName.trim();
    setRenamingFolderId(null);
    setRenamingFolderName('');
    if (!folder || !name || name === folder.name || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onUpdateFolder(folder.id, { name });
    } catch (collectionError) {
      setError(collectionError instanceof Error ? collectionError.message : 'Не удалось переименовать папку');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelFolderRename = () => {
    setRenamingFolderId(null);
    setRenamingFolderName('');
  };

  const handleRenameAsset = async (asset: Asset) => {
    setRenamingAssetId(asset.id);
    setRenamingAssetName(asset.name);
    setContextMenu(null);
  };

  const submitAssetRename = async () => {
    const asset = data.find((item) => item.id === renamingAssetId);
    const name = renamingAssetName.trim();
    setRenamingAssetId(null);
    setRenamingAssetName('');
    if (!asset || !name || name === asset.name || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const updatedAsset = await onUpdateAsset(asset.id, { name });
      if (editingAsset?.id === asset.id) {
        setEditingAsset(updatedAsset);
        setEditName(updatedAsset.name);
      }
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Не удалось переименовать ассет');
    } finally {
      setIsSubmitting(false);
      setContextMenu(null);
    }
  };

  const cancelAssetRename = () => {
    setRenamingAssetId(null);
    setRenamingAssetName('');
  };

  const handleCreateSet = async () => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onCreateCollection({ name: 'Новый набор', description: '' });
      setLibraryMode('sets');
      setActiveSetId(null);
    } catch (collectionError) {
      setError(collectionError instanceof Error ? collectionError.message : 'Не удалось создать набор');
    } finally {
      setIsSubmitting(false);
      setContextMenu(null);
    }
  };

  const startRenameSet = (collection: AssetCollection) => {
    setRenamingSetId(collection.id);
    setRenamingSetName(collection.name);
    setContextMenu(null);
  };

  const submitSetRename = async () => {
    const collection = collections.find((item) => item.id === renamingSetId);
    const name = renamingSetName.trim();
    setRenamingSetId(null);
    setRenamingSetName('');
    if (!collection || !name || name === collection.name || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onUpdateCollection(collection.id, { name });
    } catch (collectionError) {
      setError(collectionError instanceof Error ? collectionError.message : 'Не удалось переименовать набор');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelSetRename = () => {
    setRenamingSetId(null);
    setRenamingSetName('');
  };

  const submitSetDescription = async () => {
    if (!activeSet || isSubmitting) return;
    const description = setDescriptionDraft.trim();
    if ((activeSet.description ?? '') === description) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onUpdateCollection(activeSet.id, { description });
    } catch (collectionError) {
      setError(collectionError instanceof Error ? collectionError.message : 'Не удалось обновить описание набора');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSet = async (collection: AssetCollection) => {
    setContextMenu(null);
    if (!confirm(`Удалить набор "${collection.name}"? Ассеты останутся в библиотеке и папках.`)) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onDeleteCollection(collection.id);
      if (activeSetId === collection.id) setActiveSetId(null);
      setSelectedAssetIds([]);
    } catch (collectionError) {
      setError(collectionError instanceof Error ? collectionError.message : 'Не удалось удалить набор');
    } finally {
      setIsSubmitting(false);
      setContextMenu(null);
    }
  };

  const handleDeleteFolder = async (folder: AssetFolder) => {
    setContextMenu(null);
    if (!confirm(`Удалить папку "${folder.name}"? Ассеты будут перенесены в библиотеку.`)) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onDeleteFolder(folder.id);
      if (activeCollectionId === folder.id) setActiveCollectionId('all');
    } catch (collectionError) {
      setError(collectionError instanceof Error ? collectionError.message : 'Не удалось удалить папку');
    } finally {
      setIsSubmitting(false);
      setContextMenu(null);
    }
  };

  const renderAddToSetActions = (assets: Asset[]) => {
    if (assets.length === 0 || collections.length === 0) return null;

    return (
      <div className="border-t border-[var(--border-color)] py-1">
        <div className="px-3 py-2 mono text-[8px] uppercase font-black text-[var(--text-muted)]">
          Добавить в набор
        </div>
        {collections.map((collection) => (
          <button
            key={collection.id}
            type="button"
            onClick={() => void applySetToAssets(assets, collection.id)}
            className="w-full px-3 py-2 flex items-center justify-between gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)]"
          >
            <span className="truncate">{collection.name}</span>
            <span className="text-[8px] text-[var(--text-muted)]">{collection.assetIds.length}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 bg-[var(--bg-main)] overflow-auto p-12 bauhaus-bg relative">
        <div className="max-w-7xl mx-auto space-y-10">
          <SectionHeader
            title="БИБЛИОТЕКА АССЕТОВ"
            subtitle="ФАЙЛЫ / ИЗОБРАЖЕНИЯ / ТОКЕНЫ"
            accentColor={SECTION_ACCENT}
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
                  value={uploadKind}
                  onChange={(value) => setUploadKind(value as AssetKind)}
                  options={ASSET_KIND_OPTIONS.filter((option) => option.value !== 'all') as { value: AssetKind; label: string }[]}
                  accentColor={SECTION_ACCENT}
                />
              </div>
              <div className="border border-[var(--border-color)] bg-[var(--bg-main)] p-3 mono text-[9px] uppercase text-[var(--text-muted)]">
                Папка загрузки: <span className="text-[var(--col-teal)] font-black">{activeFolderName}</span>
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
              <div className="flex flex-wrap gap-2 border-b border-[var(--border-color)] pb-3">
                <button
                  type="button"
                  onClick={() => switchLibraryMode('files')}
                  className={`border px-4 py-2 mono text-[10px] uppercase font-black transition-colors ${
                    libraryMode === 'files'
                      ? 'border-[var(--col-teal)] bg-[var(--col-teal)] text-black'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--col-teal)] hover:text-[var(--col-teal)]'
                  }`}
                >
                  Файлы
                </button>
                <button
                  type="button"
                  onClick={() => switchLibraryMode('sets')}
                  className={`border px-4 py-2 mono text-[10px] uppercase font-black transition-colors ${
                    libraryMode === 'sets'
                      ? 'border-[var(--col-teal)] bg-[var(--col-teal)] text-black'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--col-teal)] hover:text-[var(--col-teal)]'
                  }`}
                >
                  Наборы
                </button>
              </div>

              {libraryMode === 'files' && (
                <>
              <div className="flex items-end justify-between gap-4 border-b border-[var(--border-color)] pb-4">
                <div>
                  <div className="mono text-[9px] uppercase font-black tracking-[0.25em] text-[var(--text-muted)]">
                    <button type="button" onClick={() => openFolder('all')} className="hover:text-[var(--col-teal)] transition-colors">
                      БИБЛИОТЕКА
                    </button>
                    {activeCollectionId !== 'all' && <span> / {activeFolderName.toUpperCase()}</span>}
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-[var(--text-main)]">
                    {activeFolderName}
                  </h3>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <div className="mono text-[10px] uppercase text-[var(--text-muted)] h-8 flex items-center px-2">
                    {selectedAssetIds.length > 0 ? `${selectedAssetIds.length} выбрано` : `${filteredAssets.length} файлов`}
                  </div>
                </div>
              </div>
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
                <Select
                  value={activeKind}
                  onChange={(value) => setActiveKind(value as AssetKind | 'all')}
                  options={ASSET_KIND_OPTIONS}
                  accentColor={SECTION_ACCENT}
                />
                <TagFilter tags={tags} value={selectedTagFilter} onChange={setSelectedTagFilter} accentColor={SECTION_ACCENT} />
              </div>

              <div
                className="relative min-h-[420px] border border-dashed border-[var(--border-color)] p-4"
                onContextMenu={handleWorkspaceContextMenu}
                onDragOver={(event) => {
                  if (!draggedAssetId) return;
                  event.preventDefault();
                  setDragOverFolderId(activeCollectionId);
                }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={(event) => {
                  if (!draggedAssetId) return;
                  event.preventDefault();
                  void handleDropAssetToFolder(activeCollectionId, event.dataTransfer.getData('text/plain') || undefined);
                }}
                onClick={() => {
                  setContextMenu(null);
                  setSelectedAssetIds([]);
                  cancelAssetRename();
                  cancelFolderRename();
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {visibleFolders.map((folder) => {
                  const activeDrop = dragOverFolderId === folder.id;
                  return (
                    <div
                      key={folder.id}
                      onDoubleClick={() => {
                        if (renamingFolderId === folder.id) return;
                        openFolder(folder.id);
                      }}
                      onClick={(event) => event.stopPropagation()}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setContextMenu({ x: event.clientX, y: event.clientY, type: 'folder', folderId: folder.id });
                      }}
                      onDragOver={(event) => {
                        if (folder.id === 'all') return;
                        event.preventDefault();
                        event.stopPropagation();
                        setDragOverFolderId(folder.id);
                      }}
                      onDragLeave={(event) => {
                        event.stopPropagation();
                        setDragOverFolderId(null);
                      }}
                      onDrop={(event) => {
                        if (folder.id === 'all') return;
                        event.preventDefault();
                        event.stopPropagation();
                        void handleDropAssetToFolder(folder.id, event.dataTransfer.getData('text/plain') || undefined);
                      }}
                      className={`border-2 p-5 min-h-[180px] bg-[var(--bg-card)] flex flex-col justify-between transition-colors cursor-pointer ${
                        activeDrop ? 'border-[var(--col-teal)] bg-[var(--col-teal)]/10' : 'border-[var(--border-color)] hover:border-[var(--col-teal)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <FolderOpen size={36} className="text-[var(--col-teal)]" />
                        <span className="mono text-[9px] uppercase text-[var(--text-muted)]">{folder.count}</span>
                      </div>
                      <div>
                        {renamingFolderId === folder.id ? (
                          <input
                            autoFocus
                            value={renamingFolderName}
                            onChange={(event) => setRenamingFolderName(event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            onDoubleClick={(event) => event.stopPropagation()}
                            onBlur={() => void submitFolderRename()}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                void submitFolderRename();
                              }
                              if (event.key === 'Escape') {
                                event.preventDefault();
                                cancelFolderRename();
                              }
                            }}
                            className="w-full border border-[var(--col-teal)] bg-[var(--bg-main)] px-2 py-1 mono text-[13px] uppercase font-black text-[var(--text-main)] outline-none"
                          />
                        ) : (
                          <div className="mono text-[14px] uppercase font-black text-[var(--text-main)] truncate">{folder.name}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    draggable
                    onClick={(event) => {
                      event.stopPropagation();
                      selectAsset(asset.id, event);
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      if (renamingAssetId === asset.id) return;
                      openAsset(asset);
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!selectedAssetIds.includes(asset.id)) setSelectedAssetIds([asset.id]);
                      setContextMenu({ x: event.clientX, y: event.clientY, type: 'asset', assetId: asset.id });
                    }}
                    onDragStart={(event) => {
                      if (!selectedAssetIds.includes(asset.id)) setSelectedAssetIds([asset.id]);
                      setDraggedAssetId(asset.id);
                      event.dataTransfer.setData('text/plain', asset.id);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      setDraggedAssetId(null);
                      setDragOverFolderId(null);
                    }}
                    className={`${
                      draggedAssetId === asset.id || assetClipboard?.assetIds.includes(asset.id) ? 'opacity-50' : ''
                    } ${selectedAssetIds.includes(asset.id) ? 'ring-2 ring-[var(--col-teal)]' : ''}`}
                  >
                  <BaseCard
                    title={renamingAssetId === asset.id ? (
                      <input
                        autoFocus
                        value={renamingAssetName}
                        onChange={(event) => setRenamingAssetName(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                        onBlur={() => void submitAssetRename()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void submitAssetRename();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelAssetRename();
                          }
                        }}
                        className="w-full border border-[var(--col-teal)] bg-[var(--bg-main)] px-2 py-1 mono text-[10px] uppercase font-black text-[var(--text-main)] outline-none"
                      />
                    ) : asset.name}
                    accentColor={SECTION_ACCENT}
                    className="[&>div:last-child]:px-5 [&>div:last-child]:py-4"
                  >
                    <div className="h-full flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="mono text-[9px] uppercase text-[var(--text-muted)]">Выбор</span>
                        {selectedAssetIds.includes(asset.id) ? <CheckSquare size={16} className="text-[var(--col-teal)]" /> : <Square size={16} className="text-[var(--text-muted)]" />}
                      </div>
                      <div className="h-40 border border-[var(--border-color)] bg-[var(--bg-main)] overflow-hidden flex items-center justify-center">
                        {asset.type === 'image' && asset.url ? (
                          <div
                            className="h-full w-full bg-center bg-cover"
                            style={{ backgroundImage: `url(${asset.url})` }}
                            title={asset.name}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
                            {getAssetIcon(asset.type)}
                            <span className="mono text-[9px] uppercase font-black">{asset.mimeType ?? 'ФАЙЛ'}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="mono text-[10px] uppercase font-black text-[var(--col-teal)]">
                          {ASSET_TYPE_LABELS[asset.type]}
                        </span>
                        <span className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">
                          {ASSET_KIND_LABELS[asset.kind]}
                        </span>
                      </div>
                      <div className="mt-auto border-t border-[var(--border-color)] pt-3" />
                    </div>
                  </BaseCard>
                  </div>
                ))}
              </div>
              {visibleFolders.length === 0 && filteredAssets.length === 0 && (
                <div className="border border-dashed border-[var(--border-color)] p-10 text-center mono text-[10px] uppercase text-[var(--text-muted)]">
                  {activeFolderAssetCount > 0 && hasActiveFilters
                    ? 'Ничего не найдено'
                    : activeCollectionId === 'all' ? 'Библиотека пуста' : 'Папка пуста'}
                </div>
              )}
            </div>
                </>
              )}

              {libraryMode === 'sets' && (
                <div className="space-y-6">
                  {activeSet ? (
                    <>
                      <div className="flex items-end justify-between gap-4 border-b border-[var(--border-color)] pb-4">
                        <div
                          onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setContextMenu({ x: event.clientX, y: event.clientY, type: 'set', setId: activeSet.id });
                          }}
                        >
                          <div className="mono text-[9px] uppercase font-black tracking-[0.25em] text-[var(--text-muted)]">
                            <button type="button" onClick={() => setActiveSetId(null)} className="hover:text-[var(--col-teal)] transition-colors">
                              НАБОРЫ АССЕТОВ
                            </button>
                            <span> / {activeSet.name.toUpperCase()}</span>
                          </div>
                          {renamingSetId === activeSet.id ? (
                            <input
                              autoFocus
                              value={renamingSetName}
                              onChange={(event) => setRenamingSetName(event.target.value)}
                              onBlur={() => void submitSetRename()}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  void submitSetRename();
                                }
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  cancelSetRename();
                                }
                              }}
                              className="mt-1 w-full border border-[var(--col-teal)] bg-[var(--bg-main)] px-2 py-1 mono text-2xl uppercase font-black text-[var(--text-main)] outline-none"
                            />
                          ) : (
                            <h3 className="text-2xl font-black uppercase tracking-tight text-[var(--text-main)]">{activeSet.name}</h3>
                          )}
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button color="grey" onClick={() => setActiveSetId(null)}>
                            Назад
                          </Button>
                          <div className="mono text-[10px] uppercase text-[var(--text-muted)] h-8 flex items-center px-2">
                            {activeSetAssets.length} ассетов
                          </div>
                        </div>
                      </div>

                      <div className="border border-[var(--border-color)] bg-[var(--bg-main)] p-4 space-y-2">
                        <div className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">Описание набора</div>
                        <textarea
                          value={setDescriptionDraft}
                          onChange={(event) => setSetDescriptionDraft(event.target.value)}
                          onBlur={() => void submitSetDescription()}
                          placeholder="Для чего используется этот набор"
                          className="w-full min-h-24 resize-y border border-[var(--border-color)] bg-transparent p-3 mono text-[11px] text-[var(--text-main)] outline-none focus:border-[var(--col-teal)]"
                        />
                      </div>

                      <div
                        className="relative min-h-[420px] border border-dashed border-[var(--border-color)] p-4"
                        onClick={() => setContextMenu(null)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setContextMenu(null);
                        }}
                      >
                        {activeSetAssets.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                            {activeSetAssets.map((asset) => (
                              <div
                                key={asset.id}
                                onDoubleClick={(event) => {
                                  event.stopPropagation();
                                  openAsset(asset);
                                }}
                                onContextMenu={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setContextMenu({ x: event.clientX, y: event.clientY, type: 'set-asset', setId: activeSet.id, assetId: asset.id });
                                }}
                              >
                              <BaseCard title={asset.name} accentColor={SECTION_ACCENT} className="[&>div:last-child]:px-5 [&>div:last-child]:py-4">
                                <div className="h-full flex flex-col gap-3">
                                  <div className="h-40 border border-[var(--border-color)] bg-[var(--bg-main)] overflow-hidden flex items-center justify-center">
                                    {asset.type === 'image' && asset.url ? (
                                      <div className="h-full w-full bg-center bg-cover" style={{ backgroundImage: `url(${asset.url})` }} title={asset.name} />
                                    ) : (
                                      <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
                                        {getAssetIcon(asset.type)}
                                        <span className="mono text-[9px] uppercase font-black">{asset.mimeType ?? 'ФАЙЛ'}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="mono text-[10px] uppercase font-black text-[var(--col-teal)]">{ASSET_TYPE_LABELS[asset.type]}</span>
                                    <span className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">{ASSET_KIND_LABELS[asset.kind]}</span>
                                  </div>
                                  <div className="mt-auto border-t border-[var(--border-color)] pt-3 space-y-2 mono text-[8px] uppercase text-[var(--text-muted)]">
                                    <div className="flex items-center justify-between gap-2">
                                      <span>Папка</span>
                                      <span className="truncate">
                                        {getPrimaryFolderId(asset)
                                          ? folders.find((folder) => folder.id === getPrimaryFolderId(asset))?.name
                                          : 'Библиотека'}
                                      </span>
                                    </div>
                                    <div>ПКМ по файлу для действий</div>
                                  </div>
                                </div>
                              </BaseCard>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border border-dashed border-[var(--border-color)] p-10 text-center mono text-[10px] uppercase text-[var(--text-muted)]">
                            Набор пуст
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-end justify-between gap-4 border-b border-[var(--border-color)] pb-4">
                        <div>
                          <div className="mono text-[9px] uppercase font-black tracking-[0.25em] text-[var(--text-muted)]">БИБЛИОТЕКА / НАБОРЫ</div>
                          <h3 className="text-2xl font-black uppercase tracking-tight text-[var(--text-main)]">Наборы ассетов</h3>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <div className="mono text-[10px] uppercase text-[var(--text-muted)] h-8 flex items-center px-2">
                            {collections.length} наборов
                          </div>
                        </div>
                      </div>

                      {selectedAssets.length > 0 && (
                        <div
                          draggable
                          onDragStart={(event) => {
                            setDraggedAssetId(selectedAssets[0].id);
                            event.dataTransfer.setData('text/plain', selectedAssets[0].id);
                            event.dataTransfer.effectAllowed = 'copy';
                          }}
                          onDragEnd={() => {
                            setDraggedAssetId(null);
                            setDragOverSetId(null);
                          }}
                          className="inline-flex border border-[var(--col-teal)] bg-[var(--col-teal)]/10 px-3 py-2 mono text-[10px] uppercase font-black text-[var(--col-teal)] cursor-grab"
                        >
                          Перетащить выбранные ассеты: {selectedAssets.length}
                        </div>
                      )}

                      <div
                        className="relative min-h-[420px] border border-dashed border-[var(--border-color)] p-4"
                        onClick={() => setContextMenu(null)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setContextMenu({ x: event.clientX, y: event.clientY, type: 'workspace' });
                        }}
                      >
                        {collections.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                            {collections.map((collection) => {
                              const activeDrop = dragOverSetId === collection.id;
                              return (
                                <div
                                  key={collection.id}
                                  onDoubleClick={() => setActiveSetId(collection.id)}
                                  onContextMenu={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setContextMenu({ x: event.clientX, y: event.clientY, type: 'set', setId: collection.id });
                                  }}
                                  onDragOver={(event) => {
                                    if (!draggedAssetId) return;
                                    event.preventDefault();
                                    setDragOverSetId(collection.id);
                                  }}
                                  onDragLeave={() => setDragOverSetId(null)}
                                  onDrop={(event) => {
                                    event.preventDefault();
                                    void handleDropAssetsToSet(collection.id, event.dataTransfer.getData('text/plain') || undefined);
                                  }}
                                  className={`border-2 p-5 min-h-[220px] bg-[var(--bg-card)] flex flex-col justify-between transition-colors ${
                                    activeDrop ? 'border-[var(--col-teal)] bg-[var(--col-teal)]/10' : 'border-[var(--border-color)] hover:border-[var(--col-teal)]'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <Folder size={36} className="text-[var(--col-teal)]" />
                                    <span className="mono text-[9px] uppercase text-[var(--text-muted)]">{collection.assetIds.length}</span>
                                  </div>
                                  <div className="space-y-3">
                                    {renamingSetId === collection.id ? (
                                      <input
                                        autoFocus
                                        value={renamingSetName}
                                        onChange={(event) => setRenamingSetName(event.target.value)}
                                        onBlur={() => void submitSetRename()}
                                        onKeyDown={(event) => {
                                          if (event.key === 'Enter') {
                                            event.preventDefault();
                                            void submitSetRename();
                                          }
                                          if (event.key === 'Escape') {
                                            event.preventDefault();
                                            cancelSetRename();
                                          }
                                        }}
                                        className="w-full border border-[var(--col-teal)] bg-[var(--bg-main)] px-2 py-1 mono text-[13px] uppercase font-black text-[var(--text-main)] outline-none"
                                      />
                                    ) : (
                                      <div className="mono text-[14px] uppercase font-black text-[var(--text-main)] truncate">{collection.name}</div>
                                    )}
                                    <div className="mono text-[9px] uppercase text-[var(--text-muted)] line-clamp-2">
                                      {collection.description || 'Переиспользуемый набор ассетов'}
                                    </div>
                                  </div>
                                  <div className="pt-4 mono text-[8px] uppercase text-[var(--text-muted)]">
                                    Двойной клик открыть / ПКМ для действий
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="border border-dashed border-[var(--border-color)] p-10 text-center mono text-[10px] uppercase text-[var(--text-muted)]">
                            Наборы еще не созданы
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 w-56 border border-[var(--border-color)] bg-[#050505] text-[var(--text-main)] shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {contextMenu.type === 'workspace' && (
            <>
              {selectedAssetIds.length > 0 && (
                <div className="border-b border-[var(--border-color)] px-3 py-2 mono text-[9px] uppercase font-black text-[var(--text-muted)]">
                  Выбрано: {selectedAssetIds.length}
                </div>
              )}
              {libraryMode === 'sets' ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleCreateSet()}
                    className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)]"
                  >
                    <Plus size={13} /> Создать набор
                  </button>
                  {activeSet && (
                    <>
                      <button
                        type="button"
                        onClick={() => startRenameSet(activeSet)}
                        className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)]"
                      >
                        <Edit3 size={13} /> Переименовать набор
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSet(activeSet)}
                        className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-red)]/10 hover:text-[var(--col-red)]"
                      >
                        <Trash2 size={13} /> Удалить набор
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
              <button
                type="button"
                onClick={() => void handleCreateFolderFromContext()}
                className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)]"
              >
                <Plus size={13} /> Создать папку
              </button>
              <button
                type="button"
                disabled={!assetClipboard}
                onClick={() => void pasteAssetsToFolder(activeCollectionId)}
                className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)] disabled:opacity-40"
              >
                <ClipboardPaste size={13} /> Вставить сюда
              </button>
              {selectedAssetIds.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => moveAssetsClipboard()}
                    className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)]"
                  >
                    <Scissors size={13} /> Вырезать выбранное
                  </button>
                  {activeCollectionId !== 'all' && (
                    <button
                      type="button"
                      onClick={() => void removeAssetsFromCurrentFolder()}
                      className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-red)]/10 hover:text-[var(--col-red)]"
                    >
                      <Folder size={13} /> Переместить выбранное в библиотеку
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDeleteAssets(selectedAssets)}
                    className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-red)]/10 hover:text-[var(--col-red)]"
                  >
                    <Trash2 size={13} /> Удалить выбранное из библиотеки
                  </button>
                </>
              )}
              {selectedAssetIds.length > 0 && renderAddToSetActions(selectedAssets)}
              <button
                type="button"
                disabled={filteredAssets.length === 0}
                onClick={selectAllVisibleAssets}
                className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)] disabled:opacity-40"
              >
                <CheckSquare size={13} /> Выделить все
              </button>
              <button
                type="button"
                disabled={selectedAssetIds.length === 0}
                onClick={() => { setSelectedAssetIds([]); setContextMenu(null); }}
                className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)] disabled:opacity-40"
              >
                <Square size={13} /> Снять выделение
              </button>
                </>
              )}
            </>
          )}

          {contextMenu.type === 'asset' && (
            <>
              <div className="border-b border-[var(--border-color)] px-3 py-2 mono text-[9px] uppercase font-black text-[var(--text-muted)]">
                {getActionAssets(contextMenu.assetId).length > 1 ? `Выбрано: ${getActionAssets(contextMenu.assetId).length}` : 'Файл'}
              </div>
              <button
                type="button"
                onClick={() => {
                  const asset = data.find((item) => item.id === contextMenu.assetId);
                  if (asset) openEditModal(asset);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)]"
              >
                <Edit3 size={13} /> Правка
              </button>
              <button
                type="button"
                onClick={() => {
                  const asset = data.find((item) => item.id === contextMenu.assetId);
                  if (asset) void handleRenameAsset(asset);
                }}
                className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)]"
              >
                <Edit3 size={13} /> Переименовать
              </button>
              <button
                type="button"
                disabled={!data.find((item) => item.id === contextMenu.assetId)?.url}
                onClick={() => openAsset(data.find((item) => item.id === contextMenu.assetId))}
                className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)] disabled:opacity-40"
              >
                <ExternalLink size={13} /> Открыть
              </button>
              <button
                type="button"
                disabled={!data.find((item) => item.id === contextMenu.assetId)?.url}
                onClick={() => downloadAsset(data.find((item) => item.id === contextMenu.assetId))}
                className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)] disabled:opacity-40"
              >
                <Download size={13} /> Скачать
              </button>
              {renderAddToSetActions(getActionAssets(contextMenu.assetId))}
              <button
                type="button"
                onClick={() => moveAssetsClipboard(contextMenu.assetId)}
                className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)]"
              >
                <Scissors size={13} /> Вырезать
              </button>
              {activeCollectionId !== 'all' && (
                <button
                  type="button"
                  onClick={() => void removeAssetsFromCurrentFolder(contextMenu.assetId)}
                  className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-red)]/10 hover:text-[var(--col-red)]"
                >
                  <Folder size={13} /> Переместить в библиотеку
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleDeleteAssets(getActionAssets(contextMenu.assetId))}
                className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-red)]/10 hover:text-[var(--col-red)]"
              >
                <Trash2 size={13} /> Удалить из библиотеки
              </button>
            </>
          )}

          {contextMenu.type === 'set' && (() => {
            const collection = getCollectionById(contextMenu.setId);
            if (!collection) return null;

            return (
              <>
                <div className="border-b border-[var(--border-color)] px-3 py-2 mono text-[9px] uppercase font-black text-[var(--text-muted)]">
                  Набор
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSetId(collection.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)]"
                >
                  <FolderOpen size={13} /> Открыть
                </button>
                <button
                  type="button"
                  disabled={selectedAssets.length === 0}
                  onClick={() => void applySetToAssets(selectedAssets, collection.id)}
                  className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)] disabled:opacity-40"
                >
                  <Plus size={13} /> Добавить выбранные
                </button>
                <button
                  type="button"
                  onClick={() => startRenameSet(collection)}
                  className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)]"
                >
                  <Edit3 size={13} /> Переименовать
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteSet(collection)}
                  className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-red)]/10 hover:text-[var(--col-red)]"
                >
                  <Trash2 size={13} /> Удалить набор
                </button>
              </>
            );
          })()}

          {contextMenu.type === 'set-asset' && (() => {
            const asset = data.find((item) => item.id === contextMenu.assetId);
            if (!asset) return null;

            return (
              <>
                <div className="border-b border-[var(--border-color)] px-3 py-2 mono text-[9px] uppercase font-black text-[var(--text-muted)]">
                  Ассет в наборе
                </div>
                <button
                  type="button"
                  onClick={() => {
                    openEditModal(asset);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)]"
                >
                  <Edit3 size={13} /> Правка
                </button>
                <button
                  type="button"
                  disabled={!asset.url}
                  onClick={() => openAsset(asset)}
                  className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)] disabled:opacity-40"
                >
                  <ExternalLink size={13} /> Открыть
                </button>
                <button
                  type="button"
                  onClick={() => void removeAssetFromSet(asset, contextMenu.setId)}
                  className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-red)]/10 hover:text-[var(--col-red)]"
                >
                  <Trash2 size={13} /> Убрать из набора
                </button>
              </>
            );
          })()}

          {contextMenu.type === 'folder' && (
            <>
              <button
                type="button"
                onClick={() => openFolder(contextMenu.folderId)}
                className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)]"
              >
                <FolderOpen size={13} /> Открыть
              </button>
              <button
                type="button"
                disabled={!assetClipboard}
                onClick={() => void pasteAssetsToFolder(contextMenu.folderId)}
                className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)] disabled:opacity-40"
              >
                <ClipboardPaste size={13} /> Вставить в папку
              </button>
              {contextMenu.folderId !== 'all' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const folder = folders.find((item) => item.id === contextMenu.folderId);
                      if (folder) startRenameFolder(folder);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-teal)]/10 hover:text-[var(--col-teal)]"
                  >
                    <Edit3 size={13} /> Переименовать
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const folder = folders.find((item) => item.id === contextMenu.folderId);
                      if (folder) void handleDeleteFolder(folder);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 mono text-[10px] uppercase font-black text-left hover:bg-[var(--col-red)]/10 hover:text-[var(--col-red)]"
                  >
                    <Trash2 size={13} /> Удалить папку
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

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
            value={editKind}
            onChange={(value) => setEditKind(value as AssetKind)}
            options={ASSET_KIND_OPTIONS.filter((option) => option.value !== 'all') as { value: AssetKind; label: string }[]}
            accentColor={SECTION_ACCENT}
          />
          <div className="space-y-2">
            <div className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">Папка</div>
            <Select
              value={editFolderId}
              onChange={(folderId) => setEditFolderId(folderId)}
              options={folderOptions}
              accentColor={SECTION_ACCENT}
            />
          </div>
          {collections.length > 0 && (
            <div className="space-y-3">
              <div className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">Наборы ассетов</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {collections.map((collection) => {
                  const checked = editCollectionIds.includes(collection.id);
                  return (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => setEditCollectionIds((prev) => (
                        checked ? prev.filter((id) => id !== collection.id) : [...prev, collection.id]
                      ))}
                      className={`border px-3 py-2 mono text-[9px] uppercase font-black text-left transition-colors ${
                        checked
                          ? 'border-[var(--col-teal)] text-[var(--col-teal)] bg-[var(--col-teal)]/10'
                          : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--col-teal)]'
                      }`}
                    >
                      {collection.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
