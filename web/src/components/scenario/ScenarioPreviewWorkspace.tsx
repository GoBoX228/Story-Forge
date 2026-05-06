import React from 'react';
import { Play, RefreshCw } from 'lucide-react';
import {
  Asset,
  Character,
  Faction,
  Item,
  MapData,
  ScenarioNode,
  ScenarioNodeEntityLink,
  ScenarioNodeEntityTargetType,
  ScenarioTransition,
  WorldEvent,
  WorldLocation
} from '../../types';
import { Button } from '../UI';
import { ScenarioPreviewPanel } from './ScenarioPreviewPanel';

interface ScenarioPreviewWorkspaceProps {
  nodes: ScenarioNode[];
  transitions: ScenarioTransition[];
  currentNodeId: string | null;
  history: string[];
  entityLinks: ScenarioNodeEntityLink[];
  entityLinksLoading: boolean;
  graphLoading: boolean;
  graphError: string | null;
  activeScenarioId: string | null;
  maps: MapData[];
  characters: Character[];
  items: Item[];
  assets: Asset[];
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
  onReloadGraph: (scenarioId: string) => void;
  onNavigate: (fromNodeId: string, toNodeId: string) => void;
  onBack: () => void;
  onRestart: (startNodeId: string | null) => void;
  onOpenEntityLink?: (targetType: ScenarioNodeEntityTargetType, targetId: string) => void;
}

export const ScenarioPreviewWorkspace: React.FC<ScenarioPreviewWorkspaceProps> = ({
  nodes,
  transitions,
  currentNodeId,
  history,
  entityLinks,
  entityLinksLoading,
  graphLoading,
  graphError,
  activeScenarioId,
  maps,
  characters,
  items,
  assets,
  locations,
  factions,
  events,
  onReloadGraph,
  onNavigate,
  onBack,
  onRestart,
  onOpenEntityLink
}) => (
  <div className="flex flex-1 min-h-0 flex-col">
    {graphError && (
      <div className="shrink-0 border-b border-[var(--col-red)] bg-[var(--col-red)]/10 px-4 py-3 mono text-[10px] uppercase font-black text-[var(--col-red)]">
        {graphError}
      </div>
    )}
    <div className="h-12 shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Play size={14} className="text-[var(--col-red)]" />
        <div className="mono text-[9px] uppercase font-black text-[var(--text-muted)]">
          {graphLoading ? 'ЗАГРУЗКА ПРЕВЬЮ...' : `${nodes.length} УЗЛОВ / ${transitions.length} ПЕРЕХОДОВ`}
        </div>
      </div>
      <Button
        variant="accent-red"
        size="sm"
        inverted
        disabled={graphLoading || !activeScenarioId}
        onClick={() => activeScenarioId && onReloadGraph(activeScenarioId)}
      >
        <RefreshCw size={13} className={graphLoading ? 'animate-spin' : ''} /> ПЕРЕЗАГРУЗИТЬ
      </Button>
    </div>
    <ScenarioPreviewPanel
      nodes={nodes}
      transitions={transitions}
      currentNodeId={currentNodeId}
      history={history}
      entityLinks={entityLinks}
      entityLinksLoading={entityLinksLoading}
      graphLoading={graphLoading}
      maps={maps}
      characters={characters}
      items={items}
      assets={assets}
      locations={locations}
      factions={factions}
      events={events}
      onNavigate={onNavigate}
      onBack={onBack}
      onRestart={onRestart}
      onOpenEntityLink={onOpenEntityLink}
    />
  </div>
);
