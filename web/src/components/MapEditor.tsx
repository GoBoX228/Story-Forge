
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button, Input, SearchInput, SectionHeader } from './UI';
import {
  Asset,
  AssetCollection,
  AssetCollectionAssignmentMap,
  AssetCollectionTargetType,
  AssetKind,
  Character,
  EntityLink,
  EntityLinkAssignmentMap,
  EntityLinkCreatePayload,
  EntityLinkTargetType,
  EntityLinkUpdatePayload,
  Faction,
  Item,
  MapData,
  MapLayer,
  MapLayerType,
  MapObject,
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
import { apiRequest } from '../lib/api';
import { assetCollectionAssignmentKey, entityLinkAssignmentKey, mapMapFromApi, publicationAssignmentKey, tagAssignmentKey } from '../lib/mappers';
import { buildAssetUsagePayload, findAssetUsageLink, isAssetUsageLink } from '../lib/assetUsage';
import { TagFilter, TagPicker } from './TagPicker';
import { EntityLinksPanel } from './EntityLinksPanel';
import { AssetUsagePicker } from './AssetUsagePicker';
import { AssetCollectionTargetPicker } from './AssetCollectionTargetPicker';
import { PublicationPanel } from './PublicationPanel';
import { 
  Plus, Trash2, ArrowLeft, RefreshCw, Grid, Eraser, 
  MousePointer2, Maximize, Edit3, Layers, Layout, 
  Hand, PaintBucket, Square, Pipette, Undo2, Redo2, ZoomIn, ZoomOut,
  Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown
} from 'lucide-react';

const ACCENT_WHITE = 'var(--col-white)';
type ToolbarPosition = 'left' | 'top' | 'right' | 'bottom';
type ToolType = 'brush' | 'eraser' | 'select' | 'pan' | 'fill' | 'rect' | 'picker';
type GridPoint = { x: number; y: number };
interface PaletteAsset {
  type: string;
  label: string;
  color: string;
  assetId?: string | null;
  imageUrl?: string | null;
  sourceLabel?: string;
  sourceSetNames?: string[];
}

const DEFAULT_LAYER_NAMES: Record<MapLayerType, string> = {
  background: 'BACKGROUND',
  tiles: 'TILES',
  tokens: 'TOKENS'
};

const LAYER_TYPE_LABELS: Record<MapLayerType, string> = {
  background: 'BACKGROUND',
  tiles: 'TILES',
  tokens: 'TOKENS'
};

const LAYER_TYPE_COLORS: Record<MapLayerType, string> = {
  background: '#2f2f2f',
  tiles: '#9aa0a6',
  tokens: '#2a9d8f'
};

const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 100000).toString(36)}`;
};

const createMapLayer = (type: MapLayerType, order: number, name = DEFAULT_LAYER_NAMES[type]): MapLayer => ({
  id: createId(type),
  type,
  name,
  visible: true,
  locked: false,
  opacity: 1,
  order,
  objects: []
});

const createInitialMapLayers = (): MapLayer[] => [
  { ...createMapLayer('background', 0), id: 'background' },
  { ...createMapLayer('tiles', 1), id: 'tiles' },
  { ...createMapLayer('tokens', 2), id: 'tokens' }
];

const flattenLayers = (layers: MapLayer[]): MapObject[] =>
  layers
    .filter((layer) => layer.type !== 'background')
    .sort((a, b) => a.order - b.order)
    .flatMap((layer) => layer.objects.map((object) => ({ ...object, layerId: layer.id })));

const serializeMapData = (map: MapData) => ({
  layers: map.layers.map((layer) => ({
    ...layer,
    objects: layer.objects.map((object) => ({ ...object, layerId: layer.id }))
  })),
  objects: flattenLayers(map.layers),
  backgroundAssetId: map.backgroundAssetId ?? null
});

const cloneLayers = (layers: MapLayer[]): MapLayer[] =>
  layers.map((layer) => ({
    ...layer,
    objects: layer.objects.map((object) => ({ ...object }))
  }));

const isWithinMapBoundsValue = (x: number, y: number, map: MapData) =>
  x >= 0 && y >= 0 && x < map.width && y < map.height;

const sanitizeMapObjects = (objects: MapObject[], map: MapData): MapObject[] =>
  objects
    .map((obj) => ({
      ...obj,
      width: Math.max(1, Number(obj.width ?? 1)),
      height: Math.max(1, Number(obj.height ?? 1)),
      rotation: Number.isFinite(Number(obj.rotation)) ? Number(obj.rotation) : 0,
      opacity: Math.max(0, Math.min(1, Number(obj.opacity ?? 1)))
    }))
    .filter((obj) => {
      const width = Math.max(1, Math.ceil(obj.width ?? 1));
      const height = Math.max(1, Math.ceil(obj.height ?? 1));
      return isWithinMapBoundsValue(obj.x, obj.y, map) && obj.x + width <= map.width && obj.y + height <= map.height;
    });

const sanitizeMapLayers = (layers: MapLayer[], map: MapData): MapLayer[] =>
  layers
    .map((layer, index) => ({
      ...layer,
      name: layer.name?.trim() || DEFAULT_LAYER_NAMES[layer.type],
      visible: layer.visible !== false,
      locked: Boolean(layer.locked),
      opacity: Math.max(0, Math.min(1, Number(layer.opacity ?? 1))),
      order: Number.isFinite(Number(layer.order)) ? Number(layer.order) : index,
      objects: layer.type === 'background'
        ? []
        : sanitizeMapObjects(layer.objects, map).map((object) => ({ ...object, layerId: layer.id }))
    }))
    .sort((a, b) => a.order - b.order)
    .map((layer, index) => ({ ...layer, order: index }));

const updateMapLayerObjects = (layers: MapLayer[], layerId: string, objects: MapObject[]): MapLayer[] =>
  layers.map((layer) => layer.id === layerId
    ? { ...layer, objects: objects.map((object) => ({ ...object, layerId: layer.id })) }
    : layer
  );

const mapObjectContainsCell = (object: MapObject, x: number, y: number): boolean => {
  const width = Math.max(1, Math.ceil(object.width ?? 1));
  const height = Math.max(1, Math.ceil(object.height ?? 1));
  return x >= object.x && x < object.x + width && y >= object.y && y < object.y + height;
};

const createMapObject = (
  x: number,
  y: number,
  asset: PaletteAsset,
  layer: MapLayer,
  options?: { width?: number; height?: number; rotation?: number; opacity?: number }
): MapObject => ({
  id: createId('map-object'),
  x,
  y,
  width: options?.width ?? 1,
  height: options?.height ?? 1,
  rotation: options?.rotation ?? 0,
  opacity: options?.opacity ?? 1,
  type: asset.type,
  label: asset.label,
  color: asset.color,
  assetId: asset.assetId ?? null,
  layerId: layer.id
});

const BASE_TILE_ASSETS: PaletteAsset[] = [
  { type: 'wall', label: 'WALL', color: '#888888' },
  { type: 'floor', label: 'FLOOR', color: '#222222' },
  { type: 'water', label: 'WATER', color: '#4361EE' },
  { type: 'lava', label: 'LAVA', color: '#E63946' },
  { type: 'grass', label: 'GRASS', color: '#2A9D8F' },
  { type: 'wood', label: 'WOOD', color: '#D4A373' },
  { type: 'npc', label: 'NPC', color: '#FFC300' },
  { type: 'loot', label: 'LOOT', color: '#8338EC' },
];

interface MapEditorProps {
  data: MapData[];
  onUpdate: (data: MapData[]) => void;
  scenarios: Scenario[];
  characters: Character[];
  items: Item[];
  assetsLibrary: Asset[];
  assetCollections: AssetCollection[];
  assetCollectionAssignments: AssetCollectionAssignmentMap;
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
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
  onReplaceAssetCollections: (type: AssetCollectionTargetType, id: string, collectionIds: string[]) => Promise<AssetCollection[]>;
  initialMapId?: string | null;
}

const MapEditor: React.FC<MapEditorProps> = ({
  data,
  onUpdate,
  scenarios,
  characters,
  items,
  assetsLibrary,
  assetCollections,
  assetCollectionAssignments,
  locations,
  factions,
  events,
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
  onReplaceAssetCollections,
  initialMapId
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [autosaveState, setAutosaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [selectedTool, setSelectedTool] = useState<ToolType>('pan');
  const [activeAsset, setActiveAsset] = useState<PaletteAsset>(BASE_TILE_ASSETS[0]);
  const [activeLayerId, setActiveLayerId] = useState('tiles');
  const [tokenWidth, setTokenWidth] = useState(1);
  const [tokenHeight, setTokenHeight] = useState(1);
  const [tokenRotation, setTokenRotation] = useState(0);
  const [tokenOpacity, setTokenOpacity] = useState(1);
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>('left');
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imageRevision, setImageRevision] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = useState<MapLayer[][]>([]);
  const [redoStack, setRedoStack] = useState<MapLayer[][]>([]);
  const [rectStart, setRectStart] = useState<GridPoint | null>(null);
  const [rectEnd, setRectEnd] = useState<GridPoint | null>(null);
  const initialMapAppliedRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeMap = data.find(m => m.id === activeId);
  const sortedLayers = useMemo(
    () => [...(activeMap?.layers ?? [])].sort((a, b) => a.order - b.order),
    [activeMap?.layers]
  );
  const layerPanelLayers = [...sortedLayers].reverse();
  const activeLayer = sortedLayers.find((layer) => layer.id === activeLayerId) ?? sortedLayers.find((layer) => layer.type === 'tiles');
  const activeLayerEditable = Boolean(activeLayer && activeLayer.visible && !activeLayer.locked && activeLayer.type !== 'background');
  const activeMapTags = activeMap ? tagAssignments[tagAssignmentKey('map', activeMap.id)] ?? [] : [];
  const activeMapEntityLinks = activeMap ? entityLinks[entityLinkAssignmentKey('map', activeMap.id)] ?? [] : [];
  const activeMapCollectionIds = useMemo(
    () => activeMap
      ? (assetCollectionAssignments[assetCollectionAssignmentKey('map', activeMap.id)] ?? []).map((collection) => collection.id)
      : [],
    [activeMap, assetCollectionAssignments]
  );
  const effectiveBackgroundAssetId = activeMap?.backgroundAssetId ?? findAssetUsageLink(activeMapEntityLinks, 'map_background')?.targetId ?? null;
  const filteredMaps = data.filter((map) => {
    const matchesSearch = map.name.toLowerCase().includes(searchQuery.toLowerCase());
    const assignedTags = tagAssignments[tagAssignmentKey('map', map.id)] ?? [];
    const matchesTag = !selectedTagFilter || assignedTags.some((tag) => tag.id === selectedTagFilter);
    return matchesSearch && matchesTag;
  });

  const assets = useMemo<PaletteAsset[]>(() => [
    { type: 'wall', label: 'WALL', color: '#888888' },
    { type: 'floor', label: 'FLOOR', color: '#222222' },
    { type: 'water', label: 'WATER', color: '#4361EE' },
    { type: 'lava', label: 'LAVA', color: '#E63946' },
    { type: 'grass', label: 'GRASS', color: '#2A9D8F' },
    { type: 'wood', label: 'WOOD', color: '#D4A373' },
    { type: 'npc', label: 'NPC', color: '#FFC300' },
    { type: 'loot', label: 'LOOT', color: '#8338EC' },
  ], []);

  const assetById = useMemo(() => new globalThis.Map(assetsLibrary.map((asset) => [asset.id, asset])), [assetsLibrary]);
  const collectionById = useMemo(
    () => new globalThis.Map(assetCollections.map((collection) => [collection.id, collection])),
    [assetCollections]
  );
  const activeMapCollections = useMemo(
    () => activeMapCollectionIds
      .map((collectionId) => collectionById.get(collectionId))
      .filter((collection): collection is AssetCollection => Boolean(collection)),
    [activeMapCollectionIds, collectionById]
  );
  const mapScopedAssets = useMemo(
    () => activeMapCollectionIds.length === 0
      ? assetsLibrary
      : assetsLibrary.filter((asset) => asset.collectionIds.some((collectionId) => activeMapCollectionIds.includes(collectionId))),
    [activeMapCollectionIds, assetsLibrary]
  );
  const getAssetSourceSetNames = useCallback((asset: Asset): string[] => {
    const sourceIds = activeMapCollectionIds.length > 0
      ? asset.collectionIds.filter((collectionId) => activeMapCollectionIds.includes(collectionId))
      : asset.collectionIds;

    return sourceIds
      .map((collectionId) => collectionById.get(collectionId)?.name)
      .filter((name): name is string => Boolean(name));
  }, [activeMapCollectionIds, collectionById]);
  const paletteAssets = useMemo<PaletteAsset[]>(
    () => [
      ...assets.map((asset) => ({ ...asset, sourceLabel: 'BASE' })),
      ...mapScopedAssets
        .filter((asset) => asset.type === 'image' && (asset.kind === 'tile' || asset.kind === 'token'))
        .map((asset) => {
          const sourceSetNames = getAssetSourceSetNames(asset);
          return {
            type: `asset:${asset.id}`,
            label: asset.name,
            color: '#2A9D8F',
            assetId: asset.id,
            imageUrl: asset.url ?? null,
            sourceSetNames,
            sourceLabel: sourceSetNames.length > 0
              ? sourceSetNames.join(', ')
              : activeMapCollectionIds.length > 0
                ? 'CONNECTED SET'
                : 'ALL ASSETS'
          };
        })
    ],
    [activeMapCollectionIds.length, assets, getAssetSourceSetNames, mapScopedAssets]
  );
  const activeLayerPaletteAssets = activeLayer?.type === 'tiles'
    ? [
        ...paletteAssets.filter((asset) => !asset.assetId),
        ...paletteAssets.filter((asset) => asset.assetId && assetById.get(asset.assetId)?.kind === 'tile')
      ]
    : activeLayer?.type === 'tokens'
      ? paletteAssets.filter((asset) => asset.assetId && assetById.get(asset.assetId)?.kind === 'token')
      : [];
  const activeLayerPaletteLabel = activeLayer?.type === 'tiles'
    ? 'TILE PALETTE'
    : activeLayer?.type === 'tokens'
      ? 'TOKEN PALETTE'
      : '';
  const activeLayerCanUseAsset = Boolean(
    activeLayerEditable &&
    activeLayerPaletteAssets.some((asset) =>
      asset.type === activeAsset.type && (asset.assetId ?? null) === (activeAsset.assetId ?? null)
    )
  );
  const activeLayerNotice = activeLayer
    ? activeLayer.locked
      ? 'LAYER LOCKED: EDITING DISABLED'
      : !activeLayer.visible
        ? 'LAYER HIDDEN: EDITING DISABLED'
        : activeLayer.type === 'background'
          ? 'BACKGROUND LAYER IS NOT DRAWABLE. CHOOSE BACKGROUND ASSET IN LAYER PROPERTIES.'
          : ''
    : '';
  const activeLayerAssetKind: AssetKind | null = activeLayer?.type === 'background'
    ? 'background'
    : activeLayer?.type === 'tiles'
      ? 'tile'
      : activeLayer?.type === 'tokens'
        ? 'token'
        : null;
  const activeLayerLibraryAssetCount = activeLayerAssetKind
    ? mapScopedAssets.filter((asset) => asset.type === 'image' && asset.kind === activeLayerAssetKind).length
    : 0;
  const activeLayerSetSummaries = activeLayerAssetKind
    ? activeMapCollections.map((collection) => ({
        collection,
        count: assetsLibrary.filter((asset) =>
          asset.type === 'image' &&
          asset.kind === activeLayerAssetKind &&
          asset.collectionIds.includes(collection.id)
        ).length
      }))
    : [];

  const handleCreateMap = async () => {
    try {
      const response = await apiRequest('/maps', {
        method: 'POST',
        body: JSON.stringify({
          name: 'NEW MAP',
          width: 20,
          height: 20,
          cell_size: 32,
          data: { layers: createInitialMapLayers(), objects: [], backgroundAssetId: null }
        })
      });
      const created = mapMapFromApi(response);
      onUpdate([...data, created]);
      setActiveId(created.id);
      setViewOffset({ x: 0, y: 0 });
    } catch {
      // ignore
    }
  };

  const scheduleSave = (nextMap: MapData) => {
    setAutosaveState('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await apiRequest(`/maps/${nextMap.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: nextMap.name,
            width: nextMap.width,
            height: nextMap.height,
            cell_size: nextMap.cellSize,
            data: serializeMapData(nextMap),
            scenario_id: nextMap.scenarioId ?? null
          })
        });
        setAutosaveState('saved');
      } catch {
        setAutosaveState('unsaved');
      }
    }, 600);
  };

  const updateMapField = (field: keyof MapData, value: any) => {
    if (!activeMap) return;
    let updated = { ...activeMap, [field]: value, updatedAt: new Date().toISOString() };
    if (field === 'layers') {
      const layers = sanitizeMapLayers(value as MapLayer[], updated);
      updated = { ...updated, layers, objects: flattenLayers(layers) };
    } else if (field === 'objects') {
      const layers = updateMapLayerObjects(updated.layers, activeLayerId, sanitizeMapObjects(value as MapObject[], updated));
      updated = { ...updated, layers, objects: flattenLayers(layers) };
    } else if (field === 'width' || field === 'height') {
      const layers = sanitizeMapLayers(updated.layers, updated);
      updated = { ...updated, layers, objects: flattenLayers(layers) };
    }
    onUpdate(data.map(m => m.id === activeMap.id ? updated : m));
    scheduleSave(updated);
  };

  const setMapAssetUsage = async (
    role: 'map_background' | 'map_token',
    assetId: string | null
  ) => {
    if (!activeMap) return;
    const existing = findAssetUsageLink(activeMapEntityLinks, role);

    if (!assetId) {
      if (existing) await onDeleteMaterialLink(existing.id);
      if (role === 'map_background') {
        updateMapField('backgroundAssetId', null);
      }
      return;
    }

    if (role === 'map_token') {
      const tokenLayer = activeMap.layers.find((layer) => layer.type === 'tokens');
      if (tokenLayer) setActiveLayerId(tokenLayer.id);
    }

    if (role === 'map_background' && existing && existing.targetId !== assetId) {
      await onDeleteMaterialLink(existing.id);
    }

    await onCreateMaterialLink(
      'map',
      activeMap.id,
      buildAssetUsagePayload(assetId, role)
    );

    if (role === 'map_background') {
      updateMapField('backgroundAssetId', assetId);
    }
  };

  const deleteMap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete map?')) return;
    try {
      await apiRequest(`/maps/${id}`, { method: 'DELETE' });
      onUpdate(data.filter(m => m.id !== id));
      if (activeId === id) setActiveId(null);
    } catch {
      // ignore
    }
  };
  const cycleToolbarPosition = () => { const p: ToolbarPosition[] = ['left', 'top', 'right', 'bottom']; setToolbarPosition(p[(p.indexOf(toolbarPosition) + 1) % 4]); };
  const handleZoom = (delta: number) => { setZoom(prev => Math.max(0.2, Math.min(3, prev + delta))); };
  const clampGridToMapBounds = (x: number, y: number, map: MapData): GridPoint => ({
    x: Math.min(map.width - 1, Math.max(0, x)),
    y: Math.min(map.height - 1, Math.max(0, y)),
  });

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeMap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parent = canvas.parentElement;
    if (parent) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; }
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    const cx = canvas.width / 2; const cy = canvas.height / 2;
    ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy); ctx.translate(viewOffset.x, viewOffset.y);
    const mapW = activeMap.width * activeMap.cellSize; const mapH = activeMap.height * activeMap.cellSize;
    const getCanvasImage = (url: string): HTMLImageElement | null => {
      if (typeof window === 'undefined') return null;
      let image = imageCacheRef.current[url];
      if (!image) {
        image = new window.Image();
        image.onload = () => setImageRevision((revision) => revision + 1);
        image.src = url;
        imageCacheRef.current[url] = image;
      }
      return image.complete && image.naturalWidth > 0 ? image : null;
    };
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, mapW, mapH);
    const renderBackgroundLayer = sortedLayers.find((layer) => layer.type === 'background');
    const backgroundAsset = effectiveBackgroundAssetId ? assetById.get(effectiveBackgroundAssetId) : undefined;
    if (renderBackgroundLayer?.visible !== false && backgroundAsset?.url) {
      const image = getCanvasImage(backgroundAsset.url);
      if (image) {
        ctx.save();
        ctx.globalAlpha = renderBackgroundLayer?.opacity ?? 1;
        ctx.drawImage(image, 0, 0, mapW, mapH);
        ctx.restore();
      }
    }

    const drawObject = (obj: MapObject, layerOpacity: number) => {
      const p = 1;
      const cellX = obj.x * activeMap.cellSize + p;
      const cellY = obj.y * activeMap.cellSize + p;
      const cellWidth = activeMap.cellSize * Math.max(1, obj.width ?? 1) - p * 2;
      const cellHeight = activeMap.cellSize * Math.max(1, obj.height ?? 1) - p * 2;
      const objectAsset = obj.assetId ? assetById.get(obj.assetId) : undefined;
      const objectImage = objectAsset?.url ? getCanvasImage(objectAsset.url) : null;
      const objectOpacity = Math.max(0, Math.min(1, obj.opacity ?? 1)) * layerOpacity;
      const rotation = ((obj.rotation ?? 0) * Math.PI) / 180;

      ctx.save();
      ctx.globalAlpha = objectOpacity;
      if (rotation) {
        ctx.translate(cellX + cellWidth / 2, cellY + cellHeight / 2);
        ctx.rotate(rotation);
        ctx.translate(-(cellX + cellWidth / 2), -(cellY + cellHeight / 2));
      }
      if (objectImage) {
        ctx.drawImage(objectImage, cellX, cellY, cellWidth, cellHeight);
      } else {
        ctx.fillStyle = obj.color;
        ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
      }
      if (obj.type === 'wall') { ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.strokeRect(cellX, cellY, cellWidth, cellHeight); }
      ctx.restore();
    };

    sortedLayers
      .filter((layer) => layer.visible && layer.type === 'tiles')
      .forEach((layer) => sanitizeMapObjects(layer.objects, activeMap).forEach((obj) => drawObject(obj, layer.opacity)));

    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    for (let x = 0; x <= activeMap.width; x++) { ctx.beginPath(); ctx.moveTo(x * activeMap.cellSize, 0); ctx.lineTo(x * activeMap.cellSize, mapH); ctx.stroke(); }
    for (let y = 0; y <= activeMap.height; y++) { ctx.beginPath(); ctx.moveTo(0, y * activeMap.cellSize); ctx.lineTo(mapW, y * activeMap.cellSize); ctx.stroke(); }

    sortedLayers
      .filter((layer) => layer.visible && layer.type === 'tokens')
      .forEach((layer) => sanitizeMapObjects(layer.objects, activeMap).forEach((obj) => drawObject(obj, layer.opacity)));
    if (selectedTool === 'rect' && rectStart && rectEnd) {
      const minX = Math.min(rectStart.x, rectEnd.x);
      const minY = Math.min(rectStart.y, rectEnd.y);
      const maxX = Math.max(rectStart.x, rectEnd.x);
      const maxY = Math.max(rectStart.y, rectEnd.y);
      const x = minX * activeMap.cellSize;
      const y = minY * activeMap.cellSize;
      const width = (maxX - minX + 1) * activeMap.cellSize;
      const height = (maxY - minY + 1) * activeMap.cellSize;
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = activeAsset.color;
      ctx.fillRect(x, y, width, height);
      ctx.globalAlpha = 1;
      ctx.setLineDash([8, 4]);
      ctx.strokeStyle = activeAsset.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, Math.max(0, width - 2), Math.max(0, height - 2));
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = '#4361EE'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, mapW, mapH);
    ctx.restore();
  }, [activeAsset.color, activeMap, assetById, effectiveBackgroundAssetId, rectEnd, rectStart, selectedTool, sortedLayers, viewOffset.x, viewOffset.y, zoom]);

  useEffect(() => {
    if (activeId) {
      drawMap();
      window.addEventListener('resize', drawMap);
      return () => window.removeEventListener('resize', drawMap);
    }
  }, [activeId, drawMap, imageRevision]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, [activeId]);

  useEffect(() => {
    if (!activeMap) return;
    if (activeMap.layers.some((layer) => layer.id === activeLayerId)) return;
    setActiveLayerId(activeMap.layers.find((layer) => layer.type === 'tiles')?.id ?? activeMap.layers[0]?.id ?? 'tiles');
  }, [activeLayerId, activeMap]);

  useEffect(() => {
    if (selectedTool !== 'rect') {
      setRectStart(null);
      setRectEnd(null);
    }
  }, [selectedTool]);

  useEffect(() => {
    if (!initialMapId) return;
    if (initialMapAppliedRef.current === initialMapId) return;
    const targetMap = data.find((map) => map.id === initialMapId);
    if (!targetMap) return;
    initialMapAppliedRef.current = initialMapId;
    setActiveId(initialMapId);
    setViewOffset({ x: 0, y: 0 });
  }, [initialMapId, data]);

  const getMapCoordinates = (e: React.MouseEvent) => {
    if (!canvasRef.current || !activeMap) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
    const cx = canvasRef.current.width / 2; const cy = canvasRef.current.height / 2;
    const wx = (mx - cx) / zoom + cx - viewOffset.x; const wy = (my - cy) / zoom + cy - viewOffset.y;
    return { gridX: Math.floor(wx / activeMap.cellSize), gridY: Math.floor(wy / activeMap.cellSize) };
  };

  const commitLayers = (nextLayers: MapLayer[], recordHistory: boolean) => {
    if (!activeMap) return;
    if (recordHistory) {
      setUndoStack((prev) => {
        const next = [...prev, cloneLayers(activeMap.layers)];
        return next.length > 100 ? next.slice(next.length - 100) : next;
      });
      setRedoStack([]);
    }
    updateMapField('layers', nextLayers);
  };

  const commitLayerObjects = (layerId: string, nextObjects: MapObject[], recordHistory: boolean) => {
    if (!activeMap) return;
    commitLayers(updateMapLayerObjects(activeMap.layers, layerId, nextObjects), recordHistory);
  };

  const handleUndo = () => {
    if (!activeMap || undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, cloneLayers(activeMap.layers)]);
    updateMapField('layers', previous);
  };

  const handleRedo = () => {
    if (!activeMap || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, cloneLayers(activeMap.layers)]);
    updateMapField('layers', next);
  };

  const applyTool = (x: number, y: number, recordHistory = false) => {
    if (!activeMap) return;
    if (!isWithinMapBoundsValue(x, y, activeMap)) return;
    if (selectedTool === 'picker') {
      const visibleLayers = [...sortedLayers].filter((layer) => layer.visible && layer.type !== 'background').reverse();
      const obj = visibleLayers.flatMap((layer) => layer.objects).find(o => mapObjectContainsCell(o, x, y));
      if (obj) {
        const a = paletteAssets.find(as => as.type === obj.type && (as.assetId ?? null) === (obj.assetId ?? null));
        if (a) {
          setActiveAsset(a);
          setSelectedTool('brush');
          if (obj.layerId) setActiveLayerId(obj.layerId);
          if (obj.assetId) {
            setTokenWidth(Math.max(1, obj.width ?? 1));
            setTokenHeight(Math.max(1, obj.height ?? 1));
            setTokenRotation(obj.rotation ?? 0);
            setTokenOpacity(obj.opacity ?? 1);
          }
        }
      }
      return;
    }
    if (!activeLayer || !activeLayerEditable) return;
    if ((selectedTool === 'brush' || selectedTool === 'fill') && !activeLayerCanUseAsset) return;
    if (selectedTool === 'brush') {
      const width = activeLayer.type === 'tokens' ? tokenWidth : 1;
      const height = activeLayer.type === 'tokens' ? tokenHeight : 1;
      if (x + width > activeMap.width || y + height > activeMap.height) return;
      const newObj: MapObject = {
        ...createMapObject(x, y, activeAsset, activeLayer, {
          width,
          height,
          rotation: activeLayer.type === 'tokens' ? tokenRotation : 0,
          opacity: activeLayer.type === 'tokens' ? tokenOpacity : 1
        })
      };
      const clean = activeLayer.objects.filter(o => !mapObjectContainsCell(o, x, y));
      const exist = activeLayer.objects.find(o => mapObjectContainsCell(o, x, y));
      if (
        exist?.type !== activeAsset.type ||
        (exist.assetId ?? null) !== (activeAsset.assetId ?? null) ||
        exist.width !== width ||
        exist.height !== height ||
        exist.rotation !== newObj.rotation ||
        exist.opacity !== newObj.opacity
      ) {
        commitLayerObjects(activeLayer.id, [...clean, newObj], recordHistory);
      }
    } else if (selectedTool === 'eraser') {
      const clean = activeLayer.objects.filter(o => !mapObjectContainsCell(o, x, y));
      if (clean.length !== activeLayer.objects.length) commitLayerObjects(activeLayer.id, clean, recordHistory);
    } else if (selectedTool === 'fill') {
        if(confirm('Fill active layer?')) {
            const objs: MapObject[] = []; for(let i=0; i<activeMap.width; i++) for(let j=0; j<activeMap.height; j++) objs.push(createMapObject(i, j, activeAsset, activeLayer));
            commitLayerObjects(activeLayer.id, objs, recordHistory);
        } setSelectedTool('brush');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const c = getMapCoordinates(e); if (!c || !activeMap) return; setIsDragging(true); setLastMousePos({ x: e.clientX, y: e.clientY });
    if (selectedTool === 'rect') {
      if (!activeLayerEditable || !activeLayerCanUseAsset) {
        setIsDragging(false);
        return;
      }
      const start = clampGridToMapBounds(c.gridX, c.gridY, activeMap);
      setRectStart(start);
      setRectEnd(start);
      return;
    }
    if (selectedTool !== 'pan' && c.gridX >= 0 && c.gridX < activeMap.width && c.gridY >= 0 && c.gridY < activeMap.height) applyTool(c.gridX, c.gridY, true);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    if (selectedTool === 'pan' || (e.buttons === 4)) { setViewOffset(p => ({ x: p.x + (e.clientX - lastMousePos.x) / zoom, y: p.y + (e.clientY - lastMousePos.y) / zoom })); setLastMousePos({ x: e.clientX, y: e.clientY }); return; }
    const c = getMapCoordinates(e); if (!c || !activeMap) return;
    if (selectedTool === 'rect' && rectStart) {
      setRectEnd(clampGridToMapBounds(c.gridX, c.gridY, activeMap));
      return;
    }
    if (selectedTool === 'brush' || selectedTool === 'eraser') applyTool(c.gridX, c.gridY, false);
  };

  const handleMouseUp = () => {
    if (selectedTool === 'rect' && activeMap && activeLayer && activeLayerEditable && activeLayerCanUseAsset && rectStart && rectEnd) {
      const minX = Math.min(rectStart.x, rectEnd.x);
      const minY = Math.min(rectStart.y, rectEnd.y);
      const maxX = Math.max(rectStart.x, rectEnd.x);
      const maxY = Math.max(rectStart.y, rectEnd.y);
      const keep = activeLayer.objects.filter((obj) => obj.x < minX || obj.x > maxX || obj.y < minY || obj.y > maxY);
      const rectObjects: MapObject[] = [];
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          rectObjects.push({
            ...createMapObject(x, y, activeAsset, activeLayer)
          });
        }
      }
      commitLayerObjects(activeLayer.id, [...keep, ...rectObjects], true);
    }
    setRectStart(null);
    setRectEnd(null);
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setRectStart(null);
    setRectEnd(null);
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    e.preventDefault();

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const cx = canvasRef.current.width / 2;
    const cy = canvasRef.current.height / 2;

    setZoom((prevZoom) => {
      const step = 0.1;
      const nextZoom = Math.max(0.2, Math.min(3, prevZoom + (e.deltaY < 0 ? step : -step)));
      if (nextZoom === prevZoom) return prevZoom;

      // Keep world position under the cursor stable while zooming.
      setViewOffset((prevOffset) => ({
        x: prevOffset.x + (mouseX - cx) * (1 / nextZoom - 1 / prevZoom),
        y: prevOffset.y + (mouseY - cy) * (1 / nextZoom - 1 / prevZoom),
      }));

      return nextZoom;
    });
  };

  const updateLayer = (layerId: string, patch: Partial<MapLayer>, recordHistory = false) => {
    if (!activeMap) return;
    commitLayers(activeMap.layers.map((layer) => layer.id === layerId ? { ...layer, ...patch } : layer), recordHistory);
  };

  const addLayer = (type: 'tiles' | 'tokens') => {
    if (!activeMap) return;
    const order = activeMap.layers.length;
    const nextLayer = createMapLayer(type, order, `${DEFAULT_LAYER_NAMES[type]} ${activeMap.layers.filter((layer) => layer.type === type).length + 1}`);
    commitLayers([...activeMap.layers, nextLayer], true);
    setActiveLayerId(nextLayer.id);
  };

  const removeLayer = (layerId: string) => {
    if (!activeMap) return;
    const layer = activeMap.layers.find((item) => item.id === layerId);
    if (!layer || layer.type === 'background') return;
    if (!confirm('Delete layer?')) return;
    const nextLayers = activeMap.layers.filter((item) => item.id !== layerId);
    commitLayers(nextLayers, true);
    setActiveLayerId(nextLayers.find((item) => item.type === layer.type)?.id ?? nextLayers[0]?.id ?? 'tiles');
  };

  const moveLayer = (layerId: string, direction: -1 | 1) => {
    if (!activeMap) return;
    const layers = [...activeMap.layers].sort((a, b) => a.order - b.order);
    const index = layers.findIndex((layer) => layer.id === layerId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= layers.length) return;
    [layers[index], layers[nextIndex]] = [layers[nextIndex], layers[index]];
    commitLayers(layers.map((layer, order) => ({ ...layer, order })), true);
  };

  const clearActiveLayer = () => {
    if (!activeLayer || activeLayer.type === 'background') return;
    commitLayerObjects(activeLayer.id, [], true);
  };

  const selectPaletteAsset = (asset: PaletteAsset) => {
    setActiveAsset(asset);
    setSelectedTool('brush');

    if (asset.assetId) {
      void setMapAssetUsage('map_token', asset.assetId);
      return;
    }

    const tileLayer = activeMap?.layers.find((layer) => layer.type === 'tiles' && layer.visible && !layer.locked)
      ?? activeMap?.layers.find((layer) => layer.type === 'tiles');
    if (tileLayer) setActiveLayerId(tileLayer.id);
  };

  const getLayerObjectCount = (layer: MapLayer): number => {
    if (layer.type === 'background') return effectiveBackgroundAssetId ? 1 : 0;
    return layer.objects.length;
  };

  const ToolButton = ({ tool, icon: Icon }: any) => (<button onClick={() => setSelectedTool(tool)} className={`w-9 h-9 flex items-center justify-center border transition-all ${selectedTool === tool ? 'bg-[var(--text-main)] text-[var(--bg-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Icon size={18} /></button>);
  const ActionButton = ({ onClick, icon: Icon }: any) => (<button onClick={onClick} className={`w-9 h-9 flex items-center justify-center border border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/10`}><Icon size={18} /></button>);

  const renderToolbar = () => {
    const vert = toolbarPosition === 'left' || toolbarPosition === 'right';
    return (
      <div className={`bg-[var(--bg-surface)] z-30 flex items-center gap-1 p-2 shrink-0 border-[var(--border-color)] overflow-x-auto scrollbar-hide ${vert ? 'flex-col w-14 border-y-0 py-4' : 'flex-row h-14 w-full border-x-0 px-4'} ${toolbarPosition === 'left' ? 'border-r' : toolbarPosition === 'right' ? 'border-l' : toolbarPosition === 'top' ? 'border-b' : 'border-t'}`}>
        <ToolButton tool="pan" icon={Hand} /> <ToolButton tool="select" icon={MousePointer2} />
        <div className={vert ? 'w-full h-[1px] bg-[var(--border-color)] my-1' : 'h-full w-[1px] bg-[var(--border-color)] mx-1'} />
        <ToolButton tool="brush" icon={Edit3} /> <ToolButton tool="rect" icon={Square} /> <ToolButton tool="fill" icon={PaintBucket} /> <ToolButton tool="eraser" icon={Eraser} /> <ToolButton tool="picker" icon={Pipette} />
        <div className={vert ? 'w-full h-[1px] bg-[var(--border-color)] my-1' : 'h-full w-[1px] bg-[var(--border-color)] mx-1'} />
        <ActionButton onClick={handleUndo} icon={Undo2} /> <ActionButton onClick={handleRedo} icon={Redo2} />
        <div className={vert ? 'w-full h-[1px] bg-[var(--border-color)] my-1' : 'h-full w-[1px] bg-[var(--border-color)] mx-1'} />
        <ActionButton onClick={() => handleZoom(-0.1)} icon={ZoomOut} /> <ActionButton onClick={() => handleZoom(0.1)} icon={ZoomIn} />
        <div className={`flex-1 ${vert ? '' : 'flex'}`} />
        <ActionButton onClick={clearActiveLayer} icon={Trash2} /> <ActionButton onClick={cycleToolbarPosition} icon={Layout} />
      </div>
    );
  };

  if (!activeId) {
    return (
      <div className="flex h-full w-full bg-[var(--bg-main)]">
        <div className="flex-1 flex flex-col min-w-0 bauhaus-bg relative border-r border-[var(--border-color)]">
           <div className="px-12 pt-12 pb-6 shrink-0 z-10">
             <div className="mx-auto w-full max-w-7xl">
               <SectionHeader title="КАРТОГРАФИЧЕСКИЙ ЦЕХ" subtitle="ПРОЕКТИРОВАНИЕ ЛОКАЦИЙ" accentColor={ACCENT_WHITE} />
             </div>
           </div>
           <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-70"><Button variant="secondary" color="white" onClick={handleCreateMap}><Plus size={16} /> СОЗДАТЬ КАРТУ</Button></div>
        </div>
        <div className="w-80 bg-[var(--bg-surface)] border-l-4 border-[var(--border-color)] flex flex-col p-8 space-y-10 z-10 overflow-y-auto">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-[var(--text-main)] glitch-text leading-none">АРХИВ КАРТ</h2>
          <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="НАЗВАНИЕ..." accentColor={ACCENT_WHITE}/>
          <TagFilter tags={tags} value={selectedTagFilter} onChange={setSelectedTagFilter} accentColor={ACCENT_WHITE} />
          <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-1">{filteredMaps.map(map => (<button key={map.id} onClick={() => setActiveId(map.id)} className="w-full text-left p-4 border border-[var(--border-color)] hover:border-[var(--text-main)] hover:bg-[var(--bg-main)] transition-all group relative bg-[var(--bg-surface)]"><div className="flex justify-between items-start"><div className="mono text-[11px] font-black uppercase text-[var(--text-main)] mb-2 group-hover:text-[var(--text-main)] transition-colors truncate pr-6">{map.name}</div></div><div className="flex justify-between items-center border-t border-[var(--border-color)] pt-2 mt-2"><span className="mono text-[9px] text-[var(--text-muted)]">{map.width}x{map.height}</span><div className="flex items-center gap-1 mono text-[9px] text-[var(--text-muted)]"><Grid size={10} /> {map.objects.length} OBJECTS</div></div><div className="absolute right-2 top-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-[var(--col-red)]" onClick={(e) => deleteMap(map.id, e)}><Trash2 size={12} /></div></button>))}</div>
        </div>
      </div>
    );
  }

  const isToolbarTop = toolbarPosition === 'top'; const isToolbarBottom = toolbarPosition === 'bottom';
  const isToolbarLeft = toolbarPosition === 'left'; const isToolbarRight = toolbarPosition === 'right';

  return (
    <div className="flex h-full w-full bg-[var(--bg-main)]">
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-main)] bauhaus-bg relative border-r border-[var(--border-color)]">
         <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center gap-6 bg-[var(--bg-main)] z-50 shrink-0">
             <button onClick={() => setActiveId(null)} className="w-10 h-10 flex items-center justify-center border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-main)] transition-all"><ArrowLeft size={20} /></button>
             <div className="h-8 w-[1px] bg-[var(--border-color)]" />
             <input value={activeMap?.name} onChange={e => updateMapField('name', e.target.value.toUpperCase())} className="bg-transparent border-b-2 border-transparent focus:border-[var(--text-main)] text-2xl font-black uppercase text-[var(--text-main)] focus:outline-none placeholder:text-[var(--text-muted)] flex-1" placeholder="НАЗВАНИЕ..." />
             <div className={`flex items-center gap-2 mono text-[10px] uppercase font-bold transition-colors ${autosaveState === 'saving' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}><RefreshCw size={12} className={autosaveState === 'saving' ? 'animate-spin' : ''} /> {autosaveState === 'saved' ? 'SAVED' : autosaveState === 'saving' ? 'SAVING...' : 'CHANGED'}</div>
         </div>
         <div className={`flex flex-1 w-full h-full overflow-hidden ${isToolbarTop || isToolbarBottom ? 'flex-col' : 'flex-row'}`}>
             {isToolbarTop && renderToolbar()} {isToolbarLeft && renderToolbar()}
             <div className="flex-1 bg-[#050505] relative overflow-hidden pattern-grid flex items-center justify-center"><canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onWheel={handleWheel} className="w-full h-full cursor-crosshair block" /></div>
             {isToolbarRight && renderToolbar()} {isToolbarBottom && renderToolbar()}
         </div>
      </div>
      <div className="w-80 bg-[var(--bg-surface)] border-l border-[var(--border-color)] flex flex-col z-10 shrink-0">
          <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-2 bg-[var(--bg-main)]"><Layers size={16} className="text-[var(--text-main)]"/><span className="mono text-[10px] uppercase font-black text-[var(--text-main)] tracking-widest">RESOURCES</span></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {activeMap && (
                <AssetCollectionTargetPicker
                  label="Наборы ассетов карты"
                  collections={assetCollections}
                  value={activeMapCollectionIds}
                  accentColor={ACCENT_WHITE}
                  onChange={(collectionIds) => onReplaceAssetCollections('map', activeMap.id, collectionIds)}
                />
              )}
              {activeMap && (
                <div className="border border-[var(--border-color)] bg-[var(--bg-main)]">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] px-3 py-2">
                    <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black block">Слои</label>
                    <div className="flex gap-1">
                      <button onClick={() => addLayer('tiles')} className="h-7 px-2 border border-[var(--border-color)] mono text-[8px] uppercase text-[var(--text-main)] hover:border-[var(--text-main)]">+ TILES</button>
                      <button onClick={() => addLayer('tokens')} className="h-7 px-2 border border-[var(--border-color)] mono text-[8px] uppercase text-[var(--text-main)] hover:border-[var(--text-main)]">+ TOKENS</button>
                    </div>
                  </div>

                  <div className="px-2">
                    {layerPanelLayers.map((layer) => {
                      const isActiveLayer = activeLayerId === layer.id;
                      const layerAsset = layer.type === 'background' && effectiveBackgroundAssetId ? assetById.get(effectiveBackgroundAssetId) : undefined;
                      return (
                        <div
                          key={layer.id}
                          className={`grid grid-cols-[28px_42px_1fr_28px] items-center gap-2 border-b py-2 px-1 transition-colors ${isActiveLayer ? 'border-[var(--text-main)] bg-[var(--text-main)]/10' : 'border-[var(--border-color)] hover:bg-[var(--bg-surface)]'}`}
                        >
                          <button onClick={() => updateLayer(layer.id, { visible: !layer.visible }, true)} className="h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)]">{layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                          <button
                            onClick={() => setActiveLayerId(layer.id)}
                            title={LAYER_TYPE_LABELS[layer.type]}
                            className={`h-9 w-10 border bg-center bg-cover ${isActiveLayer ? 'border-[var(--text-main)]' : 'border-[var(--border-color)]'}`}
                            style={{
                              backgroundImage: layerAsset?.url ? `url(${layerAsset.url})` : undefined,
                              backgroundColor: layerAsset?.url ? undefined : LAYER_TYPE_COLORS[layer.type]
                            }}
                          >
                            <span className="sr-only">Select layer</span>
                          </button>
                          <button onClick={() => setActiveLayerId(layer.id)} className="min-w-0 text-left">
                            <div className="mono text-[10px] uppercase font-black text-[var(--text-main)] truncate">{layer.name}</div>
                            <div className="mono text-[8px] uppercase text-[var(--text-muted)]">{DEFAULT_LAYER_NAMES[layer.type]} В· {getLayerObjectCount(layer)}</div>
                          </button>
                          <button onClick={() => updateLayer(layer.id, { locked: !layer.locked }, true)} className="h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)]">{layer.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                        </div>
                      );
                    })}
                  </div>

                  {activeLayer && (
                    <div className="space-y-3 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">Свойства слоя</span>
                        <div className="flex gap-2">
                          <button onClick={() => moveLayer(activeLayer.id, -1)} disabled={activeLayer.type === 'background'} className="text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30"><ArrowUp size={14} /></button>
                          <button onClick={() => moveLayer(activeLayer.id, 1)} disabled={activeLayer.type === 'background'} className="text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30"><ArrowDown size={14} /></button>
                          {activeLayer.type !== 'background' && <button onClick={() => removeLayer(activeLayer.id)} className="text-[var(--text-muted)] hover:text-[var(--col-red)]"><Trash2 size={14} /></button>}
                        </div>
                      </div>

                      {activeLayer.type === 'background' ? (
                        <AssetUsagePicker
                          label="Фон карты"
                          assets={assetsLibrary}
                          value={effectiveBackgroundAssetId}
                          allowedKinds={['background']}
                          collectionIds={activeMapCollectionIds}
                          accentColor={ACCENT_WHITE}
                          onChange={(assetId) => setMapAssetUsage('map_background', assetId)}
                        />
                      ) : (
                        <Input value={activeLayer.name} onChange={(event) => updateLayer(activeLayer.id, { name: event.target.value })} disabled={activeLayer.locked || !activeLayer.visible} accentColor={ACCENT_WHITE} className="h-8 text-[10px] uppercase" />
                      )}

                      <div className="grid grid-cols-[1fr_52px] gap-2 items-center">
                        <input type="range" min="0" max="1" step="0.05" value={activeLayer.opacity} onChange={(event) => updateLayer(activeLayer.id, { opacity: Number(event.target.value) })} disabled={activeLayer.locked} className="w-full disabled:opacity-40" />
                        <span className="mono text-[8px] text-[var(--text-muted)] text-right">{Math.round(activeLayer.opacity * 100)}%</span>
                      </div>

                      {activeLayerAssetKind && (
                        <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="mono text-[8px] uppercase font-black text-[var(--text-muted)]">Наборы слоя</span>
                            <span className="mono text-[8px] uppercase font-black text-[var(--text-main)]">
                              {activeLayerLibraryAssetCount}
                            </span>
                          </div>
                          {activeMapCollections.length > 0 ? (
                            <div className="space-y-1">
                              {activeLayerSetSummaries.map(({ collection, count }) => (
                                <div key={collection.id} className="flex items-center justify-between gap-2 mono text-[8px] uppercase">
                                  <span className="truncate text-[var(--text-main)]">{collection.name}</span>
                                  <span className={count > 0 ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}>{count}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mono text-[8px] uppercase leading-relaxed text-[var(--text-muted)]">
                              Наборы не подключены. Слой использует все подходящие ассеты.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeLayerNotice && (
                    <div className="mx-3 mb-3 border border-dashed border-[var(--border-color)] p-3 mono text-[9px] uppercase text-[var(--text-muted)]">
                      {activeLayerNotice}
                    </div>
                  )}
                </div>
              )}
              {activeLayer && activeLayer.type !== 'background' && (
                <div className="space-y-3">
                  <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black block">{activeLayerPaletteLabel}</label>
                  {activeLayerPaletteAssets.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {activeLayerPaletteAssets.map(asset => (
                        <button key={`${asset.type}:${asset.assetId ?? ''}`} disabled={!activeLayerEditable} onClick={() => selectPaletteAsset(asset)} className={`flex flex-col items-center justify-center p-3 border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${activeLayerEditable ? 'hover:scale-105 active:scale-95' : ''} ${(activeAsset.type === asset.type && (activeAsset.assetId ?? null) === (asset.assetId ?? null)) ? 'border-[var(--text-main)] bg-[var(--text-main)]/10' : 'border-[var(--border-color)] hover:border-[var(--border-color-hover)]'}`}>
                          <div className="w-10 h-10 mb-2 border border-[var(--border-color)] bg-center bg-cover" style={{ backgroundColor: asset.color, backgroundImage: asset.imageUrl ? `url(${asset.imageUrl})` : undefined }} />
                          <span className="mono text-[9px] uppercase font-bold text-[var(--text-main)] truncate max-w-full">{asset.label}</span>
                          <span className="mono text-[7px] uppercase text-[var(--text-muted)] truncate max-w-full">{asset.sourceLabel}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-[var(--border-color)] p-4 mono text-[9px] uppercase text-[var(--text-muted)]">
                      {activeLayer.type === 'tiles' ? 'NO TILES AVAILABLE FOR SELECTED COLLECTIONS' : 'NO TOKENS AVAILABLE FOR SELECTED COLLECTIONS'}
                    </div>
                  )}
                </div>
              )}
              {activeMap && activeLayer?.type === 'tokens' && (
                <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
                  <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black block">TOKEN SETTINGS</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="mono text-[8px] text-[var(--text-muted)] block mb-1 uppercase">WIDTH</label><Input type="number" min={1} max={12} value={tokenWidth} onChange={(event) => setTokenWidth(Math.max(1, Number(event.target.value) || 1))} accentColor={ACCENT_WHITE} className="text-center font-bold" /></div>
                    <div><label className="mono text-[8px] text-[var(--text-muted)] block mb-1 uppercase">HEIGHT</label><Input type="number" min={1} max={12} value={tokenHeight} onChange={(event) => setTokenHeight(Math.max(1, Number(event.target.value) || 1))} accentColor={ACCENT_WHITE} className="text-center font-bold" /></div>
                    <div><label className="mono text-[8px] text-[var(--text-muted)] block mb-1 uppercase">ROTATION</label><Input type="number" value={tokenRotation} onChange={(event) => setTokenRotation(Number(event.target.value) || 0)} accentColor={ACCENT_WHITE} className="text-center font-bold" /></div>
                    <div><label className="mono text-[8px] text-[var(--text-muted)] block mb-1 uppercase">OPACITY</label><Input type="number" min={0} max={1} step={0.05} value={tokenOpacity} onChange={(event) => setTokenOpacity(Math.max(0, Math.min(1, Number(event.target.value) || 0)))} accentColor={ACCENT_WHITE} className="text-center font-bold" /></div>
                  </div>
                </div>
              )}
              {activeMap && (
                <TagPicker
                  allTags={tags}
                  selectedTags={activeMapTags}
                  accentColor={ACCENT_WHITE}
                  onReplaceTags={(tagIds, newTags) => onReplaceTargetTags('map', activeMap.id, tagIds, newTags)}
                  onUpdateTag={onUpdateTag}
                  onDeleteTag={onDeleteTag}
                />
              )}
              {activeMap && (
                <EntityLinksPanel
                  sourceType="map"
                  sourceId={activeMap.id}
                  links={activeMapEntityLinks.filter((link) => !isAssetUsageLink(link))}
                  scenarios={scenarios}
                  maps={data}
                  characters={characters}
                  items={items}
                  assets={assetsLibrary}
                  locations={locations}
                  factions={factions}
                  events={events}
                  accentColor={ACCENT_WHITE}
                  onCreateLink={onCreateMaterialLink}
                  onUpdateLink={onUpdateMaterialLink}
                  onDeleteLink={onDeleteMaterialLink}
                  onOpenLink={onOpenMaterialLink}
                />
              )}
              {activeMap && (
                <PublicationPanel
                  targetType="map"
                  targetId={activeMap.id}
                  publication={publicationAssignments[publicationAssignmentKey('map', activeMap.id)]}
                  accentColor={ACCENT_WHITE}
                  onUpsertPublication={onUpsertPublication}
                  onUpdatePublication={onUpdatePublication}
                  onDeletePublication={onDeletePublication}
                />
              )}
              <div className="space-y-4 pt-6 border-t border-[var(--border-color)]"><label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black block flex items-center gap-2"><Maximize size={10} /> MAP SIZE</label><div className="grid grid-cols-2 gap-4"><div><label className="mono text-[8px] text-[var(--text-muted)] block mb-1 uppercase">WIDTH</label><Input type="number" value={activeMap?.width} onChange={e => updateMapField('width', parseInt(e.target.value) || 20)} accentColor={ACCENT_WHITE} className="text-center font-bold"/></div><div><label className="mono text-[8px] text-[var(--text-muted)] block mb-1 uppercase">HEIGHT</label><Input type="number" value={activeMap?.height} onChange={e => updateMapField('height', parseInt(e.target.value) || 15)} accentColor={ACCENT_WHITE} className="text-center font-bold"/></div></div></div>
          </div>
      </div>
    </div>
  );
};

export default MapEditor;
