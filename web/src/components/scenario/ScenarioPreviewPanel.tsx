import React, { useMemo } from 'react';
import { ArrowLeft, CheckCircle2, ExternalLink, Link2, MapPin, MessageSquare, Package, RotateCcw, ScrollText, ShieldAlert, Swords, XCircle } from 'lucide-react';
import {
  Asset,
  Character,
  Faction,
  Item,
  MapData,
  ScenarioNode,
  ScenarioNodeConfig,
  ScenarioNodeEntityLink,
  ScenarioNodeEntityTargetType,
  ScenarioTransition,
  ScenarioTransitionType,
  WorldEvent,
  WorldLocation
} from '../../types';
import { Button } from '../UI';
import { getNodeTypeLabel } from './GraphNodeList';

interface ScenarioPreviewPanelProps {
  nodes: ScenarioNode[];
  transitions: ScenarioTransition[];
  currentNodeId: string | null;
  history: string[];
  entityLinks: ScenarioNodeEntityLink[];
  entityLinksLoading?: boolean;
  graphLoading?: boolean;
  maps: MapData[];
  characters: Character[];
  items: Item[];
  assets: Asset[];
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
  onNavigate: (fromNodeId: string, toNodeId: string) => void;
  onBack: () => void;
  onRestart: (startNodeId: string | null) => void;
  onOpenEntityLink?: (targetType: ScenarioNodeEntityTargetType, targetId: string) => void;
}

const TRANSITION_LABELS: Record<ScenarioTransitionType, string> = {
  linear: 'ДАЛЕЕ',
  choice: 'ВЫБОР',
  success: 'УСПЕХ',
  failure: 'ПРОВАЛ'
};

const ENTITY_TARGET_LABELS: Record<ScenarioNodeEntityTargetType, string> = {
  map: 'КАРТА',
  character: 'ПЕРСОНАЖ',
  item: 'ПРЕДМЕТ',
  asset: 'АССЕТ',
  location: 'ЛОКАЦИЯ',
  faction: 'ФРАКЦИЯ',
  event: 'СОБЫТИЕ'
};

const NODE_TYPE_META: Record<ScenarioNode['type'], { label: string; accent: string; icon: React.ReactNode }> = {
  description: { label: 'Описание', accent: 'var(--text-muted)', icon: <ScrollText size={18} /> },
  dialog: { label: 'Диалог', accent: 'var(--col-blue)', icon: <MessageSquare size={18} /> },
  location: { label: 'Локация', accent: 'var(--col-teal)', icon: <MapPin size={18} /> },
  check: { label: 'Проверка', accent: 'var(--col-yellow)', icon: <ShieldAlert size={18} /> },
  loot: { label: 'Добыча', accent: 'var(--col-purple)', icon: <Package size={18} /> },
  combat: { label: 'Бой', accent: 'var(--col-red)', icon: <Swords size={18} /> }
};

const TRANSITION_ACCENTS: Record<ScenarioTransitionType, string> = {
  linear: 'var(--text-muted)',
  choice: 'var(--col-yellow)',
  success: 'var(--col-teal)',
  failure: 'var(--col-red)'
};

const sortedNodes = (nodes: ScenarioNode[]): ScenarioNode[] =>
  [...nodes].sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id));

const sortedTransitions = (transitions: ScenarioTransition[]): ScenarioTransition[] =>
  [...transitions].sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id));

const findStartNode = (nodes: ScenarioNode[], transitions: ScenarioTransition[]): ScenarioNode | null => {
  const incoming = new Set(transitions.map((transition) => transition.toNodeId));
  return sortedNodes(nodes).find((node) => !incoming.has(node.id)) ?? sortedNodes(nodes)[0] ?? null;
};

const getConfigEntries = (type: ScenarioNode['type'], config: ScenarioNodeConfig): { label: string; value: string; icon: React.ReactNode }[] => {
  const source = config as Record<string, unknown>;
  const stringValue = (key: string): string => (typeof source[key] === 'string' ? String(source[key]) : '');
  const numberValue = (key: string): string => (typeof source[key] === 'number' ? String(source[key]) : '');

  if (type === 'description') return [{ label: 'СЦЕНА', value: stringValue('scene'), icon: <ScrollText size={14} /> }];
  if (type === 'dialog') return [{ label: 'ГОВОРЯЩИЙ', value: stringValue('speaker'), icon: <MessageSquare size={14} /> }];
  if (type === 'location') return [{ label: 'ОРИЕНТИР', value: stringValue('map_hint'), icon: <MapPin size={14} /> }];
  if (type === 'loot') return [{ label: 'НАГРАДА', value: stringValue('item_hint'), icon: <Package size={14} /> }];
  if (type === 'combat') return [{ label: 'СТОЛКНОВЕНИЕ', value: stringValue('encounter'), icon: <Swords size={14} /> }];

  return [
    { label: 'НАВЫК', value: stringValue('skill'), icon: <ShieldAlert size={14} /> },
    { label: 'DC', value: numberValue('dc'), icon: <CheckCircle2 size={14} /> }
  ];
};

export const ScenarioPreviewPanel: React.FC<ScenarioPreviewPanelProps> = ({
  nodes,
  transitions,
  currentNodeId,
  history,
  entityLinks,
  entityLinksLoading = false,
  graphLoading = false,
  maps,
  characters,
  items,
  assets,
  locations,
  factions,
  events,
  onNavigate,
  onBack,
  onRestart,
  onOpenEntityLink
}) => {
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const startNode = useMemo(() => findStartNode(nodes, transitions), [nodes, transitions]);
  const currentNode = (currentNodeId ? nodeById.get(currentNodeId) : null) ?? startNode;
  const outgoingTransitions = useMemo(
    () => currentNode
      ? sortedTransitions(transitions.filter((transition) => transition.fromNodeId === currentNode.id))
      : [],
    [currentNode, transitions]
  );

  const getEntityTitle = (link: ScenarioNodeEntityLink): string => {
    if (link.targetType === 'map') {
      return maps.find((map) => map.id === link.targetId)?.name ?? `Карта #${link.targetId}`;
    }
    if (link.targetType === 'character') {
      return characters.find((character) => character.id === link.targetId)?.name ?? `Персонаж #${link.targetId}`;
    }

    if (link.targetType === 'item') {
      return items.find((item) => item.id === link.targetId)?.name ?? `Предмет #${link.targetId}`;
    }
    if (link.targetType === 'asset') {
      return assets.find((asset) => asset.id === link.targetId)?.name ?? `Ассет #${link.targetId}`;
    }
    if (link.targetType === 'location') {
      return locations.find((location) => location.id === link.targetId)?.name ?? `Локация #${link.targetId}`;
    }
    if (link.targetType === 'faction') {
      return factions.find((faction) => faction.id === link.targetId)?.name ?? `Фракция #${link.targetId}`;
    }

    return events.find((event) => event.id === link.targetId)?.title ?? `Событие #${link.targetId}`;
  };

  if (graphLoading && nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 mono text-[10px] uppercase text-[var(--text-muted)]">
        Загрузка graph-сценария...
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="border border-dashed border-[var(--border-color)] p-8 text-center mono text-[10px] uppercase text-[var(--text-muted)]">
          В графе пока нет узлов для прохождения
        </div>
      </div>
    );
  }

  if (!currentNode) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="border border-[var(--col-red)] bg-[var(--col-red)]/10 p-8 text-center mono text-[10px] uppercase text-[var(--col-red)]">
          Не удалось выбрать стартовый узел
        </div>
      </div>
    );
  }

  const configEntries = getConfigEntries(currentNode.type, currentNode.config)
    .filter((entry) => entry.value.trim().length > 0);
  const nodeMeta = NODE_TYPE_META[currentNode.type];
  const routeNodes = history
    .map((nodeId) => nodeById.get(nodeId))
    .filter((node): node is ScenarioNode => Boolean(node))
    .slice(-5);
  const outcomeTransitions = currentNode.type === 'check'
    ? outgoingTransitions.filter((transition) => transition.type === 'success' || transition.type === 'failure')
    : [];
  const routeTransitions = outgoingTransitions.filter((transition) =>
    currentNode.type === 'check'
      ? transition.type !== 'success' && transition.type !== 'failure'
      : true
  );
  const isTerminalNode = outgoingTransitions.length === 0;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--bg-main)]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 p-6 lg:p-8">
        <main className="space-y-6">
          <section
            className="border-2 bg-[var(--bg-surface)] p-6 lg:p-8 space-y-6"
            style={{ borderColor: isTerminalNode ? 'var(--col-red)' : nodeMeta.accent }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 mono text-[9px] uppercase font-black tracking-widest" style={{ color: nodeMeta.accent }}>
                  {nodeMeta.icon}
                  {nodeMeta.label} / ШАГ {history.length + 1}
                </div>
                <h2 className="mt-3 text-3xl lg:text-4xl font-black uppercase text-[var(--text-main)] leading-tight">
                  {currentNode.title || `Узел ${currentNode.orderIndex + 1}`}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="accent-red" size="sm" inverted disabled={history.length === 0} onClick={onBack}>
                  <ArrowLeft size={13} /> НАЗАД
                </Button>
                <Button variant="accent-red" size="sm" inverted onClick={() => onRestart(startNode?.id ?? null)}>
                  <RotateCcw size={13} /> СНАЧАЛА
                </Button>
              </div>
            </div>

            {isTerminalNode && (
              <div className="border border-[var(--col-red)] bg-[var(--col-red)]/10 p-4 mono text-[10px] uppercase font-black text-[var(--col-red)]">
                Финальный узел: прохождение этой ветки завершено
              </div>
            )}

            {currentNode.content ? (
              <div className="min-h-[220px] border border-[var(--border-color)] bg-[var(--input-bg)] p-6 mono text-sm leading-7 text-[var(--text-main)] whitespace-pre-wrap">
                {currentNode.content}
              </div>
            ) : (
              <div className="border border-dashed border-[var(--border-color)] bg-[var(--input-bg)] p-6 mono text-[10px] uppercase text-[var(--text-muted)]">
                У узла пока нет основного текста
              </div>
            )}

            {configEntries.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {configEntries.map((entry) => (
                  <div key={entry.label} className="border border-[var(--border-color)] bg-[var(--input-bg)] p-4">
                    <div className="inline-flex items-center gap-2 mono text-[8px] uppercase text-[var(--text-muted)]">
                      {entry.icon}
                      {entry.label}
                    </div>
                    <div className="mt-3 mono text-[11px] uppercase font-black text-[var(--text-main)] leading-relaxed">{entry.value}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {outcomeTransitions.length > 0 && (
            <section className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-4">
              <div className="mono text-[10px] uppercase font-black text-[var(--text-main)]">
                Исходы проверки
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {outcomeTransitions.map((transition) => {
                  const targetNode = nodeById.get(transition.toNodeId);
                  const disabled = !targetNode;
                  const isSuccess = transition.type === 'success';

                  return (
                    <button
                      key={transition.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => targetNode && onNavigate(currentNode.id, targetNode.id)}
                      className="min-h-[86px] border-2 bg-[var(--input-bg)] p-4 text-left disabled:opacity-50 transition-colors"
                      style={{ borderColor: isSuccess ? 'var(--col-teal)' : 'var(--col-red)' }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 mono text-[9px] uppercase font-black" style={{ color: isSuccess ? 'var(--col-teal)' : 'var(--col-red)' }}>
                          {isSuccess ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {TRANSITION_LABELS[transition.type]}
                        </span>
                        <span className="mono text-[8px] uppercase text-[var(--text-muted)]">
                          {disabled ? 'СЛОМАННАЯ ССЫЛКА' : `К УЗЛУ #${targetNode.orderIndex + 1}`}
                        </span>
                      </div>
                      <div className="mt-3 mono text-[10px] uppercase font-black text-[var(--text-main)]">
                        {transition.label?.trim() || targetNode?.title || TRANSITION_LABELS[transition.type]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-4">
            <div className="mono text-[10px] uppercase font-black text-[var(--text-main)]">
              Доступные переходы
            </div>
            {routeTransitions.length === 0 ? (
              <div className="border border-dashed border-[var(--border-color)] p-5 mono text-[10px] uppercase text-[var(--text-muted)]">
                {isTerminalNode ? 'Исходящих переходов нет' : 'Обычных переходов нет'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {routeTransitions.map((transition) => {
                  const targetNode = nodeById.get(transition.toNodeId);
                  const disabled = !targetNode;
                  const title = transition.label?.trim() || targetNode?.title || TRANSITION_LABELS[transition.type];

                  return (
                    <button
                      key={transition.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => targetNode && onNavigate(currentNode.id, targetNode.id)}
                      className="min-h-[72px] border-2 bg-[var(--input-bg)] p-4 text-left hover:border-[var(--col-red)] disabled:opacity-50 disabled:hover:border-[var(--border-color)] transition-colors"
                      style={{ borderColor: TRANSITION_ACCENTS[transition.type] }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="mono text-[8px] uppercase font-black" style={{ color: TRANSITION_ACCENTS[transition.type] }}>
                          {TRANSITION_LABELS[transition.type]}
                        </span>
                        <span className="mono text-[8px] uppercase text-[var(--text-muted)]">
                          {disabled ? 'СЛОМАННАЯ ССЫЛКА' : `К УЗЛУ #${targetNode.orderIndex + 1}`}
                        </span>
                      </div>
                      <div className="mt-2 mono text-[10px] uppercase font-black text-[var(--text-main)]">
                        {title}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </main>

        <aside className="space-y-6">
          <section className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-4">
            <div className="mono text-[10px] uppercase font-black text-[var(--text-main)]">
              Маршрут
            </div>
            {routeNodes.length === 0 ? (
              <div className="border border-dashed border-[var(--border-color)] p-4 mono text-[9px] uppercase text-[var(--text-muted)]">
                История появится после первого перехода
              </div>
            ) : (
              <div className="space-y-2">
                {routeNodes.map((node, index) => (
                  <div key={`${node.id}-${index}`} className="border border-[var(--border-color)] bg-[var(--input-bg)] p-3">
                    <div className="mono text-[8px] uppercase text-[var(--text-muted)]">
                      ШАГ {history.length - routeNodes.length + index + 1} / {getNodeTypeLabel(node.type)}
                    </div>
                    <div className="mt-1 mono text-[10px] uppercase font-black text-[var(--text-main)] truncate">
                      {node.title || `Узел ${node.orderIndex + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link2 size={14} className="text-[var(--col-red)]" />
              <span className="mono text-[10px] uppercase font-black text-[var(--text-main)]">Связанные материалы</span>
            </div>
            {entityLinksLoading && (
              <span className="mono text-[8px] uppercase text-[var(--text-muted)]">Загрузка...</span>
            )}
          </div>

          {entityLinks.length === 0 ? (
            <div className="border border-dashed border-[var(--border-color)] p-4 mono text-[9px] uppercase text-[var(--text-muted)]">
              У текущего узла нет связанных материалов
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {entityLinks.map((link) => (
                <div key={link.id} className="border border-[var(--border-color)] bg-[var(--input-bg)] p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mono text-[8px] uppercase text-[var(--text-muted)]">
                      {ENTITY_TARGET_LABELS[link.targetType]} {link.label ? ` / ${link.label}` : ''}
                    </div>
                    <div className="mt-1 mono text-[10px] uppercase font-black text-[var(--text-main)] truncate">
                      {getEntityTitle(link)}
                    </div>
                  </div>
                  {onOpenEntityLink && (
                    <button
                      type="button"
                      onClick={() => onOpenEntityLink(link.targetType, link.targetId)}
                      className="h-8 px-3 inline-flex items-center gap-2 border border-[var(--col-red)] text-[var(--col-red)] hover:bg-[var(--col-red)] hover:text-white mono text-[8px] uppercase font-black transition-colors"
                    >
                      <ExternalLink size={12} />
                      Открыть
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          </section>
        </aside>
      </div>
    </div>
  );
};
