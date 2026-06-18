
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
  SystemTile,
  Tag,
  TagAssignmentMap,
  TaggableTargetType,
  WorldEvent,
  WorldLocation
} from '../types';
import { apiRequest, exportMapPdf } from '../lib/api';
import { assetCollectionAssignmentKey, entityLinkAssignmentKey, mapMapFromApi, publicationAssignmentKey, tagAssignmentKey } from '../lib/mappers';
import { buildAssetUsagePayload, findAssetUsageLink, isAssetUsageLink } from '../lib/assetUsage';
import { drawMapContent, isWithinMapBoundsValue, sanitizeMapObjects } from '../lib/mapRendering';
import { listSystemTiles } from '../lib/systemTileApi';
import { TagFilter } from './TagPicker';
import { AssetUsagePicker } from './AssetUsagePicker';
import { EditorShell } from './EditorShell';
import { EditorToolbar, EditorToolbarPosition, createEditorToolbarUtilityGroup, getNextEditorToolbarPosition } from './EditorToolbar';
import { Modal } from './Modal';
import { MapSettingsPanel, MapPdfOrientation, MapPdfPageSize } from './map/MapSettingsPanel';
import { MapThumbnail } from './map/MapThumbnail';
import {
  EntityLibraryCard,
  EntityLibraryContextMenu,
  EntityLibraryMediaSlot,
  EntityLibraryWorkspace,
  type EntityLibraryActionSection,
  useEntityLibraryContextMenu,
  useEntityLibraryKeyboard,
  useEntityLibrarySelection
} from './entityLibrary';
import {
  EditorCanvasSize,
  EditorMinimapItem,
  EditorViewportControls,
} from './EditorViewportControls';
import { useEditorViewport } from '../hooks/useEditorViewport';
import { 
  Plus, Trash2, ArrowLeft, RefreshCw, Grid, Eraser, 
  MousePointer2, Edit3, Layers, Settings,
  Hand, PaintBucket, Square, Pipette, Undo2, Redo2,
  Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown
} from 'lucide-react';

const ACCENT_WHITE = 'var(--col-white)';
const MIN_MAP_ZOOM = 0.2;
const MAX_MAP_ZOOM = 3;
const MAP_FIT_PADDING = 0.9;
type ToolbarPosition = EditorToolbarPosition;
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
  background: 'ФОН',
  tiles: 'ТАЙЛЫ',
  tokens: 'ТОКЕНЫ'
};

const LAYER_TYPE_LABELS: Record<MapLayerType, string> = {
  background: 'ФОН',
  tiles: 'ТАЙЛЫ',
  tokens: 'ТОКЕНЫ'
};

const LAYER_TYPE_COLORS: Record<MapLayerType, string> = {
  background: '#2f2f2f',
  tiles: '#9aa0a6',
  tokens: '#2a9d8f'
};

const clampMapZoom = (value: number): number => Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, value));

const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 100000).toString(36)}`;
};

const formatLibraryDate = (value?: string): string => value ? value.split('T')[0] : '-';

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

const PENDING_TILE_ASSET: PaletteAsset = {
  type: 'system:pending',
  label: '',
  color: '#9aa0a6'
};

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
  onDeleteMaterialLink,
  onUpsertPublication,
  onUpdatePublication,
  onDeletePublication,
  onReplaceAssetCollections,
  initialMapId
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [autosaveState, setAutosaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [selectedTool, setSelectedTool] = useState<ToolType>('pan');
  const [activeAsset, setActiveAsset] = useState<PaletteAsset>(PENDING_TILE_ASSET);
  const [systemTiles, setSystemTiles] = useState<SystemTile[]>([]);
  const [activeLayerId, setActiveLayerId] = useState('tiles');
  const [tokenWidth, setTokenWidth] = useState(1);
  const [tokenHeight, setTokenHeight] = useState(1);
  const [tokenRotation, setTokenRotation] = useState(0);
  const [tokenOpacity, setTokenOpacity] = useState(1);
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>('left');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapPdfPageSize, setMapPdfPageSize] = useState<MapPdfPageSize>('a4');
  const [mapPdfOrientation, setMapPdfOrientation] = useState<MapPdfOrientation>('landscape');
  const [imageRevision, setImageRevision] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = useState<MapLayer[][]>([]);
  const [redoStack, setRedoStack] = useState<MapLayer[][]>([]);
  const [rectStart, setRectStart] = useState<GridPoint | null>(null);
  const [rectEnd, setRectEnd] = useState<GridPoint | null>(null);
  const initialMapAppliedRef = useRef<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapLibrarySelection = useEntityLibrarySelection({ mode: 'multi' });
  const mapLibraryContextMenu = useEntityLibraryContextMenu();

  useEffect(() => {
    let cancelled = false;

    void listSystemTiles()
      .then((tiles) => {
        if (cancelled) return;

        setSystemTiles(tiles);
        setActiveAsset((current) => {
          if (current.type !== PENDING_TILE_ASSET.type || tiles.length === 0) {
            return current;
          }

          const tile = tiles[0];

          return {
            type: tile.category,
            label: tile.name,
            color: tile.color,
            assetId: tile.id,
            imageUrl: tile.url,
            sourceLabel: tile.setName
          };
        });
      })
      .catch((error) => {
        console.error('Failed to load system tiles', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeMap = data.find(m => m.id === activeId);
  const activeMapId = activeMap?.id ?? null;
  const sortedLayers = useMemo(
    () => [...(activeMap?.layers ?? [])].sort((a, b) => a.order - b.order),
    [activeMap?.layers]
  );
  const layerPanelLayers = [...sortedLayers].reverse();
  const activeLayer = sortedLayers.find((layer) => layer.id === activeLayerId) ?? sortedLayers.find((layer) => layer.type === 'tiles');
  const activeLayerEditable = Boolean(activeLayer && activeLayer.visible && !activeLayer.locked && activeLayer.type !== 'background');
  const activeMapTags = activeMap ? tagAssignments[tagAssignmentKey('map', activeMap.id)] ?? [] : [];
  const activeMapEntityLinks = useMemo(
    () => activeMapId ? entityLinks[entityLinkAssignmentKey('map', activeMapId)] ?? [] : [],
    [activeMapId, entityLinks]
  );
  const activeMapMaterialLinks = useMemo(
    () => activeMapEntityLinks.filter((link) => !isAssetUsageLink(link)),
    [activeMapEntityLinks]
  );
  const activeMapScenarioLinks = useMemo(
    () => {
      if (!activeMapId) return [];

      return scenarios.flatMap((scenario) =>
        (entityLinks[entityLinkAssignmentKey('scenario', scenario.id)] ?? []).filter((link) =>
          link.targetType === 'map' &&
          link.targetId === activeMapId &&
          link.relationType === 'uses'
        )
      );
    },
    [activeMapId, entityLinks, scenarios]
  );
  const activeMapCollectionIds = useMemo(
    () => activeMap
      ? (assetCollectionAssignments[assetCollectionAssignmentKey('map', activeMap.id)] ?? []).map((collection) => collection.id)
      : [],
    [activeMap, assetCollectionAssignments]
  );
  const effectiveBackgroundAssetId = activeMap?.backgroundAssetId ?? findAssetUsageLink(activeMapEntityLinks, 'map_background')?.targetId ?? null;
  const filteredMaps = useMemo(() => data.filter((map) => {
    const matchesSearch = map.name.toLowerCase().includes(searchQuery.toLowerCase());
    const assignedTags = tagAssignments[tagAssignmentKey('map', map.id)] ?? [];
    const matchesTag = !selectedTagFilter || assignedTags.some((tag) => tag.id === selectedTagFilter);
    return matchesSearch && matchesTag;
  }), [data, searchQuery, selectedTagFilter, tagAssignments]);
  const visibleMapIds = useMemo(() => filteredMaps.map((map) => map.id), [filteredMaps]);
  const visibleMapIdKey = visibleMapIds.join('|');
  const mapCanvasSize = useMemo<EditorCanvasSize>(
    () => activeMap
      ? { width: activeMap.width * activeMap.cellSize, height: activeMap.height * activeMap.cellSize }
      : { width: 0, height: 0 },
    [activeMap]
  );
  const {
    viewport,
    containerSize,
    screenToCanvasPoint,
    centerOnCanvasPoint,
    zoomToScale,
    fitToView,
    panBy,
    resetViewport
  } = useEditorViewport({
    containerRef: canvasContainerRef,
    canvasSize: mapCanvasSize,
    minScale: MIN_MAP_ZOOM,
    maxScale: MAX_MAP_ZOOM,
    fitScaleMultiplier: MAP_FIT_PADDING
  });
  const mapMinimapItems = useMemo<EditorMinimapItem[]>(() => {
    if (!activeMap) return [];

    return sortedLayers
      .filter((layer) => layer.visible && layer.type !== 'background')
      .flatMap((layer) => sanitizeMapObjects(layer.objects, activeMap).map((object) => ({
        id: `${layer.id}-${object.id}`,
        x: object.x * activeMap.cellSize,
        y: object.y * activeMap.cellSize,
        width: Math.max(1, object.width ?? 1) * activeMap.cellSize,
        height: Math.max(1, object.height ?? 1) * activeMap.cellSize,
        color: object.color || LAYER_TYPE_COLORS[layer.type]
      })));
  }, [activeMap, sortedLayers]);

  const systemTileAssets = useMemo<Asset[]>(
    () => systemTiles.map((tile) => ({
      id: tile.id,
      userId: 'system',
      type: 'image',
      kind: 'tile',
      folderId: null,
      collectionIds: [],
      name: tile.name,
      path: null,
      url: tile.url,
      mimeType: 'image/png',
      size: null,
      metadata: {
        readonly: true,
        system: true,
        category: tile.category,
        setName: tile.setName
      }
    })),
    [systemTiles]
  );
  const assetById = useMemo(
    () => new globalThis.Map([...assetsLibrary, ...systemTileAssets].map((asset) => [asset.id, asset])),
    [assetsLibrary, systemTileAssets]
  );
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
      ...systemTiles.map((tile) => ({
        type: tile.category,
        label: tile.name,
        color: tile.color,
        assetId: tile.id,
        imageUrl: tile.url,
        sourceLabel: tile.setName
      })),
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
    [activeMapCollectionIds.length, getAssetSourceSetNames, mapScopedAssets, systemTiles]
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
    ? 'ПАЛИТРА ТАЙЛОВ'
    : activeLayer?.type === 'tokens'
      ? 'ПАЛИТРА ТОКЕНОВ'
      : '';
  const activeLayerCanUseAsset = Boolean(
    activeLayerEditable &&
    activeLayerPaletteAssets.some((asset) =>
      asset.type === activeAsset.type && (asset.assetId ?? null) === (activeAsset.assetId ?? null)
    )
  );
  const activeLayerNotice = activeLayer
    ? activeLayer.locked
      ? 'СЛОЙ ЗАБЛОКИРОВАН: РЕДАКТИРОВАНИЕ ОТКЛЮЧЕНО'
      : !activeLayer.visible
        ? 'СЛОЙ СКРЫТ: РЕДАКТИРОВАНИЕ ОТКЛЮЧЕНО'
        : activeLayer.type === 'background'
          ? 'ФОНОВЫЙ СЛОЙ НЕ РИСУЕТСЯ. ВЫБЕРИТЕ ФОНОВЫЙ АССЕТ В СВОЙСТВАХ СЛОЯ.'
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
      resetViewport();
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
            data: serializeMapData(nextMap)
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

  const openMapById = (id: string) => {
    setActiveId(id);
    mapLibraryContextMenu.closeContextMenu();
  };

  const deleteMapById = async (id: string) => {
    if (!confirm('Удалить карту?')) return;
    try {
      await apiRequest(`/maps/${id}`, { method: 'DELETE' });
      onUpdate(data.filter(m => m.id !== id));
      if (activeId === id) setActiveId(null);
      mapLibrarySelection.clearSelection();
    } catch {
      // ignore
    }
  };

  const deleteMap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteMapById(id);
  };

  const handleExportMapPdf = async () => {
    if (!activeMap) return;

    try {
      const blob = await exportMapPdf(activeMap.id, {
        pageSize: mapPdfPageSize,
        orientation: mapPdfOrientation
      });
      if (!blob) return;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeMap.name || 'map'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const getMapLibraryContextSections = (): EntityLibraryActionSection[] => {
    const context = mapLibraryContextMenu.contextMenu;
    if (!context) return [];

    if (context.kind === 'workspace') {
      return [
        {
          actions: [
            {
              id: 'create-map',
              label: 'Создать карту',
              icon: <Plus size={13} />,
              onSelect: () => void handleCreateMap()
            }
          ]
        }
      ];
    }

    if (context.kind !== 'item') return [];

    return [
      {
        actions: [
          {
            id: 'open-map',
            label: 'Открыть',
            icon: <Grid size={13} />,
            onSelect: () => openMapById(context.itemId)
          }
        ]
      },
      {
        actions: [
          {
            id: 'delete-map',
            label: 'Удалить',
            icon: <Trash2 size={13} />,
            destructive: true,
            onSelect: () => void deleteMapById(context.itemId)
          }
        ]
      }
    ];
  };

  useEntityLibraryKeyboard({
    enabled: !activeId,
    contextMenuOpen: Boolean(mapLibraryContextMenu.contextMenu),
    onCloseContextMenu: mapLibraryContextMenu.closeContextMenu,
    selectedIds: mapLibrarySelection.selectedIds,
    onClearSelection: mapLibrarySelection.clearSelection,
    onOpenSelected: (mapId) => openMapById(mapId),
    onDeleteSelected: (mapId) => void deleteMapById(mapId)
  });

  const cycleToolbarPosition = () => setToolbarPosition((current) => getNextEditorToolbarPosition(current));
  const handleZoom = (delta: number) => { zoomToScale(clampMapZoom(viewport.scale + delta)); };
  const clampGridToMapBounds = (x: number, y: number, map: MapData): GridPoint => ({
    x: Math.min(map.width - 1, Math.max(0, x)),
    y: Math.min(map.height - 1, Math.max(0, y)),
  });

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeMap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parent = canvasContainerRef.current ?? canvas.parentElement;
    if (parent) {
      const nextWidth = parent.clientWidth;
      const nextHeight = parent.clientHeight;
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(viewport.offsetX, viewport.offsetY);
    ctx.scale(viewport.scale, viewport.scale);
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
    drawMapContent({
      ctx,
      map: activeMap,
      layers: sortedLayers,
      assetById,
      backgroundAssetId: effectiveBackgroundAssetId,
      getImage: getCanvasImage,
      drawBorder: false
    });
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
  }, [
    activeAsset.color,
    activeMap,
    assetById,
    effectiveBackgroundAssetId,
    rectEnd,
    rectStart,
    selectedTool,
    sortedLayers,
    viewport.offsetX,
    viewport.offsetY,
    viewport.scale
  ]);

  useEffect(() => {
    if (activeId) {
      drawMap();
      window.addEventListener('resize', drawMap);
      return () => window.removeEventListener('resize', drawMap);
    }
  }, [activeId, containerSize.height, containerSize.width, drawMap, imageRevision]);

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
    resetViewport();
  }, [initialMapId, data, resetViewport]);

  useEffect(() => {
    if (activeId) return;
    mapLibrarySelection.pruneSelection(visibleMapIds);
  }, [activeId, mapLibrarySelection, visibleMapIdKey, visibleMapIds]);

  const getMapCoordinates = (e: React.MouseEvent) => {
    if (!activeMap) return null;
    const point = screenToCanvasPoint(e.clientX, e.clientY);
    const wx = point.x; const wy = point.y;
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
        if(confirm('Заполнить активный слой?')) {
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
    if (selectedTool === 'pan' || (e.buttons === 4)) { panBy(e.clientX - lastMousePos.x, e.clientY - lastMousePos.y); setLastMousePos({ x: e.clientX, y: e.clientY }); return; }
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
    e.preventDefault();

    const step = 0.1;
    const nextZoom = clampMapZoom(viewport.scale + (e.deltaY < 0 ? step : -step));
    if (nextZoom === viewport.scale) return;

    zoomToScale(nextZoom, { x: e.clientX, y: e.clientY });
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
    if (!confirm('Удалить слой?')) return;
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

  const handleToolbarAction = (action: string) => {
    if (action === 'pan' || action === 'select' || action === 'brush' || action === 'rect' || action === 'fill' || action === 'eraser' || action === 'picker') {
      setSelectedTool(action);
      return;
    }

    if (action === 'undo') {
      handleUndo();
      return;
    }

    if (action === 'redo') {
      handleRedo();
      return;
    }

    if (action === 'clear-layer') {
      clearActiveLayer();
      return;
    }

    if (action === 'toolbar-position') {
      cycleToolbarPosition();
    }
  };

  const selectPaletteAsset = (asset: PaletteAsset) => {
    setActiveAsset(asset);
    setSelectedTool('brush');

    const selectedLibraryAsset = asset.assetId ? assetById.get(asset.assetId) : undefined;

    if (selectedLibraryAsset?.kind === 'token' && asset.assetId) {
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

  const renderToolbar = () => {
    return (
      <EditorToolbar
        position={toolbarPosition}
        onAction={handleToolbarAction}
        groups={[
          {
            id: 'navigation',
            items: [
              { id: 'pan', icon: Hand, title: 'Перемещение', active: selectedTool === 'pan' },
              { id: 'select', icon: MousePointer2, title: 'Выбор', active: selectedTool === 'select' }
            ]
          },
          {
            id: 'paint',
            items: [
              { id: 'brush', icon: Edit3, title: 'Кисть', active: selectedTool === 'brush' },
              { id: 'rect', icon: Square, title: 'Прямоугольник', active: selectedTool === 'rect' },
              { id: 'fill', icon: PaintBucket, title: 'Заливка', active: selectedTool === 'fill' },
              { id: 'eraser', icon: Eraser, title: 'Ластик', active: selectedTool === 'eraser' },
              { id: 'picker', icon: Pipette, title: 'Пипетка', active: selectedTool === 'picker' }
            ]
          },
          {
            id: 'history',
            items: [
              { id: 'undo', icon: Undo2, title: 'Отменить' },
              { id: 'redo', icon: Redo2, title: 'Повторить' }
            ]
          },
          ...createEditorToolbarUtilityGroup({
            delete: { action: 'clear-layer', title: 'Очистить активный слой' },
            position: { action: 'toolbar-position', title: 'Положение панели' }
          })
        ]}
      />
    );
  };

  if (!activeId) {
    const isMapLibraryFilteredEmpty = data.length > 0 && filteredMaps.length === 0;
    const mapLibraryEmptyTitle = data.length === 0
      ? 'Карт пока нет'
      : isMapLibraryFilteredEmpty
        ? 'Ничего не найдено'
        : 'Карт пока нет';
    const mapLibraryEmptyDescription = data.length === 0
      ? 'Чтобы создать карту, нажмите правой кнопкой мыши по этой области или используйте кнопку создания.'
      : isMapLibraryFilteredEmpty
        ? 'Попробуйте изменить строку поиска или выбранный тег.'
        : 'Чтобы создать карту, нажмите правой кнопкой мыши по этой области или используйте кнопку создания.';

    return (
      <div className="flex h-full w-full flex-col bg-[var(--bg-main)] bauhaus-bg">
        <div className="shrink-0 px-8 pb-5 pt-7">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <SectionHeader
              title="Картографический цех"
              subtitle="Проектирование локаций"
              accentColor={ACCENT_WHITE}
            />
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-[260px] flex-1">
                <SearchInput
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Название..."
                  accentColor={ACCENT_WHITE}
                />
              </div>
              <div className="min-w-[220px]">
                <TagFilter
                  tags={tags}
                  value={selectedTagFilter}
                  onChange={setSelectedTagFilter}
                  accentColor={ACCENT_WHITE}
                />
              </div>
              <div className="flex-1" />
              <Button variant="secondary" color="white" onClick={handleCreateMap}>
                <Plus size={16} /> Создать карту
              </Button>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 px-8 pb-8 pt-3">
          <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
            <EntityLibraryWorkspace<MapData>
              items={filteredMaps}
              getItemId={(map) => map.id}
              selectedIds={mapLibrarySelection.selectedIds}
              surface="transparent"
              framed
              className="min-h-[420px] flex-1"
              gridClassName=""
              onSelectItem={(mapId, _map, event) => mapLibrarySelection.selectFromEvent(mapId, event, visibleMapIds)}
              onOpenItem={(mapId) => openMapById(mapId)}
              onClearSelection={mapLibrarySelection.clearSelection}
              onWorkspaceContextMenu={(context) => {
                mapLibraryContextMenu.setContextMenu(context);
              }}
              onItemContextMenu={(mapId, _map, event) => {
                if (!mapLibrarySelection.isSelected(mapId)) mapLibrarySelection.replaceSelection(mapId);
                mapLibraryContextMenu.openItemMenu(event, mapId, null);
              }}
              renderItem={(map, state) => {
                const dateLabel = formatLibraryDate(map.updatedAt ?? map.createdAt);
                const mapEntityLinks = entityLinks[entityLinkAssignmentKey('map', map.id)] ?? [];
                const thumbnailBackgroundAssetId = map.backgroundAssetId ?? findAssetUsageLink(mapEntityLinks, 'map_background')?.targetId ?? null;
                return (
                  <EntityLibraryCard
                    title={map.name}
                    accentColor={ACCENT_WHITE}
                    selected={state.selected}
                    cut={state.cut}
                    dragging={state.dragging}
                    headerExtra={
                      <button
                        type="button"
                        onClick={(event) => deleteMap(map.id, event)}
                        className="p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--col-red)]"
                        title="Удалить карту"
                        aria-label="Удалить карту"
                      >
                        <Trash2 size={14} />
                      </button>
                    }
                  >
                    <div className="flex flex-col gap-5">
                      <div className="space-y-4">
                        <EntityLibraryMediaSlot
                          emptyLabel="МИНИАТЮРА КАРТЫ"
                          accentColor={ACCENT_WHITE}
                        >
                          <MapThumbnail
                            map={map}
                            assetById={assetById}
                            backgroundAssetId={thumbnailBackgroundAssetId}
                          />
                        </EntityLibraryMediaSlot>
                        <div className="flex items-center gap-2 mono text-[10px] uppercase font-black text-[var(--text-main)]">
                          <Grid size={13} />
                          <span>{map.width} x {map.height}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="border border-[var(--border-color)] bg-[var(--bg-main)]/30 px-3 py-2">
                            <div className="mono text-[8px] uppercase font-black text-[var(--text-muted)]">Объекты</div>
                            <div className="mono text-lg font-black text-[var(--text-main)]">{map.objects.length}</div>
                          </div>
                          <div className="border border-[var(--border-color)] bg-[var(--bg-main)]/30 px-3 py-2">
                            <div className="mono text-[8px] uppercase font-black text-[var(--text-muted)]">Слои</div>
                            <div className="mono text-lg font-black text-[var(--text-main)]">{map.layers.length}</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
                        <div className="flex items-center justify-between gap-3 mono text-[9px] uppercase text-[var(--text-muted)]">
                          <span>{dateLabel}</span>
                          <span className="font-black text-[var(--text-main)]">MAP</span>
                        </div>
                      </div>
                    </div>
                  </EntityLibraryCard>
                );
              }}
              emptyTitle={mapLibraryEmptyTitle}
              emptyDescription={mapLibraryEmptyDescription}
              emptyAction={
                isMapLibraryFilteredEmpty ? null : (
                  <Button variant="secondary" color="white" onClick={handleCreateMap}>
                    <Plus size={16} /> Создать карту
                  </Button>
                )
              }
            />
            <EntityLibraryContextMenu
              context={mapLibraryContextMenu.contextMenu}
              sections={getMapLibraryContextSections()}
              onClose={mapLibraryContextMenu.closeContextMenu}
              accentColor={ACCENT_WHITE}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <EditorShell
      className="min-h-0"
      header={(
        <div className="flex shrink-0 items-center gap-6 border-b border-[var(--border-color)] bg-[var(--bg-main)] px-6 py-4">
             <button
               onClick={() => {
                 setSettingsOpen(false);
                 setActiveId(null);
               }}
               className="flex h-10 w-10 items-center justify-center border border-[var(--border-color)] text-[var(--text-muted)] transition-all hover:border-[var(--text-main)] hover:text-[var(--text-main)]"
               title="Назад"
             >
               <ArrowLeft size={20} />
             </button>
             <div className="h-8 w-px bg-[var(--border-color)]" />
             <input value={activeMap?.name} onChange={e => updateMapField('name', e.target.value.toUpperCase())} className="min-w-0 flex-1 border-b-2 border-transparent bg-transparent text-2xl font-black uppercase text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--text-main)] focus:outline-none" placeholder="НАЗВАНИЕ..." />
             <div className={`mono flex items-center gap-2 text-[10px] font-bold uppercase transition-colors ${autosaveState === 'saving' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}><RefreshCw size={12} className={autosaveState === 'saving' ? 'animate-spin' : ''} /> {autosaveState === 'saved' ? 'СОХРАНЕНО' : autosaveState === 'saving' ? 'СОХРАНЕНИЕ...' : 'ИЗМЕНЕНО'}</div>
             <Button variant="secondary" inverted onClick={() => setSettingsOpen(true)} className="h-10">
               <Settings size={14} />
               Параметры
             </Button>
        </div>
      )}
      toolbar={renderToolbar()}
      toolbarPosition={toolbarPosition}
      canvasClassName="bg-[#050505]"
      canvas={(
        <div ref={canvasContainerRef} className="h-full w-full bg-[#050505] relative overflow-hidden pattern-grid flex items-center justify-center">
               <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onWheel={handleWheel} className="w-full h-full cursor-crosshair block" />
               {activeMap && mapCanvasSize.width > 0 && mapCanvasSize.height > 0 && (
                 <EditorViewportControls
                   viewport={viewport}
                   canvasSize={mapCanvasSize}
                   containerSize={containerSize}
                   items={mapMinimapItems}
                   minScale={MIN_MAP_ZOOM}
                   maxScale={MAX_MAP_ZOOM}
                   minimapLabel="Карта"
                   fitLabel="ВПИСАТЬ"
                   fitTitle="Вписать карту"
                   onCenterViewport={centerOnCanvasPoint}
                   onZoomOut={() => handleZoom(-0.1)}
                   onZoomIn={() => handleZoom(0.1)}
                   onFitView={fitToView}
                 />
               )}
        </div>
      )}
      rightPanelConfig={{ placement: 'body', width: '20rem', scroll: false }}
      rightPanel={(
        <div className="flex h-full min-h-0 flex-col">
          <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-2 bg-[var(--bg-main)]"><Layers size={16} className="text-[var(--text-main)]"/><span className="mono text-[10px] uppercase font-black text-[var(--text-main)] tracking-widest">РЕСУРСЫ</span></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {activeMap && (
                <div className="border border-[var(--border-color)] bg-[var(--bg-main)]">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] px-3 py-2">
                    <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black block">Слои</label>
                    <div className="flex gap-1">
                      <button onClick={() => addLayer('tiles')} className="h-7 px-2 border border-[var(--border-color)] mono text-[8px] uppercase text-[var(--text-main)] hover:border-[var(--text-main)]">+ ТАЙЛЫ</button>
                      <button onClick={() => addLayer('tokens')} className="h-7 px-2 border border-[var(--border-color)] mono text-[8px] uppercase text-[var(--text-main)] hover:border-[var(--text-main)]">+ ТОКЕНЫ</button>
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
                            <span className="sr-only">Выбрать слой</span>
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
                      {activeLayer.type === 'tiles' ? 'НЕТ ТАЙЛОВ ДЛЯ ВЫБРАННЫХ НАБОРОВ' : 'НЕТ ТОКЕНОВ ДЛЯ ВЫБРАННЫХ НАБОРОВ'}
                    </div>
                  )}
                </div>
              )}
              {activeMap && activeLayer?.type === 'tokens' && (
                <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
                  <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black block">НАСТРОЙКИ ТОКЕНА</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="mono text-[8px] text-[var(--text-muted)] block mb-1 uppercase">ШИРИНА</label><Input type="number" min={1} max={12} value={tokenWidth} onChange={(event) => setTokenWidth(Math.max(1, Number(event.target.value) || 1))} accentColor={ACCENT_WHITE} className="text-center font-bold" /></div>
                    <div><label className="mono text-[8px] text-[var(--text-muted)] block mb-1 uppercase">ВЫСОТА</label><Input type="number" min={1} max={12} value={tokenHeight} onChange={(event) => setTokenHeight(Math.max(1, Number(event.target.value) || 1))} accentColor={ACCENT_WHITE} className="text-center font-bold" /></div>
                    <div><label className="mono text-[8px] text-[var(--text-muted)] block mb-1 uppercase">ПОВОРОТ</label><Input type="number" value={tokenRotation} onChange={(event) => setTokenRotation(Number(event.target.value) || 0)} accentColor={ACCENT_WHITE} className="text-center font-bold" /></div>
                    <div><label className="mono text-[8px] text-[var(--text-muted)] block mb-1 uppercase">ПРОЗРАЧНОСТЬ</label><Input type="number" min={0} max={1} step={0.05} value={tokenOpacity} onChange={(event) => setTokenOpacity(Math.max(0, Math.min(1, Number(event.target.value) || 0)))} accentColor={ACCENT_WHITE} className="text-center font-bold" /></div>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    />
    {activeMap && (
      <Modal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="ПАРАМЕТРЫ КАРТЫ"
        accentColor={ACCENT_WHITE}
        maxWidth="max-w-5xl"
      >
        <MapSettingsPanel
          map={activeMap}
          scenarios={scenarios}
          characters={characters}
          items={items}
          assets={assetsLibrary}
          locations={locations}
          factions={factions}
          events={events}
          links={activeMapMaterialLinks}
          scenarioMapLinks={activeMapScenarioLinks}
          tags={tags}
          selectedTags={activeMapTags}
          publication={publicationAssignments[publicationAssignmentKey('map', activeMap.id)]}
          assetCollections={assetCollections}
          activeCollectionIds={activeMapCollectionIds}
          pageSize={mapPdfPageSize}
          orientation={mapPdfOrientation}
          accentColor={ACCENT_WHITE}
          onPageSizeChange={setMapPdfPageSize}
          onOrientationChange={setMapPdfOrientation}
          onExportPdf={handleExportMapPdf}
          onUpdateMapSize={(field, value) => updateMapField(field, value)}
          onReplaceAssetCollections={(collectionIds) => onReplaceAssetCollections('map', activeMap.id, collectionIds)}
          onReplaceTags={(tagIds, newTags) => onReplaceTargetTags('map', activeMap.id, tagIds, newTags)}
          onUpdateTag={onUpdateTag}
          onDeleteTag={onDeleteTag}
          onCreateMaterialLink={onCreateMaterialLink}
          onDeleteMaterialLink={onDeleteMaterialLink}
          onUpsertPublication={onUpsertPublication}
          onUpdatePublication={onUpdatePublication}
          onDeletePublication={onDeletePublication}
        />
      </Modal>
    )}
    </>
  );
};

export default MapEditor;
