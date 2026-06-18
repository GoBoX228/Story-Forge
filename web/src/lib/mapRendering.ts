import type { Asset, MapData, MapLayer, MapObject } from '../types';
import type { MapObjectDisplayResolver } from './mapMaterials';

export const isWithinMapBoundsValue = (x: number, y: number, map: MapData) =>
  x >= 0 && y >= 0 && x < map.width && y < map.height;

export const sanitizeMapObjects = (objects: MapObject[], map: MapData): MapObject[] =>
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

export const getSortedMapLayers = (map: MapData): MapLayer[] =>
  [...map.layers].sort((a, b) => a.order - b.order);

export type MapImageResolver = (url: string) => HTMLImageElement | null;

export interface DrawMapContentOptions {
  ctx: CanvasRenderingContext2D;
  map: MapData;
  layers?: readonly MapLayer[];
  assetById: ReadonlyMap<string, Asset>;
  backgroundAssetId?: string | null;
  getImage: MapImageResolver;
  resolveObjectDisplay?: MapObjectDisplayResolver;
  drawGrid?: boolean;
  drawBorder?: boolean;
}

export const drawMapContent = ({
  ctx,
  map,
  layers = getSortedMapLayers(map),
  assetById,
  backgroundAssetId,
  getImage,
  resolveObjectDisplay,
  drawGrid = true,
  drawBorder = true
}: DrawMapContentOptions) => {
  const mapWidth = map.width * map.cellSize;
  const mapHeight = map.height * map.cellSize;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, mapWidth, mapHeight);

  const renderBackgroundLayer = layers.find((layer) => layer.type === 'background');
  const backgroundAsset = backgroundAssetId ? assetById.get(backgroundAssetId) : undefined;
  if (renderBackgroundLayer?.visible !== false && backgroundAsset?.url) {
    const image = getImage(backgroundAsset.url);
    if (image) {
      ctx.save();
      ctx.globalAlpha = renderBackgroundLayer?.opacity ?? 1;
      ctx.drawImage(image, 0, 0, mapWidth, mapHeight);
      ctx.restore();
    }
  }

  const drawObject = (obj: MapObject, layerOpacity: number) => {
    const display = resolveObjectDisplay?.(obj) ?? {
      label: obj.label,
      color: obj.color,
      assetId: obj.assetId ?? null,
      initials: null,
      detached: false
    };
    const padding = 1;
    const cellX = obj.x * map.cellSize + padding;
    const cellY = obj.y * map.cellSize + padding;
    const cellWidth = map.cellSize * Math.max(1, obj.width ?? 1) - padding * 2;
    const cellHeight = map.cellSize * Math.max(1, obj.height ?? 1) - padding * 2;
    const objectAsset = display.assetId ? assetById.get(display.assetId) : undefined;
    const objectImage = objectAsset?.url ? getImage(objectAsset.url) : null;
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
      ctx.fillStyle = display.color;
      ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
      if (display.initials) {
        const fontSize = Math.max(9, Math.min(cellWidth, cellHeight) * 0.38);
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(display.initials, cellX + cellWidth / 2, cellY + cellHeight / 2, Math.max(1, cellWidth - 4));
      }
    }
    if (obj.type === 'wall') {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.strokeRect(cellX, cellY, cellWidth, cellHeight);
    }
    if (display.detached) {
      ctx.setLineDash([Math.max(2, Math.min(cellWidth, cellHeight) * 0.12), 3]);
      ctx.strokeStyle = '#E63946';
      ctx.lineWidth = Math.max(1.5, Math.min(cellWidth, cellHeight) * 0.06);
      ctx.strokeRect(cellX + 1, cellY + 1, Math.max(0, cellWidth - 2), Math.max(0, cellHeight - 2));
      ctx.setLineDash([]);
    }
    ctx.restore();
  };

  layers
    .filter((layer) => layer.visible && layer.type === 'tiles')
    .forEach((layer) => sanitizeMapObjects(layer.objects, map).forEach((obj) => drawObject(obj, layer.opacity)));

  if (drawGrid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= map.width; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * map.cellSize, 0);
      ctx.lineTo(x * map.cellSize, mapHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= map.height; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * map.cellSize);
      ctx.lineTo(mapWidth, y * map.cellSize);
      ctx.stroke();
    }
  }

  layers
    .filter((layer) => layer.visible && layer.type === 'tokens')
    .forEach((layer) => sanitizeMapObjects(layer.objects, map).forEach((obj) => drawObject(obj, layer.opacity)));

  if (drawBorder) {
    ctx.strokeStyle = '#4361EE';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, mapWidth, mapHeight);
  }

  return { mapWidth, mapHeight };
};

export interface DrawMapSnapshotOptions extends Omit<DrawMapContentOptions, 'ctx'> {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  paddingRatio?: number;
  backgroundColor?: string;
}

export const drawMapSnapshotToCanvas = ({
  ctx,
  map,
  layers,
  assetById,
  backgroundAssetId,
  getImage,
  drawGrid = true,
  drawBorder = true,
  width,
  height,
  paddingRatio = 0.9,
  backgroundColor = '#050505'
}: DrawMapSnapshotOptions) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const mapWidth = map.width * map.cellSize;
  const mapHeight = map.height * map.cellSize;
  const scale = Math.max(0.01, Math.min(width / mapWidth, height / mapHeight) * paddingRatio);
  const offsetX = (width - mapWidth * scale) / 2;
  const offsetY = (height - mapHeight * scale) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  drawMapContent({
    ctx,
    map,
    layers,
    assetById,
    backgroundAssetId,
    getImage,
    drawGrid,
    drawBorder
  });
  ctx.restore();
};
