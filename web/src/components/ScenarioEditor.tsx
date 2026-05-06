import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Plus, RefreshCw, Settings } from 'lucide-react';
import { Button, SectionHeader } from './UI';
import { Modal } from './Modal';
import {
  Campaign,
  Character,
  Asset,
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
  ScenarioNode,
  ScenarioNodeConfig,
  ScenarioNodeEntityLink,
  ScenarioNodeEntityLinkCreatePayload,
  ScenarioNodeEntityTargetType,
  ScenarioNodeType,
  ScenarioTransition,
  ScenarioTransitionCondition,
  ScenarioTransitionMetadata,
  ScenarioTransitionType,
  Tag,
  TagAssignmentMap,
  TaggableTargetType,
  WorldEvent,
  WorldLocation
} from '../types';
import { apiRequest } from '../lib/api';
import {
  createScenarioNode,
  createScenarioNodeEntityLink,
  createScenarioTransition,
  deleteScenarioNode,
  deleteScenarioNodeEntityLink,
  deleteScenarioTransition,
  exportScenarioPdf,
  listScenarioNodeEntityLinks,
  listScenarioNodes,
  listScenarioTransitions,
  updateScenarioNode,
  updateScenarioTransition
} from '../lib/scenarioApi';
import {
  mapCharacterFromApi,
  mapMapFromApi,
  mapScenarioDetail,
  mapScenarioSummary,
  entityLinkAssignmentKey,
  publicationAssignmentKey,
  tagAssignmentKey
} from '../lib/mappers';
import { GraphInspector, GraphInspectorTab } from './scenario/GraphInspector';
import { ScenarioGraphWorkspace } from './scenario/ScenarioGraphWorkspace';
import { ScenarioListPanel } from './scenario/ScenarioListPanel';
import { ScenarioPreviewWorkspace } from './scenario/ScenarioPreviewWorkspace';
import { ScenarioSettingsPanel } from './scenario/ScenarioSettingsPanel';
import { GraphValidationIssue, validateScenarioGraph } from './scenario/graphValidation';

interface ScenarioEditorProps {
  data: Scenario[];
  onUpdate: (data: Scenario[]) => void;
  campaigns: Campaign[];
  characters: Character[];
  items: Item[];
  maps: MapData[];
  assets: Asset[];
  locations: WorldLocation[];
  factions: Faction[];
  events: WorldEvent[];
  onUpdateCharacters: (data: Character[]) => void;
  onUpdateMaps: (data: MapData[]) => void;
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
  initialScenarioId?: string | null;
  onOpenEntityLink?: (targetType: ScenarioNodeEntityTargetType, targetId: string, sourceScenarioId: string) => void;
}

type ScenarioTab = 'graph' | 'preview';
type AutosaveState = 'saved' | 'saving' | 'unsaved';
type GraphPositionChange = {
  nodeId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
};
type GraphHistoryAction =
  | { type: 'node-position'; change: GraphPositionChange }
  | { type: 'node-layout'; changes: GraphPositionChange[] }
  | { type: 'transition-update'; before: ScenarioTransition; after: ScenarioTransition }
  | { type: 'transition-create'; transition: ScenarioTransition }
  | { type: 'transition-delete'; transition: ScenarioTransition };

const DEFAULT_NODE_TYPE: ScenarioNodeType = 'description';
const GRAPH_HISTORY_LIMIT = 50;

const sameJson = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const transitionUpdatePayload = (transition: ScenarioTransition) => ({
  type: transition.type,
  label: transition.label ?? '',
  condition: transition.condition,
  metadata: transition.metadata
});

const transitionCreatePayload = (transition: ScenarioTransition) => ({
  fromNodeId: transition.fromNodeId,
  toNodeId: transition.toNodeId,
  type: transition.type,
  label: transition.label ?? '',
  condition: transition.condition,
  metadata: transition.metadata,
  orderIndex: transition.orderIndex
});

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
  data,
  onUpdate,
  campaigns,
  characters,
  items,
  maps,
  assets,
  locations,
  factions,
  events,
  onUpdateCharacters,
  onUpdateMaps,
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
  initialScenarioId,
  onOpenEntityLink
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ScenarioTab>('graph');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('saved');
  const [loadingScenarioId, setLoadingScenarioId] = useState<string | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphActionPending, setGraphActionPending] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [graphLoadedScenarioId, setGraphLoadedScenarioId] = useState<string | null>(null);
  const [scenarioNodes, setScenarioNodes] = useState<ScenarioNode[]>([]);
  const [scenarioTransitions, setScenarioTransitions] = useState<ScenarioTransition[]>([]);
  const [activeTransitionId, setActiveTransitionId] = useState<string | null>(null);
  const [selectedNodeEntityLinks, setSelectedNodeEntityLinks] = useState<ScenarioNodeEntityLink[]>([]);
  const [entityLinksLoading, setEntityLinksLoading] = useState(false);
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);
  const [previewHistory, setPreviewHistory] = useState<string[]>([]);
  const [previewEntityLinks, setPreviewEntityLinks] = useState<ScenarioNodeEntityLink[]>([]);
  const [previewEntityLinksLoading, setPreviewEntityLinksLoading] = useState(false);
  const [newNodeType, setNewNodeType] = useState<ScenarioNodeType>(DEFAULT_NODE_TYPE);
  const [graphNodeListOpen, setGraphNodeListOpen] = useState(true);
  const [graphInspectorOpen, setGraphInspectorOpen] = useState(false);
  const [graphInspectorTab, setGraphInspectorTab] = useState<GraphInspectorTab>('properties');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [undoStack, setUndoStack] = useState<GraphHistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<GraphHistoryAction[]>([]);

  const initialScenarioAppliedRef = useRef<string | null>(null);
  const graphHistoryReplayRef = useRef(false);

  const activeScenario = data.find((scenario) => scenario.id === activeId);
  const selectedNode = scenarioNodes.find((node) => node.id === activeNodeId) ?? null;
  const selectedNodeTransitions = selectedNode
    ? scenarioTransitions.filter((transition) => transition.fromNodeId === selectedNode.id)
    : [];
  const graphValidation = useMemo(
    () => validateScenarioGraph(scenarioNodes, scenarioTransitions),
    [scenarioNodes, scenarioTransitions]
  );

  const relatedCharacters = activeScenario
    ? characters.filter((character) => character.scenarioId === activeScenario.id)
    : [];
  const relatedMaps = activeScenario ? maps.filter((map) => map.scenarioId === activeScenario.id) : [];
  const visibleScenarios = data.filter((scenario) => {
    const matchesSearch = scenario.title.toLowerCase().includes(searchQuery.toLowerCase());
    const assignedTags = tagAssignments[tagAssignmentKey('scenario', scenario.id)] ?? [];
    const matchesTag = !selectedTagFilter || assignedTags.some((tag) => tag.id === selectedTagFilter);
    return matchesSearch && matchesTag;
  });
  const activeScenarioTags = activeScenario
    ? tagAssignments[tagAssignmentKey('scenario', activeScenario.id)] ?? []
    : [];
  const activeScenarioEntityLinks = activeScenario
    ? entityLinks[entityLinkAssignmentKey('scenario', activeScenario.id)] ?? []
    : [];
  const activeScenarioPublication = activeScenario
    ? publicationAssignments[publicationAssignmentKey('scenario', activeScenario.id)]
    : undefined;

  const setScenario = (scenarioId: string, updater: (scenario: Scenario) => Scenario) => {
    onUpdate(
      data.map((scenario) => {
        if (scenario.id !== scenarioId) return scenario;
        return { ...updater(scenario), updatedAt: new Date().toISOString() };
      })
    );
  };

  const triggerAutosave = () => {
    setAutosaveState('saving');
    setTimeout(() => setAutosaveState('saved'), 800);
  };

  const clearGraphHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const pushGraphHistory = useCallback((action: GraphHistoryAction) => {
    if (graphHistoryReplayRef.current) return;

    setUndoStack((current) => [...current, action].slice(-GRAPH_HISTORY_LIMIT));
    setRedoStack([]);
  }, []);

  const resetGraphState = () => {
    setScenarioNodes([]);
    setScenarioTransitions([]);
    setActiveTransitionId(null);
    setSelectedNodeEntityLinks([]);
    setPreviewNodeId(null);
    setPreviewHistory([]);
    setPreviewEntityLinks([]);
    setActiveNodeId(null);
    setGraphInspectorOpen(false);
    setGraphInspectorTab('properties');
    setGraphLoadedScenarioId(null);
    setGraphError(null);
    setGraphActionPending(false);
    clearGraphHistory();
  };

  const loadScenarioGraph = useCallback(async (scenarioId: string) => {
    setGraphLoading(true);
    setGraphError(null);
    try {
      const [nodes, transitions] = await Promise.all([
        listScenarioNodes(scenarioId),
        listScenarioTransitions(scenarioId)
      ]);
      setScenarioNodes(nodes);
      setScenarioTransitions(transitions);
      setActiveNodeId((current) => (current && nodes.some((node) => node.id === current) ? current : nodes[0]?.id ?? null));
      setPreviewNodeId(null);
      setPreviewHistory([]);
      setPreviewEntityLinks([]);
      setGraphLoadedScenarioId(scenarioId);
      clearGraphHistory();
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось загрузить граф сценария'));
    } finally {
      setGraphLoading(false);
    }
  }, [clearGraphHistory]);

  const loadSelectedNodeEntityLinks = useCallback(async (nodeId: string) => {
    setEntityLinksLoading(true);
    setGraphError(null);
    try {
      const links = await listScenarioNodeEntityLinks(nodeId);
      setSelectedNodeEntityLinks(links);
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось загрузить связи узла'));
    } finally {
      setEntityLinksLoading(false);
    }
  }, []);

  const loadPreviewNodeEntityLinks = useCallback(async (nodeId: string) => {
    setPreviewEntityLinksLoading(true);
    setGraphError(null);
    try {
      const links = await listScenarioNodeEntityLinks(nodeId);
      setPreviewEntityLinks(links);
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось загрузить связи preview-узла'));
    } finally {
      setPreviewEntityLinksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialScenarioId) return;
    if (initialScenarioAppliedRef.current === initialScenarioId) return;
    const targetScenario = data.find((scenario) => scenario.id === initialScenarioId);
    if (!targetScenario) return;
    initialScenarioAppliedRef.current = initialScenarioId;
    setActiveId(initialScenarioId);
    setActiveTab('graph');
  }, [initialScenarioId, data]);

  useEffect(() => {
    if (!activeId || graphLoadedScenarioId === activeId) return;
    void loadScenarioGraph(activeId);
  }, [activeId, graphLoadedScenarioId, loadScenarioGraph]);

  useEffect(() => {
    if (!selectedNode || activeTab !== 'graph') {
      setSelectedNodeEntityLinks([]);
      return;
    }

    void loadSelectedNodeEntityLinks(selectedNode.id);
  }, [activeTab, loadSelectedNodeEntityLinks, selectedNode]);

  useEffect(() => {
    if (activeTab !== 'preview' || scenarioNodes.length === 0) {
      setPreviewEntityLinks([]);
      return;
    }

    const incoming = new Set(scenarioTransitions.map((transition) => transition.toNodeId));
    const startNode = [...scenarioNodes]
      .sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id))
      .find((node) => !incoming.has(node.id)) ?? [...scenarioNodes].sort((a, b) => a.orderIndex - b.orderIndex || a.id.localeCompare(b.id))[0];

    if (!previewNodeId || !scenarioNodes.some((node) => node.id === previewNodeId)) {
      setPreviewNodeId(startNode?.id ?? null);
      setPreviewHistory([]);
    }
  }, [activeTab, previewNodeId, scenarioNodes, scenarioTransitions]);

  useEffect(() => {
    if (activeTab !== 'preview' || !previewNodeId) {
      setPreviewEntityLinks([]);
      return;
    }

    void loadPreviewNodeEntityLinks(previewNodeId);
  }, [activeTab, loadPreviewNodeEntityLinks, previewNodeId]);

  const handleCreateScenario = async () => {
    try {
      const created = await apiRequest('/scenarios', {
        method: 'POST',
        body: JSON.stringify({ title: 'НОВЫЙ СЦЕНАРИЙ', description: '' })
      });
      const scenario = mapScenarioSummary(created);
      onUpdate([...data, scenario]);
      setActiveId(scenario.id);
      setActiveTab('graph');
      resetGraphState();
      setGraphLoadedScenarioId(scenario.id);
    } catch {
      // ignore
    }
  };

  const handleSelectScenario = async (scenarioId: string) => {
    setLoadingScenarioId(scenarioId);
    resetGraphState();
    try {
      const detail = await apiRequest(`/scenarios/${scenarioId}`);
      const mapped = mapScenarioDetail(detail);
      onUpdate(data.map((scenario) => (scenario.id === scenarioId ? mapped : scenario)));
      setActiveId(scenarioId);
      setActiveTab('graph');
    } catch {
      setActiveId(scenarioId);
      setActiveTab('graph');
    } finally {
      setLoadingScenarioId(null);
    }
  };

  const handleDeleteScenario = async (scenarioId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm('Удалить сценарий?')) return;
    try {
      await apiRequest(`/scenarios/${scenarioId}`, { method: 'DELETE' });
      onUpdate(data.filter((scenario) => scenario.id !== scenarioId));
      if (activeId === scenarioId) {
        setActiveId(null);
        resetGraphState();
      }
    } catch {
      // ignore
    }
  };

  const updateScenarioField = (field: keyof Scenario, value: string) => {
    if (!activeId) return;
    setScenario(activeId, (scenario) => ({ ...scenario, [field]: value }));
    if (field === 'title' || field === 'description' || field === 'campaignId') {
      const payload = field === 'campaignId' ? { campaign_id: value || null } : { [field]: value };
      triggerAutosave();
      apiRequest(`/scenarios/${activeId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }).catch(() => null);
    }
  };

  const handleExportPdf = async () => {
    if (!activeScenario) return;
    const shouldWarnAboutGraphValidation = graphLoadedScenarioId === activeScenario.id && scenarioNodes.length > 0;
    const validationIssueCount = shouldWarnAboutGraphValidation
      ? graphValidation.errorCount + graphValidation.warningCount
      : 0;
    if (validationIssueCount > 0) {
      const confirmed = window.confirm(
        `Проверка графа нашла ${graphValidation.errorCount} ошибок и ${graphValidation.warningCount} предупреждений. Экспортировать PDF все равно?`
      );
      if (!confirmed) return;
    }

    try {
      const blob = await exportScenarioPdf(activeScenario.id);
      if (!blob) return;
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
    const target = characters.find((character) => character.id === id);
    if (!target) return;
    const nextScenarioId = target.scenarioId === activeScenario.id ? null : activeScenario.id;
    try {
      const updated = await apiRequest(`/characters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ scenario_id: nextScenarioId })
      });
      const mapped = mapCharacterFromApi(updated);
      onUpdateCharacters(characters.map((character) => (character.id === mapped.id ? mapped : character)));
    } catch {
      // ignore
    }
  };

  const toggleMapRelation = async (id: string) => {
    if (!activeScenario) return;
    const target = maps.find((map) => map.id === id);
    if (!target) return;
    const nextScenarioId = target.scenarioId === activeScenario.id ? null : activeScenario.id;
    try {
      const updated = await apiRequest(`/maps/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ scenario_id: nextScenarioId })
      });
      const mapped = mapMapFromApi(updated);
      onUpdateMaps(maps.map((map) => (map.id === mapped.id ? mapped : map)));
    } catch {
      // ignore
    }
  };

  const handleCreateNode = async () => {
    if (!activeScenario || graphActionPending) return;
    setGraphActionPending(true);
    setGraphError(null);
    try {
      const node = await createScenarioNode(activeScenario.id, {
        type: newNodeType,
        title: `Узел ${scenarioNodes.length + 1}`,
        content: '',
        position: { x: 120 + scenarioNodes.length * 60, y: 120 + scenarioNodes.length * 36 },
        config: {},
        orderIndex: scenarioNodes.length
      });
      setScenarioNodes((current) => [...current, node]);
      setActiveNodeId(node.id);
      setGraphInspectorOpen(true);
      setGraphInspectorTab('properties');
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось создать узел'));
    } finally {
      setGraphActionPending(false);
    }
  };

  const handleUpdateNode = async (
    nodeId: string,
    payload: { type: ScenarioNodeType; title: string; content: string; config: ScenarioNodeConfig }
  ) => {
    if (graphActionPending) return;
    setGraphActionPending(true);
    setGraphError(null);
    try {
      const updated = await updateScenarioNode(nodeId, payload);
      setScenarioNodes((current) => current.map((node) => (node.id === updated.id ? updated : node)));
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось сохранить узел'));
    } finally {
      setGraphActionPending(false);
    }
  };

  const handleMoveNode = async (
    nodeId: string,
    position: Record<string, unknown>,
    previousPosition?: Record<string, unknown>
  ) => {
    if (graphActionPending) return;

    setGraphError(null);
    setScenarioNodes((current) =>
      current.map((node) => (node.id === nodeId ? { ...node, position } : node))
    );

    try {
      const updated = await updateScenarioNode(nodeId, { position });
      setScenarioNodes((current) => current.map((node) => (node.id === updated.id ? updated : node)));
      const before = previousPosition ?? scenarioNodes.find((node) => node.id === nodeId)?.position;
      if (before && !sameJson(before, updated.position)) {
        pushGraphHistory({
          type: 'node-position',
          change: {
            nodeId,
            before,
            after: updated.position
          }
        });
      }
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось сохранить позицию узла'));
    }
  };

  const handleLayoutNodes = async (updates: { nodeId: string; position: Record<string, unknown> }[]) => {
    if (graphActionPending || updates.length === 0) return;

    setGraphActionPending(true);
    setGraphError(null);
    const nodeById = new Map(scenarioNodes.map((node) => [node.id, node]));
    const positionById = new Map(updates.map((update) => [update.nodeId, update.position]));
    setScenarioNodes((current) =>
      current.map((node) => {
        const position = positionById.get(node.id);
        return position ? { ...node, position } : node;
      })
    );

    try {
      const updatedNodes = await Promise.all(
        updates.map((update) => updateScenarioNode(update.nodeId, { position: update.position }))
      );
      const updatedById = new Map(updatedNodes.map((node) => [node.id, node]));
      setScenarioNodes((current) => current.map((node) => updatedById.get(node.id) ?? node));
      const changes = updatedNodes
        .map((node): GraphPositionChange | null => {
          const before = nodeById.get(node.id)?.position;
          if (!before || sameJson(before, node.position)) return null;
          return { nodeId: node.id, before, after: node.position };
        })
        .filter((change): change is GraphPositionChange => Boolean(change));
      if (changes.length > 0) {
        pushGraphHistory({ type: 'node-layout', changes });
      }
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось упорядочить граф'));
    } finally {
      setGraphActionPending(false);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (graphActionPending) return;
    if (!confirm('Удалить узел и его переходы?')) return;
    setGraphActionPending(true);
    setGraphError(null);
    try {
      await deleteScenarioNode(nodeId);
      const remainingNodes = scenarioNodes.filter((node) => node.id !== nodeId);
      setScenarioNodes(remainingNodes);
      setScenarioTransitions((current) =>
        current.filter((transition) => transition.fromNodeId !== nodeId && transition.toNodeId !== nodeId)
      );
      setActiveTransitionId((current) => {
        const removed = scenarioTransitions.some(
          (transition) =>
            transition.id === current && (transition.fromNodeId === nodeId || transition.toNodeId === nodeId)
        );
        return removed ? null : current;
      });
      setSelectedNodeEntityLinks((current) => (activeNodeId === nodeId ? [] : current));
      setActiveNodeId((current) => (current === nodeId ? null : current));
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось удалить узел'));
    } finally {
      setGraphActionPending(false);
    }
  };

  const handleCreateTransitionBetween = async (fromNodeId: string, toNodeId: string) => {
    if (!activeScenario || graphActionPending || fromNodeId === toNodeId) return;
    setGraphActionPending(true);
    setGraphError(null);
    try {
      const orderIndex = scenarioTransitions.filter((transition) => transition.fromNodeId === fromNodeId).length;
      const transition = await createScenarioTransition(activeScenario.id, {
        fromNodeId,
        toNodeId,
        type: 'linear',
        label: '',
        condition: {},
        orderIndex
      });
      setScenarioTransitions((current) => [...current, transition]);
      setActiveTransitionId(transition.id);
      setActiveNodeId(fromNodeId);
      setGraphInspectorOpen(true);
      setGraphInspectorTab('transitions');
      pushGraphHistory({ type: 'transition-create', transition });
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось создать переход'));
    } finally {
      setGraphActionPending(false);
    }
  };

  const handleCreateTransition = async (toNodeId: string) => {
    if (!selectedNode) return;
    await handleCreateTransitionBetween(selectedNode.id, toNodeId);
  };

  const handleUpdateTransition = async (
    transitionId: string,
    payload: {
      type: ScenarioTransitionType;
      label: string;
      condition: ScenarioTransitionCondition;
      metadata?: ScenarioTransitionMetadata;
    }
  ) => {
    if (graphActionPending) return;
    const before = scenarioTransitions.find((transition) => transition.id === transitionId);
    setGraphActionPending(true);
    setGraphError(null);
    try {
      const updated = await updateScenarioTransition(transitionId, payload);
      setScenarioTransitions((current) =>
        current.map((transition) => (transition.id === updated.id ? updated : transition))
      );
      setActiveTransitionId(updated.id);
      if (before && !sameJson(transitionUpdatePayload(before), transitionUpdatePayload(updated))) {
        pushGraphHistory({ type: 'transition-update', before, after: updated });
      }
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось сохранить переход'));
    } finally {
      setGraphActionPending(false);
    }
  };

  const handleDeleteTransition = async (transitionId: string) => {
    if (graphActionPending) return;
    const transition = scenarioTransitions.find((item) => item.id === transitionId);
    setGraphActionPending(true);
    setGraphError(null);
    try {
      await deleteScenarioTransition(transitionId);
      setScenarioTransitions((current) => current.filter((transition) => transition.id !== transitionId));
      setActiveTransitionId((current) => (current === transitionId ? null : current));
      if (transition) {
        pushGraphHistory({ type: 'transition-delete', transition });
      }
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось удалить переход'));
    } finally {
      setGraphActionPending(false);
    }
  };

  const applyGraphPositionChanges = async (
    changes: GraphPositionChange[],
    target: 'before' | 'after'
  ): Promise<GraphPositionChange[]> => {
    const targetById = new Map(changes.map((change) => [change.nodeId, change[target]]));
    setScenarioNodes((current) =>
      current.map((node) => {
        const position = targetById.get(node.id);
        return position ? { ...node, position } : node;
      })
    );

    const updatedNodes = await Promise.all(
      changes.map((change) => updateScenarioNode(change.nodeId, { position: change[target] }))
    );
    const updatedById = new Map(updatedNodes.map((node) => [node.id, node]));
    setScenarioNodes((current) => current.map((node) => updatedById.get(node.id) ?? node));
    const selectedNodeId = changes[0]?.nodeId;
    if (selectedNodeId) {
      setActiveNodeId(selectedNodeId);
      setActiveTransitionId(null);
    }

    return changes.map((change) => ({
      ...change,
      [target]: updatedById.get(change.nodeId)?.position ?? change[target]
    }));
  };

  const undoGraphAction = async (action: GraphHistoryAction): Promise<GraphHistoryAction> => {
    switch (action.type) {
      case 'node-position': {
        const [change] = await applyGraphPositionChanges([action.change], 'before');
        return { type: 'node-position', change: { ...action.change, before: change.before } };
      }
      case 'node-layout': {
        const changes = await applyGraphPositionChanges(action.changes, 'before');
        return { type: 'node-layout', changes };
      }
      case 'transition-update': {
        const updated = await updateScenarioTransition(action.before.id, transitionUpdatePayload(action.before));
        setScenarioTransitions((current) =>
          current.map((transition) => (transition.id === updated.id ? updated : transition))
        );
        setActiveTransitionId(updated.id);
        setActiveNodeId(updated.fromNodeId);
        return { type: 'transition-update', before: updated, after: action.after };
      }
      case 'transition-create': {
        await deleteScenarioTransition(action.transition.id);
        setScenarioTransitions((current) => current.filter((transition) => transition.id !== action.transition.id));
        setActiveTransitionId(null);
        setActiveNodeId(action.transition.fromNodeId);
        return action;
      }
      case 'transition-delete': {
        const restored = await createScenarioTransition(action.transition.scenarioId, transitionCreatePayload(action.transition));
        setScenarioTransitions((current) => [...current, restored]);
        setActiveTransitionId(restored.id);
        setActiveNodeId(restored.fromNodeId);
        return { type: 'transition-delete', transition: restored };
      }
    }
  };

  const redoGraphAction = async (action: GraphHistoryAction): Promise<GraphHistoryAction> => {
    switch (action.type) {
      case 'node-position': {
        const [change] = await applyGraphPositionChanges([action.change], 'after');
        return { type: 'node-position', change: { ...action.change, after: change.after } };
      }
      case 'node-layout': {
        const changes = await applyGraphPositionChanges(action.changes, 'after');
        return { type: 'node-layout', changes };
      }
      case 'transition-update': {
        const updated = await updateScenarioTransition(action.after.id, transitionUpdatePayload(action.after));
        setScenarioTransitions((current) =>
          current.map((transition) => (transition.id === updated.id ? updated : transition))
        );
        setActiveTransitionId(updated.id);
        setActiveNodeId(updated.fromNodeId);
        return { type: 'transition-update', before: action.before, after: updated };
      }
      case 'transition-create': {
        const restored = await createScenarioTransition(action.transition.scenarioId, transitionCreatePayload(action.transition));
        setScenarioTransitions((current) => [...current, restored]);
        setActiveTransitionId(restored.id);
        setActiveNodeId(restored.fromNodeId);
        return { type: 'transition-create', transition: restored };
      }
      case 'transition-delete': {
        await deleteScenarioTransition(action.transition.id);
        setScenarioTransitions((current) => current.filter((transition) => transition.id !== action.transition.id));
        setActiveTransitionId(null);
        setActiveNodeId(action.transition.fromNodeId);
        return action;
      }
    }
  };

  const handleUndoGraphAction = async () => {
    if (graphActionPending || undoStack.length === 0) return;

    const action = undoStack[undoStack.length - 1];
    setGraphActionPending(true);
    setGraphError(null);
    graphHistoryReplayRef.current = true;

    try {
      const redoAction = await undoGraphAction(action);
      setUndoStack((current) => current.slice(0, -1));
      setRedoStack((current) => [...current, redoAction].slice(-GRAPH_HISTORY_LIMIT));
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось отменить действие'));
    } finally {
      graphHistoryReplayRef.current = false;
      setGraphActionPending(false);
    }
  };

  const handleRedoGraphAction = async () => {
    if (graphActionPending || redoStack.length === 0) return;

    const action = redoStack[redoStack.length - 1];
    setGraphActionPending(true);
    setGraphError(null);
    graphHistoryReplayRef.current = true;

    try {
      const undoAction = await redoGraphAction(action);
      setRedoStack((current) => current.slice(0, -1));
      setUndoStack((current) => [...current, undoAction].slice(-GRAPH_HISTORY_LIMIT));
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось повторить действие'));
    } finally {
      graphHistoryReplayRef.current = false;
      setGraphActionPending(false);
    }
  };

  const handleCreateEntityLink = async (payload: ScenarioNodeEntityLinkCreatePayload) => {
    if (!selectedNode || graphActionPending) return;
    setGraphActionPending(true);
    setGraphError(null);
    try {
      const link = await createScenarioNodeEntityLink(selectedNode.id, payload);
      setSelectedNodeEntityLinks((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== link.id);
        return [...withoutDuplicate, link];
      });
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось добавить связь узла'));
    } finally {
      setGraphActionPending(false);
    }
  };

  const handleDeleteEntityLink = async (linkId: string) => {
    if (graphActionPending) return;
    setGraphActionPending(true);
    setGraphError(null);
    try {
      await deleteScenarioNodeEntityLink(linkId);
      setSelectedNodeEntityLinks((current) => current.filter((link) => link.id !== linkId));
      setGraphError(null);
    } catch (error) {
      setGraphError(getErrorMessage(error, 'Не удалось удалить связь узла'));
    } finally {
      setGraphActionPending(false);
    }
  };

  const handleSelectGraphNode = (nodeId: string) => {
    setActiveTransitionId(null);
    setActiveNodeId(nodeId);
    setGraphInspectorOpen(true);
    setGraphInspectorTab('properties');
    setGraphNodeListOpen(false);
  };

  const handleClearGraphSelection = () => {
    setActiveTransitionId(null);
    setActiveNodeId(null);
    setSelectedNodeEntityLinks([]);
  };

  const handleSelectGraphTransition = (transitionId: string | null) => {
    setActiveTransitionId(transitionId);

    if (!transitionId) return;

    const transition = scenarioTransitions.find((item) => item.id === transitionId);
    if (!transition) return;

    setActiveNodeId(transition.fromNodeId);
    setGraphInspectorOpen(true);
    setGraphInspectorTab('transitions');
  };

  const handleSelectValidationIssue = (issue: GraphValidationIssue) => {
    if (issue.transitionId) {
      handleSelectGraphTransition(issue.transitionId);
      return;
    }

    if (issue.nodeId) {
      handleSelectGraphNode(issue.nodeId);
    }
  };

  const handleOpenEntityLink = (targetType: ScenarioNodeEntityTargetType, targetId: string) => {
    if (!activeScenario) return;
    onOpenEntityLink?.(targetType, targetId, activeScenario.id);
  };

  const handlePreviewNavigate = (fromNodeId: string, toNodeId: string) => {
    setPreviewHistory((current) => [...current, fromNodeId]);
    setPreviewNodeId(toNodeId);
  };

  const handlePreviewBack = () => {
    setPreviewHistory((current) => {
      const previousNodeId = current[current.length - 1];
      if (previousNodeId) {
        setPreviewNodeId(previousNodeId);
      }

      return current.slice(0, -1);
    });
  };

  const handlePreviewRestart = (startNodeId: string | null) => {
    setPreviewNodeId(startNodeId);
    setPreviewHistory([]);
  };

  if (!activeId) {
    return (
      <div className="flex h-full w-full bg-[var(--bg-main)]">
        <div className="flex-1 flex flex-col min-w-0 bauhaus-bg relative border-r border-[var(--border-color)]">
          <div className="px-12 pt-12 pb-6 shrink-0 z-10">
            <div className="mx-auto w-full max-w-7xl">
              <SectionHeader
                title="СЦЕНАРНАЯ МАСТЕРСКАЯ"
                subtitle="КОНСТРУКТОР СЮЖЕТОВ"
                accentColor="var(--col-red)"
              />
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-70">
            <Button variant="accent-red" onClick={handleCreateScenario}>
              <Plus size={16} /> СОЗДАТЬ СЦЕНАРИЙ
            </Button>
          </div>
        </div>
        <ScenarioListPanel
          scenarios={visibleScenarios}
          searchQuery={searchQuery}
          tags={tags}
          selectedTagId={selectedTagFilter}
          loadingScenarioId={loadingScenarioId}
          onSearchChange={setSearchQuery}
          onTagFilterChange={setSelectedTagFilter}
          onSelectScenario={handleSelectScenario}
          onDeleteScenario={handleDeleteScenario}
          onCreateScenario={handleCreateScenario}
        />
      </div>
    );
  }

  if (!activeScenario) {
    return null;
  }

  return (
    <div className="flex h-full w-full bg-[var(--bg-main)]">
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-main)] bauhaus-bg relative border-r border-[var(--border-color)]">
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center gap-6 bg-[var(--bg-main)] z-50">
          <button
            onClick={() => {
              setActiveId(null);
              resetGraphState();
            }}
            className="w-10 h-10 flex items-center justify-center border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--col-red)] hover:border-[var(--col-red)] transition-all"
            title="Назад"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="h-8 w-[1px] bg-[var(--border-color)]" />
          <input
            value={activeScenario.title}
            onChange={(event) => updateScenarioField('title', event.target.value.toUpperCase())}
            className="bg-transparent border-b-2 border-transparent focus:border-[var(--col-red)] text-2xl font-black uppercase text-[var(--text-main)] focus:outline-none placeholder:text-[var(--text-muted)] flex-1 min-w-0"
            placeholder="НАЗВАНИЕ..."
          />
          <div className="flex items-center gap-1 border border-[var(--border-color)] p-1">
            <button
              onClick={() => {
                setActiveTab('graph');
                if (activeId && graphLoadedScenarioId !== activeId) void loadScenarioGraph(activeId);
              }}
              className={`px-3 h-8 mono text-[9px] uppercase font-black transition-all ${
                activeTab === 'graph'
                  ? 'bg-[var(--col-red)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              ГРАФ СЦЕНАРИЯ
            </button>
            <button
              onClick={() => {
                setActiveTab('preview');
                if (activeId && graphLoadedScenarioId !== activeId) void loadScenarioGraph(activeId);
              }}
              className={`px-3 h-8 mono text-[9px] uppercase font-black transition-all ${
                activeTab === 'preview'
                  ? 'bg-[var(--col-red)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              ПРЕВЬЮ
            </button>
          </div>
          <div className={`flex items-center gap-2 mono text-[10px] uppercase font-bold transition-colors ${autosaveState === 'saving' ? 'text-[var(--col-yellow)]' : 'text-[var(--text-muted)]'}`}>
            <RefreshCw size={12} className={autosaveState === 'saving' ? 'animate-spin' : ''} />
            {autosaveState === 'saved' ? 'СОХРАНЕНО' : autosaveState === 'saving' ? 'СОХРАНЕНИЕ...' : 'ИЗМЕНЕНО'}
          </div>
          <Button variant="accent-red" size="sm" inverted onClick={() => setSettingsOpen(true)}>
            <Settings size={13} /> ПАРАМЕТРЫ
          </Button>
        </div>

        {activeTab === 'preview' ? (
          <ScenarioPreviewWorkspace
            nodes={scenarioNodes}
            transitions={scenarioTransitions}
            currentNodeId={previewNodeId}
            history={previewHistory}
            entityLinks={previewEntityLinks}
            entityLinksLoading={previewEntityLinksLoading}
            graphLoading={graphLoading}
            graphError={graphError}
            activeScenarioId={activeId}
            maps={maps}
            characters={characters}
            items={items}
            assets={assets}
            locations={locations}
            factions={factions}
            events={events}
            onReloadGraph={loadScenarioGraph}
            onNavigate={handlePreviewNavigate}
            onBack={handlePreviewBack}
            onRestart={handlePreviewRestart}
            onOpenEntityLink={handleOpenEntityLink}
          />
        ) : (
          <ScenarioGraphWorkspace
            nodes={scenarioNodes}
            transitions={scenarioTransitions}
            selectedNode={selectedNode}
            selectedNodeTransitions={selectedNodeTransitions}
            activeNodeId={activeNodeId}
            activeTransitionId={activeTransitionId}
            validation={graphValidation}
            graphError={graphError}
            graphLoading={graphLoading}
            graphActionPending={graphActionPending}
            nodeListOpen={graphNodeListOpen}
            inspectorOpen={graphInspectorOpen}
            inspectorTab={graphInspectorTab}
            newNodeType={newNodeType}
            entityLinks={selectedNodeEntityLinks}
            entityLinksLoading={entityLinksLoading}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            activeScenarioId={activeId}
            maps={maps}
            characters={characters}
            items={items}
            assets={assets}
            locations={locations}
            factions={factions}
            events={events}
            onReloadGraph={loadScenarioGraph}
            onToggleNodeList={() => setGraphNodeListOpen((current) => !current)}
            onToggleInspector={() => {
              setGraphInspectorOpen((current) => !current);
              if (!graphInspectorOpen) setGraphInspectorTab('properties');
            }}
            onInspectorTabChange={setGraphInspectorTab}
            onNewNodeTypeChange={setNewNodeType}
            onCreateNode={handleCreateNode}
            onSelectNode={handleSelectGraphNode}
            onSelectTransition={handleSelectGraphTransition}
            onClearSelection={handleClearGraphSelection}
            onMoveNode={handleMoveNode}
            onLayoutNodes={handleLayoutNodes}
            onCreateTransitionBetween={handleCreateTransitionBetween}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onCreateEntityLink={handleCreateEntityLink}
            onDeleteEntityLink={handleDeleteEntityLink}
            onOpenEntityLink={handleOpenEntityLink}
            onCreateTransition={handleCreateTransition}
            onUpdateTransition={handleUpdateTransition}
            onDeleteTransition={handleDeleteTransition}
            onSelectValidationIssue={handleSelectValidationIssue}
            onUndo={handleUndoGraphAction}
            onRedo={handleRedoGraphAction}
            onCloseInspector={() => setGraphInspectorOpen(false)}
          />
        )}
      </div>

      <Modal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="ПАРАМЕТРЫ СЦЕНАРИЯ"
        accentColor="var(--col-red)"
        maxWidth="max-w-2xl"
      >
        <ScenarioSettingsPanel
          scenario={activeScenario}
          scenarios={data}
          campaigns={campaigns}
          characters={characters}
          maps={maps}
          items={items}
          assets={assets}
          locations={locations}
          factions={factions}
          events={events}
          relatedCharacters={relatedCharacters}
          relatedMaps={relatedMaps}
          tags={tags}
          selectedTags={activeScenarioTags}
          entityLinks={activeScenarioEntityLinks}
          publication={activeScenarioPublication}
          validationSummary={{ errorCount: graphValidation.errorCount, warningCount: graphValidation.warningCount }}
          onReplaceTags={(tagIds, newTags) => onReplaceTargetTags('scenario', activeScenario.id, tagIds, newTags)}
          onUpdateTag={onUpdateTag}
          onDeleteTag={onDeleteTag}
          onCreateMaterialLink={onCreateMaterialLink}
          onUpdateMaterialLink={onUpdateMaterialLink}
          onDeleteMaterialLink={onDeleteMaterialLink}
          onUpsertPublication={onUpsertPublication}
          onUpdatePublication={onUpdatePublication}
          onDeletePublication={onDeletePublication}
          onOpenMaterialLink={onOpenMaterialLink}
          onUpdateField={updateScenarioField}
          onToggleCharacterRelation={toggleCharacterRelation}
          onToggleMapRelation={toggleMapRelation}
          onExportPdf={handleExportPdf}
          embedded
        />
      </Modal>
    </div>
  );
};

export default ScenarioEditor;
