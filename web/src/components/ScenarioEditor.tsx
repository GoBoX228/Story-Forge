
import React, { useState, useRef, useEffect } from 'react';
import { COLORS } from '../constants';
import { Button, SearchInput, Select, Badge, SectionHeader } from './UI';
import { Scenario, BlockType, Character, MapData, Campaign } from '../types';
import { API_BASE_URL, apiRequest, getAccessToken } from '../lib/api';
import { mapBlockFromApi, mapChapterFromApi, mapCharacterFromApi, mapMapFromApi, mapScenarioDetail, mapScenarioSummary } from '../lib/mappers';
import { 
  Bold, Italic, Underline, GripVertical, Trash2, Plus, FileText, 
  MessageSquare, Sword, Dices, MapPin, Package, RefreshCw, 
  Users, Map as MapIcon, Layers, X, Settings, ArrowLeft, BookOpen
} from 'lucide-react';

interface ScenarioEditorProps {
  data: Scenario[];
  onUpdate: (data: Scenario[]) => void;
  campaigns: Campaign[];
  characters: Character[];
  maps: MapData[];
  onUpdateCharacters: (data: Character[]) => void;
  onUpdateMaps: (data: MapData[]) => void;
  initialScenarioId?: string | null;
}

const BLOCK_TYPES: { type: BlockType, icon: React.ReactNode, label: string }[] = [
  { type: 'Описание', icon: <FileText size={14} />, label: 'ТЕКСТ' },
  { type: 'Диалог', icon: <MessageSquare size={14} />, label: 'ДИАЛОГ' },
  { type: 'Бой', icon: <Sword size={14} />, label: 'БОЙ' },
  { type: 'Проверка', icon: <Dices size={14} />, label: 'ЧЕК' },
  { type: 'Локация', icon: <MapPin size={14} />, label: 'МЕСТО' },
  { type: 'Добыча', icon: <Package size={14} />, label: 'ЛУТ' },
];

const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
  data,
  onUpdate,
  campaigns,
  characters,
  maps,
  onUpdateCharacters,
  onUpdateMaps,
  initialScenarioId
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [autosaveState, setAutosaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [loadingScenarioId, setLoadingScenarioId] = useState<string | null>(null);
  
  // Composer State
  const [composerContent, setComposerContent] = useState('');
  const [composerType, setComposerType] = useState<BlockType>('Описание');
  const [composerDifficulty, setComposerDifficulty] = useState<number>(10);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const initialScenarioAppliedRef = useRef<string | null>(null);

  const activeScenario = data.find(s => s.id === activeId);
  const activeChapter = activeScenario?.chapters.find(c => c.id === activeChapterId);
  const blocks = activeChapter?.blocks || [];

  useEffect(() => {
    if (!activeScenario) {
      setActiveChapterId(null);
      return;
    }
    if (!activeChapterId && activeScenario.chapters.length > 0) {
      setActiveChapterId(activeScenario.chapters[0].id);
    }
  }, [activeScenario, activeChapterId]);

  useEffect(() => {
    if (!initialScenarioId) return;
    if (initialScenarioAppliedRef.current === initialScenarioId) return;
    const targetScenario = data.find((scenario) => scenario.id === initialScenarioId);
    if (!targetScenario) return;
    initialScenarioAppliedRef.current = initialScenarioId;
    setActiveId(initialScenarioId);
    setActiveChapterId(targetScenario.chapters[0]?.id ?? null);
  }, [initialScenarioId, data]);

  const setScenario = (scenarioId: string, updater: (scenario: Scenario) => Scenario) => {
    onUpdate(
      data.map((scenario) => {
        if (scenario.id !== scenarioId) return scenario;
        return { ...updater(scenario), updatedAt: new Date().toISOString() };
      })
    );
  };

  const handleCreateScenario = async () => {
    try {
      const created = await apiRequest('/scenarios', {
        method: 'POST',
        body: JSON.stringify({ title: 'НОВЫЙ СЦЕНАРИЙ', description: '' })
      });
      const scenario = mapScenarioSummary(created);
      onUpdate([...data, scenario]);
      setActiveId(scenario.id);
      setActiveChapterId(null);
      try {
        const chapterResponse = await apiRequest(`/scenarios/${scenario.id}/chapters`, {
          method: 'POST',
          body: JSON.stringify({ title: 'ГЛАВА 1', order_index: 0 })
        });
        const chapter = mapChapterFromApi(chapterResponse);
        const fullScenario: Scenario = { ...scenario, chapters: [chapter] };
        onUpdate([...data, fullScenario]);
        setActiveChapterId(chapter.id);
      } catch {
        // keep scenario open even if chapter creation fails
      }
    } catch {
      // ignore
    }
  };

  const handleSelectScenario = async (scenarioId: string) => {
    setLoadingScenarioId(scenarioId);
    try {
      const detail = await apiRequest(`/scenarios/${scenarioId}`);
      const mapped = mapScenarioDetail(detail);
      onUpdate(data.map(s => (s.id === scenarioId ? mapped : s)));
      setActiveId(scenarioId);
      setActiveChapterId(mapped.chapters[0]?.id ?? null);
    } catch {
      const fallback = data.find(s => s.id === scenarioId);
      setActiveId(scenarioId);
      setActiveChapterId(fallback?.chapters[0]?.id ?? null);
    } finally {
      setLoadingScenarioId(null);
    }
  };

  const handleDeleteScenario = async (scenarioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Удалить сценарий?')) return;
    try {
      await apiRequest(`/scenarios/${scenarioId}`, { method: 'DELETE' });
      onUpdate(data.filter(s => s.id !== scenarioId));
      if (activeId === scenarioId) {
        setActiveId(null);
        setActiveChapterId(null);
      }
    } catch {
      // ignore
    }
  };

  const updateScenarioField = (field: keyof Scenario, value: any) => {
    if (!activeId) return;
    setScenario(activeId, (scenario) => ({ ...scenario, [field]: value }));
    if (field === 'title' || field === 'description' || field === 'campaignId') {
      const payload =
        field === 'campaignId'
          ? { campaign_id: value || null }
          : { [field]: value };
      triggerAutosave();
      apiRequest(`/scenarios/${activeId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }).catch(() => null);
    }
  };

  const handleCreateChapter = async () => {
    if (!activeScenario) return;
    try {
      const response = await apiRequest(`/scenarios/${activeScenario.id}/chapters`, {
        method: 'POST',
        body: JSON.stringify({
          title: `ГЛАВА ${activeScenario.chapters.length + 1}`,
          order_index: activeScenario.chapters.length
        })
      });
      const chapter = mapChapterFromApi(response);
      setScenario(activeScenario.id, scenario => ({
        ...scenario,
        chapters: [...scenario.chapters, chapter]
      }));
      setActiveChapterId(chapter.id);
    } catch {
      // ignore
    }
  };

  const deleteChapter = async (chId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeScenario || !confirm('Удалить главу?')) return;
    try {
      await apiRequest(`/chapters/${chId}`, { method: 'DELETE' });
      const updated = activeScenario.chapters.filter(c => c.id !== chId);
      setScenario(activeScenario.id, scenario => ({ ...scenario, chapters: updated }));
      if (activeChapterId === chId) setActiveChapterId(updated[0]?.id || null);
    } catch {
      // ignore
    }
  };

  const addBlock = async () => {
    if (!activeScenario || !activeChapterId || (!composerContent.trim() && composerType !== 'Бой')) return;
    try {
      const response = await apiRequest(`/chapters/${activeChapterId}/blocks`, {
        method: 'POST',
        body: JSON.stringify({
          type: composerType,
          content: composerContent,
          order_index: blocks.length,
          difficulty: composerType === 'Проверка' ? composerDifficulty : null
        })
      });
      const newBlock = mapBlockFromApi(response);
      const updatedChapters = activeScenario.chapters.map(ch =>
        ch.id === activeChapterId ? { ...ch, blocks: [...ch.blocks, newBlock] } : ch
      );
      setScenario(activeScenario.id, scenario => ({ ...scenario, chapters: updatedChapters }));
      setComposerContent('');
      if (contentEditableRef.current) contentEditableRef.current.innerHTML = '';
    } catch {
      // ignore
    }
  };

  const deleteBlock = async (blockId: string) => {
    if (!activeScenario || !activeChapterId) return;
    try {
      await apiRequest(`/blocks/${blockId}`, { method: 'DELETE' });
      const updatedChapters = activeScenario.chapters.map(ch =>
        ch.id === activeChapterId ? { ...ch, blocks: ch.blocks.filter(b => b.id !== blockId) } : ch
      );
      setScenario(activeScenario.id, scenario => ({ ...scenario, chapters: updatedChapters }));
    } catch {
      // ignore
    }
  };

  const updateBlockContent = async (blockId: string, newContent: string) => {
    if (!activeScenario || !activeChapterId) return;
    const updatedChapters = activeScenario.chapters.map(ch =>
      ch.id === activeChapterId ? { ...ch, blocks: ch.blocks.map(b => (b.id === blockId ? { ...b, content: newContent } : b)) } : ch
    );
    setScenario(activeScenario.id, scenario => ({ ...scenario, chapters: updatedChapters }));
    apiRequest(`/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: newContent })
    }).catch(() => null);
  };

  const triggerAutosave = () => {
    setAutosaveState('saving');
    setTimeout(() => setAutosaveState('saved'), 800);
  };

  const handleExportPdf = async () => {
    if (!activeScenario) return;
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/scenarios/${activeScenario.id}/export/pdf`, {
        method: 'POST',
        headers: {
          Accept: 'application/pdf',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });
      if (!response.ok) {
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeScenario.title || 'scenario'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const toggleCharacterRelation = async (id: string) => {
    if (!activeScenario) return;
    const target = characters.find(c => c.id === id);
    if (!target) return;
    const nextScenarioId = target.scenarioId === activeScenario.id ? null : activeScenario.id;
    try {
      const updated = await apiRequest(`/characters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ scenario_id: nextScenarioId })
      });
      const mapped = mapCharacterFromApi(updated);
      onUpdateCharacters(characters.map(c => (c.id === mapped.id ? mapped : c)));
    } catch {
      // ignore
    }
  };

  const toggleMapRelation = async (id: string) => {
    if (!activeScenario) return;
    const target = maps.find(m => m.id === id);
    if (!target) return;
    const nextScenarioId = target.scenarioId === activeScenario.id ? null : activeScenario.id;
    try {
      const updated = await apiRequest(`/maps/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ scenario_id: nextScenarioId })
      });
      const mapped = mapMapFromApi(updated);
      onUpdateMaps(maps.map(m => (m.id === mapped.id ? mapped : m)));
    } catch {
      // ignore
    }
  };

  // Drag handlers
  const onDragStart = (e: React.DragEvent, index: number) => { setDraggedBlockIndex(index); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === index) return;
    const updatedBlocks = [...blocks];
    const item = updatedBlocks[draggedBlockIndex];
    updatedBlocks.splice(draggedBlockIndex, 1);
    updatedBlocks.splice(index, 0, item);
    const reorderedBlocks = updatedBlocks.map((block, idx) => ({ ...block, order: idx }));
    const updatedChapters = activeScenario!.chapters.map(ch => ch.id === activeChapterId ? { ...ch, blocks: reorderedBlocks } : ch);
    onUpdate(data.map(s => s.id === activeId ? { ...s, chapters: updatedChapters } : s));
    setDraggedBlockIndex(index);
  };
  const onDragEnd = async () => {
    setDraggedBlockIndex(null);
    if (!activeChapterId) return;
    try {
      await Promise.all(
        blocks.map((block, idx) =>
          apiRequest(`/blocks/${block.id}/reorder`, {
            method: 'POST',
            body: JSON.stringify({ order_index: idx })
          })
        )
      );
      triggerAutosave();
    } catch {
      // ignore
    }
  };

  const relatedCharacters = activeScenario
    ? characters.filter(c => c.scenarioId === activeScenario.id)
    : [];
  const relatedMaps = activeScenario
    ? maps.filter(m => m.scenarioId === activeScenario.id)
    : [];

  const execCommand = (cmd: string) => { document.execCommand(cmd, false); contentEditableRef.current?.focus(); };

  const getBlockStyle = (type: BlockType) => {
    const base = 'border-l-4 border-[var(--border-color)] bg-[var(--input-bg)]';
    const map: Record<string, string> = {
      'Бой': 'border-l-[var(--col-red)]',
      'Диалог': 'border-l-[var(--col-blue)]',
      'Проверка': 'border-l-[var(--col-yellow)]',
      'Локация': 'border-l-[var(--col-purple)]',
      'Добыча': 'border-l-[var(--col-teal)]',
      'Описание': 'border-l-[var(--border-color)]'
    };
    return `${base} ${map[type] ?? map['Описание']}`;
  };

  if (!activeId) {
    return (
      <div className="flex h-full w-full bg-[var(--bg-main)]">
        <div className="flex-1 flex flex-col min-w-0 bauhaus-bg relative border-r border-[var(--border-color)]">
           <div className="px-12 pt-12 pb-6 shrink-0 z-10">
              <div className="mx-auto w-full max-w-7xl">
                <SectionHeader title="СЦЕНАРНАЯ МАСТЕРСКАЯ" subtitle="КОНСТРУКТОР СЮЖЕТОВ" accentColor="var(--col-red)" />
              </div>
           </div>
           <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-70">
              <Button variant="accent-red" onClick={handleCreateScenario}><Plus size={16} /> СОЗДАТЬ СЦЕНАРИЙ</Button>
           </div>
        </div>
        <div className="w-80 bg-[var(--bg-surface)] border-l-4 border-[var(--col-red)] flex flex-col p-8 space-y-10 z-10 overflow-y-auto">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-[var(--col-red)] glitch-text leading-none">БИБЛИОТЕКА</h2>
          <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="НАЗВАНИЕ..." accentColor="var(--col-red)" />
          <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-1">
              {data.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(scenario => (
                  <button
                    key={scenario.id}
                    onClick={() => handleSelectScenario(scenario.id)}
                    disabled={loadingScenarioId === scenario.id}
                    className="w-full text-left p-4 border border-[var(--border-color)] hover:border-[var(--col-red)] hover:bg-[var(--bg-main)] transition-all group relative bg-[var(--bg-surface)] disabled:opacity-60"
                  >
                      <div className="mono text-[11px] font-black uppercase text-[var(--text-main)] mb-2 group-hover:text-[var(--col-red)] transition-colors truncate pr-6">{scenario.title}</div>
                      <div className="flex justify-between items-center border-t border-[var(--border-color)] pt-2 mt-2">
                          <span className="mono text-[9px] text-[var(--text-muted)]">
                            {loadingScenarioId === scenario.id ? 'Загрузка...' : scenario.createdAt.split('T')[0]}
                          </span>
                          <div className="flex items-center gap-1 mono text-[9px] text-[var(--text-muted)]"><Layers size={10} /> {scenario.chapters.length}</div>
                      </div>
                      <span
                        onClick={(e) => handleDeleteScenario(scenario.id, e)}
                        className="absolute right-3 top-4 p-1 text-[var(--col-red)] opacity-0 group-hover:opacity-100 transition-opacity hover:brightness-125"
                        role="button"
                        aria-label="Удалить сценарий"
                        title="Удалить сценарий"
                      >
                        <Trash2 size={14} />
                      </span>
                  </button>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-[var(--bg-main)]">
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-main)] bauhaus-bg relative border-r border-[var(--border-color)]">
         <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center gap-6 bg-[var(--bg-main)] z-50">
             <button onClick={() => { setActiveId(null); setActiveChapterId(null); }} className="w-10 h-10 flex items-center justify-center border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--col-red)] hover:border-[var(--col-red)] transition-all"><ArrowLeft size={20} /></button>
             <div className="h-8 w-[1px] bg-[var(--border-color)]" />
             <input value={activeScenario?.title} onChange={e => updateScenarioField('title', e.target.value.toUpperCase())} className="bg-transparent border-b-2 border-transparent focus:border-[var(--col-red)] text-2xl font-black uppercase text-[var(--text-main)] focus:outline-none placeholder:text-[var(--text-muted)] flex-1" placeholder="НАЗВАНИЕ..." />
             <div className={`flex items-center gap-2 mono text-[10px] uppercase font-bold transition-colors ${autosaveState === 'saving' ? 'text-[var(--col-yellow)]' : 'text-[var(--text-muted)]'}`}>
                <RefreshCw size={12} className={autosaveState === 'saving' ? 'animate-spin' : ''} /> {autosaveState === 'saved' ? 'СОХРАНЕНО' : autosaveState === 'saving' ? 'СОХРАНЕНИЕ...' : 'ИЗМЕНЕНО'}
             </div>
         </div>

         <div className="flex flex-1 w-full h-full overflow-hidden">
             {/* Chapters Sidebar */}
             <div className="w-64 bg-[var(--bg-surface)] border-r border-[var(--border-color)] flex flex-col z-20 backdrop-blur-sm">
                 <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                     <span className="mono text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest">ОГЛАВЛЕНИЕ</span>
                     <button onClick={handleCreateChapter} className="text-[var(--col-red)] hover:text-[var(--text-main)]"><Plus size={16}/></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 space-y-1">
                     {activeScenario?.chapters.map(chapter => (
                         <div key={chapter.id} onClick={() => setActiveChapterId(chapter.id)} className={`group w-full p-3 border border-transparent hover:border-[var(--border-color)] cursor-pointer flex items-center gap-3 transition-all relative ${activeChapterId === chapter.id ? 'bg-[var(--bg-main)] border-[var(--border-color)]' : 'hover:bg-[var(--bg-main)]'}`}>
                             <div className={`w-1 h-full absolute left-0 top-0 bottom-0 ${activeChapterId === chapter.id ? 'bg-[var(--col-red)]' : 'bg-transparent'}`} />
                             <div className="flex-1 min-w-0">
                                 <div className={`mono text-[10px] uppercase font-black truncate ${activeChapterId === chapter.id ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{chapter.title}</div>
                                 <div className="text-[8px] mono text-[var(--text-muted)] opacity-60">{chapter.blocks.length} БЛОКОВ</div>
                             </div>
                             <button onClick={(e) => deleteChapter(chapter.id, e)} className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--col-red)] transition-all p-1"><X size={12} /></button>
                         </div>
                     ))}
                 </div>
             </div>

             {/* Blocks Editor */}
             <div className="flex-1 flex flex-col relative min-w-0 bg-[var(--bg-main)] bauhaus-bg">
                 {!activeChapterId ? (
                     <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-50">
                         <BookOpen size={48} className="text-[var(--text-muted)] mb-4" />
                         <span className="mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Выберите главу слева</span>
                     </div>
                 ) : (
                     <>
                         <div className="flex-1 overflow-y-auto p-12 pb-40 space-y-8">
                             {blocks.map((block, index) => (
                                 <div key={block.id} draggable onDragStart={(e) => onDragStart(e, index)} onDragOver={(e) => onDragOver(e, index)} onDragEnd={onDragEnd} className={`relative group animate-appear transition-transform duration-200 ${draggedBlockIndex === index ? 'opacity-50 scale-[0.98]' : ''}`}>
                                     <div className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-main)]"><GripVertical size={20} /></div>
                                     <div className={`p-6 border relative transition-all hover:border-[var(--border-color-hover)] ${getBlockStyle(block.type)}`}>
                                         <div className="flex justify-between items-start mb-4">
                                             <div className="flex items-center gap-3"><Badge color={block.type === 'Бой' ? 'var(--col-red)' : block.type === 'Диалог' ? 'var(--col-blue)' : block.type === 'Проверка' ? 'var(--col-yellow)' : 'var(--col-grey)'}>{block.type.toUpperCase()}</Badge></div>
                                             <button onClick={() => deleteBlock(block.id)} className="text-[var(--text-muted)] hover:text-[var(--col-red)]"><Trash2 size={16} /></button>
                                         </div>
                                         <div contentEditable suppressContentEditableWarning onBlur={(e) => updateBlockContent(block.id, e.currentTarget.innerHTML)} className="text-[var(--text-main)] rich-content mono text-sm outline-none focus:text-[var(--text-main)] leading-relaxed" dangerouslySetInnerHTML={{ __html: block.content }} />
                                         {block.type === 'Проверка' && block.difficulty && <div className="absolute bottom-4 right-4 flex items-center justify-center w-10 h-10 bg-[var(--col-yellow)] text-black font-black mono text-sm z-10" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} title={`Сложность: ${block.difficulty}`}>{block.difficulty}</div>}
                                     </div>
                                 </div>
                             ))}
                         </div>
                         {/* Composer */}
                         <div className="absolute bottom-0 left-0 right-0 bg-[var(--bg-surface)] border-t-2 border-[var(--col-red)] p-6 shadow-2xl z-30">
                             <div className="max-w-4xl mx-auto space-y-4">
                               <div className="flex items-center justify-between">
                                   <div className="flex gap-1">{BLOCK_TYPES.map(bt => (<button key={bt.type} onClick={() => setComposerType(bt.type)} className={`px-3 py-1.5 flex items-center gap-2 mono text-[9px] uppercase font-black border transition-all ${composerType === bt.type ? 'bg-[var(--col-red)] border-[var(--col-red)] text-white' : 'bg-transparent border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-main)] hover:text-[var(--text-main)]'}`}>{bt.icon} {bt.label}</button>))}</div>
                                   <div className="flex gap-1 border-l border-[var(--border-color)] pl-4"><button onClick={() => execCommand('bold')} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)]"><Bold size={14} /></button><button onClick={() => execCommand('italic')} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)]"><Italic size={14} /></button><button onClick={() => execCommand('underline')} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)]"><Underline size={14} /></button></div>
                               </div>
                               <div className="flex gap-4">
                                   {composerType === 'Проверка' && (<div className="w-24 shrink-0 space-y-1"><label className="mono text-[8px] uppercase font-black text-[var(--col-yellow)]">Сложность</label><input type="number" value={composerDifficulty} onChange={e => setComposerDifficulty(parseInt(e.target.value) || 10)} className="w-full h-12 bg-[var(--col-yellow)]/10 border border-[var(--col-yellow)] text-[var(--col-yellow)] font-black text-center text-xl focus:outline-none"/></div>)}
                                   <div className="flex-1 relative"><div ref={contentEditableRef} contentEditable onInput={e => setComposerContent(e.currentTarget.innerHTML)} className="w-full h-24 bg-[var(--input-bg)] border border-[var(--border-color)] p-3 mono text-xs text-[var(--text-main)] focus:border-[var(--col-red)] outline-none overflow-y-auto rich-content" />{!composerContent && <div className="absolute top-3 left-3 text-[var(--text-muted)] mono text-xs pointer-events-none uppercase">СОДЕРЖАНИЕ БЛОКА...</div>}</div>
                                   <Button variant="accent-red" className="w-32 h-24 flex-col gap-2" onClick={addBlock}><Plus size={20} /> <span>ДОБАВИТЬ</span></Button>
                               </div>
                             </div>
                         </div>
                     </>
                 )}
             </div>
         </div>
      </div>
      {/* Settings Sidebar */}
      <div className="w-80 bg-[var(--bg-surface)] border-l border-[var(--border-color)] flex flex-col z-10">
          <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-2 bg-[var(--bg-main)]"><Settings size={16} className="text-[var(--col-red)]"/><span className="mono text-[10px] uppercase font-black text-[var(--text-main)] tracking-widest">ПАРАМЕТРЫ</span></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="space-y-2">
                  <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black flex items-center gap-2"><Layers size={10} /> Кампания</label>
                  <Select value={activeScenario?.campaignId} onChange={val => updateScenarioField('campaignId', val)} options={campaigns.map(c => ({ value: c.id, label: c.title }))} placeholder="БЕЗ ПРИВЯЗКИ" accentColor={COLORS.accentPurple} />
              </div>
              <div className="space-y-2">
                  <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black flex items-center gap-2"><Users size={10} /> Персонажи</label>
                  <Select onChange={val => toggleCharacterRelation(val)} options={characters.map(c => ({ value: c.id, label: c.name }))} placeholder="ДОБАВИТЬ..." accentColor={COLORS.accentYellow} />
                  <div className="flex flex-wrap gap-2 mt-2">{relatedCharacters.map(char => (<div key={char.id} className="flex items-center gap-2 px-2 py-1 bg-[var(--col-yellow)]/10 border border-[var(--col-yellow)] animate-appear"><span className="mono text-[8px] font-black text-[var(--col-yellow)] uppercase">{char.name}</span><button onClick={() => toggleCharacterRelation(char.id)} className="text-[var(--col-yellow)] hover:text-[var(--text-main)]"><X size={10}/></button></div>))}</div>
              </div>
              <div className="space-y-2">
                  <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black flex items-center gap-2"><MapIcon size={10} /> Локации</label>
                  <Select onChange={val => toggleMapRelation(val)} options={maps.map(m => ({ value: m.id, label: m.name }))} placeholder="ДОБАВИТЬ..." accentColor="var(--col-white)" />
                  <div className="flex flex-wrap gap-2 mt-2">{relatedMaps.map(map => (<div key={map.id} className="flex items-center gap-2 px-2 py-1 bg-[var(--bg-main)] border border-[var(--col-white)] animate-appear"><span className="mono text-[8px] font-black text-[var(--text-main)] uppercase">{map.name}</span><button onClick={() => toggleMapRelation(map.id)} className="text-[var(--text-main)] hover:text-[var(--text-muted)]"><X size={10}/></button></div>))}</div>
              </div>
              <div className="space-y-2 pt-4 border-t border-[var(--border-color)]">
                  <label className="mono text-[9px] text-[var(--text-muted)] uppercase font-black">Описание сюжета</label>
                  <textarea className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] p-3 mono text-[10px] text-[var(--text-main)] focus:border-[var(--col-red)] focus:outline-none min-h-[120px] resize-none leading-relaxed" value={activeScenario?.description} onChange={e => updateScenarioField('description', e.target.value)} placeholder="Краткая сводка сюжета..." />
                  <Button variant="accent-red" className="w-full h-12" onClick={handleExportPdf}>ЭКСПОРТ PDF</Button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ScenarioEditor;

