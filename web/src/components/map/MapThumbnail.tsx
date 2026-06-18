import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Asset, MapData } from '../../types';
import { drawMapSnapshotToCanvas } from '../../lib/mapRendering';
import type { MapObjectDisplayResolver } from '../../lib/mapMaterials';

export interface MapThumbnailProps {
  map: MapData;
  assetById: ReadonlyMap<string, Asset>;
  backgroundAssetId?: string | null;
  resolveObjectDisplay?: MapObjectDisplayResolver;
}

export const MapThumbnail = React.memo<MapThumbnailProps>(({
  map,
  assetById,
  backgroundAssetId,
  resolveObjectDisplay
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const [imageRevision, setImageRevision] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const getCanvasImage = useCallback((url: string): HTMLImageElement | null => {
    if (typeof window === 'undefined') return null;
    let image = imageCacheRef.current[url];
    if (!image) {
      image = new window.Image();
      image.onload = () => setImageRevision((revision) => revision + 1);
      image.src = url;
      imageCacheRef.current[url] = image;
    }
    return image.complete && image.naturalWidth > 0 ? image : null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const deviceRatio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width * deviceRatio));
      const height = Math.max(1, Math.floor(rect.height * deviceRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      setCanvasSize({ width, height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width <= 0 || canvasSize.height <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawMapSnapshotToCanvas({
      ctx,
      map,
      assetById,
      backgroundAssetId: backgroundAssetId ?? map.backgroundAssetId ?? null,
      getImage: getCanvasImage,
      resolveObjectDisplay,
      width: canvas.width,
      height: canvas.height
    });
  }, [assetById, backgroundAssetId, canvasSize.height, canvasSize.width, getCanvasImage, imageRevision, map, resolveObjectDisplay]);

  return <canvas ref={canvasRef} className="h-full w-full" aria-label={`Миниатюра карты ${map.name}`} />;
});
