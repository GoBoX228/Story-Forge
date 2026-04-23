
import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, SearchInput, SectionHeader } from './UI';
import { MapData, MapObject } from '../types';
import { apiRequest } from '../lib/api';
import { mapMapFromApi } from '../lib/mappers';
import { 
  Plus, Trash2, ArrowLeft, RefreshCw, Grid, Eraser, 
  MousePointer2, Maximize, Edit3, Layers, Layout, 
  Hand, PaintBucket, Square, Pipette, Undo2, Redo2, ZoomIn, ZoomOut
} from 'lucide-react';

const ACCENT_WHITE = 'var(--col-white)';
type ToolbarPosition = 'left' | 'top' | 'right' | 'bottom';
type ToolType = 'brush' | 'eraser' | 'select' | 'pan' | 'fill' | 'rect' | 'picker';
type GridPoint = { x: number; y: number };

interface MapEditorProps {
  data: MapData[];
  onUpdate: (data: MapData[]) => void;
  initialMapId?: string | null;
}

const MapEditor: React.FC<MapEditorProps> = ({ data, onUpdate, initialMapId }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [autosaveState, setAutosaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [selectedTool, setSelectedTool] = useState<ToolType>('pan');
  const [activeAsset, setActiveAsset] = useState({ type: 'wall', label: 'Стена', color: '#6C757D' });
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>('left');
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = useState<MapObject[][]>([]);
  const [redoStack, setRedoStack] = useState<MapObject[][]>([]);
  const [rectStart, setRectStart] = useState<GridPoint | null>(null);
  const [rectEnd, setRectEnd] = useState<GridPoint | null>(null);
  const initialMapAppliedRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeMap = data.find(m => m.id === activeId);

  const assets = [
    { type: 'wall', label: 'Стена', color: '#888888' },
    { type: 'floor', label: 'Пол', color: '#222222' },
    { type: 'water', label: 'Вода', color: '#4361EE' },
    { type: 'lava', label: 'Лава', color: '#E63946' },
    { type: 'grass', label: 'Трава', color: '#2A9D8F' },
    { type: 'wood', label: 'Дерево', color: '#D4A373' },
    { type: 'npc', label: 'NPC', color: '#FFC300' },
    { type: 'loot', label: 'Лут', color: '#8338EC' },
  ];

  const handleCreateMap = async () => {
    try {
      const response = await apiRequest('/maps', {
        method: 'POST',
        body: JSON.stringify({
          name: 'НОВАЯ КАРТА',
          width: 20,
          height: 20,
          cell_size: 32,
          data: { objects: [] }
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
            data: { objects: nextMap.objects },
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
    if (field === 'objects') {
      updated = { ...updated, objects: sanitizeObjects(value as MapObject[], updated) };
    } else if (field === 'width' || field === 'height') {
      updated = { ...updated, objects: sanitizeObjects(updated.objects, updated) };
    }
    onUpdate(data.map(m => m.id === activeMap.id ? updated : m));
    scheduleSave(updated);
  };

  const deleteMap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Удалить карту?')) return;
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
  const isWithinMapBounds = (x: number, y: number, map: MapData) => x >= 0 && y >= 0 && x < map.width && y < map.height;
  const clampGridToMapBounds = (x: number, y: number, map: MapData): GridPoint => ({
    x: Math.min(map.width - 1, Math.max(0, x)),
    y: Math.min(map.height - 1, Math.max(0, y)),
  });
  const sanitizeObjects = (objects: MapObject[], map: MapData) =>
    objects.filter((obj) => isWithinMapBounds(obj.x, obj.y, map));

  const drawMap = () => {
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
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, mapW, mapH);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    for (let x = 0; x <= activeMap.width; x++) { ctx.beginPath(); ctx.moveTo(x * activeMap.cellSize, 0); ctx.lineTo(x * activeMap.cellSize, mapH); ctx.stroke(); }
    for (let y = 0; y <= activeMap.height; y++) { ctx.beginPath(); ctx.moveTo(0, y * activeMap.cellSize); ctx.lineTo(mapW, y * activeMap.cellSize); ctx.stroke(); }
    sanitizeObjects(activeMap.objects, activeMap).forEach(obj => {
      ctx.fillStyle = obj.color;
      const p = 1;
      ctx.fillRect(obj.x * activeMap.cellSize + p, obj.y * activeMap.cellSize + p, activeMap.cellSize - p * 2, activeMap.cellSize - p * 2);
      if (obj.type === 'wall') { ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.strokeRect(obj.x * activeMap.cellSize + p, obj.y * activeMap.cellSize + p, activeMap.cellSize - p * 2, activeMap.cellSize - p * 2); }
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
  };

  useEffect(() => {
    if (activeId) {
      drawMap();
      window.addEventListener('resize', drawMap);
      return () => window.removeEventListener('resize', drawMap);
    }
  }, [data, activeId, activeMap?.width, activeMap?.height, viewOffset, zoom, selectedTool, rectStart, rectEnd, activeAsset.color]);

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

  const cloneObjects = (objects: MapObject[]) => objects.map((obj) => ({ ...obj }));

  const commitObjects = (nextObjects: MapObject[], recordHistory: boolean) => {
    if (!activeMap) return;
    if (recordHistory) {
      setUndoStack((prev) => {
        const next = [...prev, cloneObjects(activeMap.objects)];
        return next.length > 100 ? next.slice(next.length - 100) : next;
      });
      setRedoStack([]);
    }
    updateMapField('objects', nextObjects);
  };

  const handleUndo = () => {
    if (!activeMap || undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, cloneObjects(activeMap.objects)]);
    updateMapField('objects', previous);
  };

  const handleRedo = () => {
    if (!activeMap || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, cloneObjects(activeMap.objects)]);
    updateMapField('objects', next);
  };

  const applyTool = (x: number, y: number, recordHistory = false) => {
    if (!activeMap) return;
    if (!isWithinMapBounds(x, y, activeMap)) return;
    if (selectedTool === 'picker') { const obj = activeMap.objects.find(o => o.x === x && o.y === y); if (obj) { const a = assets.find(as => as.type === obj.type); if (a) { setActiveAsset(a); setSelectedTool('brush'); } } return; }
    if (selectedTool === 'brush') {
      const newObj: MapObject = { id: Math.random().toString(36).substr(2, 9), x, y, type: activeAsset.type, label: activeAsset.label, color: activeAsset.color };
      const clean = activeMap.objects.filter(o => o.x !== x || o.y !== y);
      const exist = activeMap.objects.find(o => o.x === x && o.y === y);
      if (exist?.type !== activeAsset.type) commitObjects([...clean, newObj], recordHistory);
    } else if (selectedTool === 'eraser') {
      const clean = activeMap.objects.filter(o => o.x !== x || o.y !== y);
      if (clean.length !== activeMap.objects.length) commitObjects(clean, recordHistory);
    } else if (selectedTool === 'fill') {
        if(confirm('Залить? (Демо)')) {
            const objs = []; for(let i=0; i<activeMap.width; i++) for(let j=0; j<activeMap.height; j++) objs.push({ id: Math.random().toString(), x: i, y: j, type: activeAsset.type, label: activeAsset.label, color: activeAsset.color });
            commitObjects(objs, recordHistory);
        } setSelectedTool('brush');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const c = getMapCoordinates(e); if (!c || !activeMap) return; setIsDragging(true); setLastMousePos({ x: e.clientX, y: e.clientY });
    if (selectedTool === 'rect') {
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
    if (selectedTool === 'rect' && activeMap && rectStart && rectEnd) {
      const minX = Math.min(rectStart.x, rectEnd.x);
      const minY = Math.min(rectStart.y, rectEnd.y);
      const maxX = Math.max(rectStart.x, rectEnd.x);
      const maxY = Math.max(rectStart.y, rectEnd.y);
      const keep = activeMap.objects.filter((obj) => obj.x < minX || obj.x > maxX || obj.y < minY || obj.y > maxY);
      const rectObjects: MapObject[] = [];
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          rectObjects.push({
            id: Math.random().toString(36).substr(2, 9),
            x,
            y,
            type: activeAsset.type,
            label: activeAsset.label,
            color: activeAsset.color,
          });
        }
      }
      commitObjects([...keep, ...rectObjects], true);
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
        <ActionButton onClick={() => commitObjects([], true)} icon={Trash2} /> <ActionButton onClick={cycleToolbarPosition} icon={Layout} />
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
          <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-1">{data.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).map(map => (<button key={map.id} onClick={() => setActiveId(map.id)} className="w-full text-left p-4 border border-[var(--border-color)] hover:border-[var(--text-main)] hover:bg-[var(--bg-main)] transition-all group relative bg-[var(--bg-surface)]"><div className="flex justify-between items-start"><div className="mono text-[11px] font-black uppercase text-[var(--text-main)] mb-2 group-hover:text-[var(--text-main)] transition-colors truncate pr-6">{map.name}</div></div><div className="flex justify-between items-center border-t border-[var(--border-color)] pt-2 mt-2"><span className="mono text-[9px] text-[var(--text-muted)]">{map.width}x{map.height}</span><div className="flex items-center gap-1 mono text-[9px] text-[var(--text-muted)]"><Grid size={10} /> {map.objects.length} ОБЪЕКТОВ</div></div><div className="absolute right-2 top-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-[var(--col-red)]" onClick={(e) => deleteMap(map.id, e)}><Trash2 size={12} /></div></button>))}</div>
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
             <div className={`flex items-center gap-2 mono text-[10px] uppercase font-bold transition-colors ${autosaveState === 'saving' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}><RefreshCw size={12} className={autosaveState === 'saving' ? 'animate-spin' : ''} /> {autosaveState === 'saved' ? 'СОХРАНЕНО' : autosaveState === 'saving' ? 'СОХРАНЕНИЕ...' : 'ИЗМЕНЕНО'}</div>
         </div>
         <div className={`flex flex-1 w-full h-full overflow-hidden ${isToolbarTop || isToolbarBottom ? 'flex-col' : 'flex-row'}`}>
             {isToolbarTop && renderToolbar()} {isToolbarLeft && renderToolbar()}
             <div className="flex-1 bg-[#050505] relative overflow-hidden pattern-grid flex items-center justify-center"><canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onWheel={handleWheel} className="w-full h-full cursor-crosshair block" /></div>
             {isToolbarRight && renderToolbar()} {isToolbarBottom && renderToolbar()}
         </div>
      </div>
      <div className="w-80 bg-[var(--bg-surface)] border-l border-[var(--border-color)] flex flex-col z-10 shrink-0">
          <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-2 bg-[var(--bg-main)]"><Layers size={16} className="text-[var(--text-main)]"/><span className="mono text-[10px] uppercase font-black text-[var(--text-main)] tracking-widest">РЕСУРСЫ</span></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="space-y-3"><label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black block">Тайлы</label><div className="grid grid-cols-2 gap-2">{assets.map(asset => (<button key={asset.type} onClick={() => { setActiveAsset(asset); setSelectedTool('brush'); }} className={`flex flex-col items-center justify-center p-3 border transition-all hover:scale-105 active:scale-95 ${activeAsset.type === asset.type ? 'border-[var(--text-main)] bg-[var(--text-main)]/10' : 'border-[var(--border-color)] hover:border-[var(--border-color-hover)]'}`}><div className="w-6 h-6 mb-2 border border-[var(--border-color)]" style={{ backgroundColor: asset.color }} /><span className="mono text-[9px] uppercase font-bold text-[var(--text-main)]">{asset.label}</span></button>))}</div></div>
              <div className="space-y-4 pt-6 border-t border-[var(--border-color)]"><label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black block flex items-center gap-2"><Maximize size={10} /> Размеры</label><div className="grid grid-cols-2 gap-4"><div><label className="mono text-[8px] text-[var(--text-muted)] block mb-1 uppercase">Ширина</label><Input type="number" value={activeMap?.width} onChange={e => updateMapField('width', parseInt(e.target.value) || 20)} accentColor={ACCENT_WHITE} className="text-center font-bold"/></div><div><label className="mono text-[8px] text-[var(--text-muted)] block mb-1 uppercase">Высота</label><Input type="number" value={activeMap?.height} onChange={e => updateMapField('height', parseInt(e.target.value) || 15)} accentColor={ACCENT_WHITE} className="text-center font-bold"/></div></div></div>
          </div>
      </div>
    </div>
  );
};

export default MapEditor;
