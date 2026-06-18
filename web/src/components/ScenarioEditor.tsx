import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ClipboardPaste,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  RefreshCw,
  Scissors,
  Settings,
  Trash2,
  X
} from 'lucide-react';
import { Button, SearchInput, SectionHeader } from './UI';
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
  ScenarioGroup,
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
  exportScenarioCharacterCardsPdf,
  exportScenarioItemCardsPdf,
  exportScenarioPdf,
  listScenarioNodeEntityLinks,
  listScenarioNodes,
  listScenarioTransitions,
  updateScenarioNode,
  updateScenarioTransition
} from '../lib/scenarioApi';
import {
  mapScenarioDetail,
  mapScenarioSummary,
  entityLinkAssignmentKey,
  publicationAssignmentKey,
  tagAssignmentKey
} from '../lib/mappers';
import { GraphInspector, GraphInspectorTab } from './scenario/GraphInspector';
import { ScenarioGraphWorkspace } from './scenario/ScenarioGraphWorkspace';
import { ScenarioPreviewWorkspace } from './scenario/ScenarioPreviewWorkspace';
import { ScenarioSettingsPanel } from './scenario/ScenarioSettingsPanel';
import { GraphValidationIssue, validateScenarioGraph } from './scenario/graphValidation';
import {
  EntityLibraryCard,
  EntityLibraryContextMenu,
  EntityLibraryGroupCard,
  EntityLibraryWorkspace,
  type EntityLibraryActionSection,
  useEntityLibraryDragDrop,
  useEntityLibraryKeyboard,
  useEntityLibraryMoveBuffer,
  useEntityLibraryNavigation,
  useEntityLibraryContextMenu,
  useEntityLibrarySelection
} from './entityLibrary';
import { TagFilter } from './TagPicker';

interface ScenarioEditorProps {
  data: Scenario[];
  onUpdate: (data: Scenario[]) => void;
  scenarioGroups: ScenarioGroup[];
  onCreateScenarioGroup: () => Promise<ScenarioGroup>;
  onUpdateScenarioGroup: (id: string, payload: Partial<ScenarioGroup>) => Promise<ScenarioGroup>;
  onDeleteScenarioGroup: (id: string) => Promise<void>;
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
  scenarioGroups,
  onCreateScenarioGroup,
  onUpdateScenarioGroup,
  onDeleteScenarioGroup,
  campaigns,
  characters,
  items,
  maps,
  assets,
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
  const librarySelection = useEntityLibrarySelection({ mode: 'multi' });
  const libraryNavigation = useEntityLibraryNavigation();
  const libraryContextMenu = useEntityLibraryContextMenu();
  const scenarioMoveBuffer = useEntityLibraryMoveBuffer();
  const { currentGroupId, isRoot: libraryIsRoot, openGroup, returnToRoot } = libraryNavigation;
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renamingGroupName, setRenamingGroupName] = useState('');

  const initialScenarioAppliedRef = useRef<string | null>(null);
  const graphHistoryReplayRef = useRef(false);
  const renameGroupInputRef = useRef<HTMLInputElement | null>(null);

  const activeScenario = data.find((scenario) => scenario.id === activeId);
  const selectedNode = scenarioNodes.find((node) => node.id === activeNodeId) ?? null;
  const selectedNodeTransitions = selectedNode
    ? scenarioTransitions.filter((transition) => transition.fromNodeId === selectedNode.id)
    : [];
  const graphValidation = useMemo(
    () => validateScenarioGraph(scenarioNodes, scenarioTransitions),
    [scenarioNodes, scenarioTransitions]
  );

  const activeScenarioEntityLinks = activeScenario
    ? entityLinks[entityLinkAssignmentKey('scenario', activeScenario.id)] ?? []
    : [];
  const activeScenarioCompositionLinks = activeScenarioEntityLinks.filter((link) => link.relationType === 'uses');
  const compositionCharacterIds = new Set(
    activeScenarioCompositionLinks
      .filter((link) => link.targetType === 'character')
      .map((link) => link.targetId)
  );
  const compositionMapIds = new Set(
    activeScenarioCompositionLinks
      .filter((link) => link.targetType === 'map')
      .map((link) => link.targetId)
  );
  const compositionItemIds = new Set(
    activeScenarioCompositionLinks
      .filter((link) => link.targetType === 'item')
      .map((link) => link.targetId)
  );
  const relatedCharacters = activeScenario
    ? characters.filter((character) => compositionCharacterIds.has(character.id))
    : [];
  const relatedMaps = activeScenario
    ? maps.filter((map) => compositionMapIds.has(map.id))
    : [];
  const relatedItems = activeScenario ? items.filter((item) => compositionItemIds.has(item.id)) : [];
  const hasScenarioLibraryFilters = searchQuery.trim().length > 0 || Boolean(selectedTagFilter);
  const currentScenarioGroup = currentGroupId
    ? scenarioGroups.find((group) => group.id === currentGroupId) ?? null
    : null;
  const scenariosInCurrentGroup = data.filter((scenario) =>
    currentGroupId ? scenario.scenarioGroupId === currentGroupId : !scenario.scenarioGroupId
  );
  const visibleScenarios = scenariosInCurrentGroup.filter((scenario) => {
    const matchesSearch = scenario.title.toLowerCase().includes(searchQuery.toLowerCase());
    const assignedTags = tagAssignments[tagAssignmentKey('scenario', scenario.id)] ?? [];
    const matchesTag = !selectedTagFilter || assignedTags.some((tag) => tag.id === selectedTagFilter);
    return matchesSearch && matchesTag;
  });
  const visibleScenarioIds = visibleScenarios.map((scenario) => scenario.id);
  const visibleScenarioIdKey = visibleScenarioIds.join('\u0000');
  const visibleScenarioGroups = libraryIsRoot && !hasScenarioLibraryFilters ? scenarioGroups : [];
  const scenarioGroupCountById = useMemo(() => {
    const counts = new Map<string, number>();
    data.forEach((scenario) => {
      if (!scenario.scenarioGroupId) return;
      counts.set(scenario.scenarioGroupId, (counts.get(scenario.scenarioGroupId) ?? 0) + 1);
    });
    return counts;
  }, [data]);
  const scenarioMoveIds = useMemo(() => {
    const existingIds = new Set(data.map((scenario) => scenario.id));
    return scenarioMoveBuffer.itemIds.filter((id) => existingIds.has(id));
  }, [data, scenarioMoveBuffer.itemIds]);
  const scenarioMoveCount = scenarioMoveIds.length;
  const isScenarioLibraryFilteredEmpty = hasScenarioLibraryFilters && visibleScenarios.length === 0;
  const scenarioLibraryEmptyTitle = isScenarioLibraryFilteredEmpty
    ? 'Ничего не найдено'
    : currentGroupId
      ? 'В группе пока нет сценариев'
      : 'Сценариев пока нет';
  const scenarioLibraryEmptyDescription = isScenarioLibraryFilteredEmpty
    ? 'Измените поиск или фильтр тегов, чтобы увидеть другие сценарии.'
    : currentGroupId
      ? 'Создайте сценарий кнопкой выше или через контекстное меню этой области.'
      : 'Чтобы создать сценарий или группу, нажмите правой кнопкой мыши по этой области.';
  const activeScenarioTags = activeScenario
    ? tagAssignments[tagAssignmentKey('scenario', activeScenario.id)] ?? []
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
    if (!renamingGroupId) return;
    const focusTimeout = window.setTimeout(() => {
      renameGroupInputRef.current?.focus();
      renameGroupInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(focusTimeout);
  }, [renamingGroupId]);

  useEffect(() => {
    if (activeId) return;
    librarySelection.pruneSelection(visibleScenarioIds);
  }, [activeId, librarySelection, visibleScenarioIds, visibleScenarioIdKey]);

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

  const startRenamingScenarioGroup = (group: ScenarioGroup) => {
    setRenamingGroupId(group.id);
    setRenamingGroupName(group.name);
  };

  const cancelScenarioGroupRename = () => {
    setRenamingGroupId(null);
    setRenamingGroupName('');
  };

  const commitScenarioGroupRename = async () => {
    if (!renamingGroupId) return;
    const group = scenarioGroups.find((candidate) => candidate.id === renamingGroupId);
    const nextName = renamingGroupName.trim();
    cancelScenarioGroupRename();

    if (!group || !nextName || nextName === group.name) return;

    try {
      await onUpdateScenarioGroup(group.id, { name: nextName });
    } catch {
      // ignore
    }
  };

  const handleCreateScenarioGroup = async () => {
    try {
      const group = await onCreateScenarioGroup();
      setSearchQuery('');
      setSelectedTagFilter('');
      returnToRoot();
      librarySelection.clearSelection();
      startRenamingScenarioGroup(group);
    } catch {
      // ignore
    }
  };

  const handleDeleteScenarioGroup = async (groupId: string) => {
    const group = scenarioGroups.find((candidate) => candidate.id === groupId);
    const label = group?.name ? ` "${group.name}"` : '';
    if (!confirm(`Удалить группу${label}? Сценарии останутся без группы.`)) return;

    try {
      await onDeleteScenarioGroup(groupId);
      if (currentGroupId === groupId) returnToRoot();
      if (renamingGroupId === groupId) cancelScenarioGroupRename();
      librarySelection.clearSelection();
    } catch {
      // ignore
    }
  };

  const handleCreateScenario = async () => {
    try {
      const created = await apiRequest('/scenarios', {
        method: 'POST',
        body: JSON.stringify({
          title: 'НОВЫЙ СЦЕНАРИЙ',
          description: '',
          ...(currentGroupId ? { scenario_group_id: currentGroupId } : {})
        })
      });
      const scenario = mapScenarioSummary(created);
      onUpdate([...data, scenario]);
      librarySelection.clearSelection();
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

  const deleteScenarioById = async (scenarioId: string) => {
    if (!confirm('Удалить сценарий?')) return;
    try {
      await apiRequest(`/scenarios/${scenarioId}`, { method: 'DELETE' });
      onUpdate(data.filter((scenario) => scenario.id !== scenarioId));
      librarySelection.clearSelection();
      scenarioMoveBuffer.removeIds([scenarioId]);
      if (activeId === scenarioId) {
        setActiveId(null);
        resetGraphState();
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteScenario = async (scenarioId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await deleteScenarioById(scenarioId);
  };

  const cutScenariosToClipboard = (scenarioId?: string | null) => {
    const existingIds = new Set(data.map((scenario) => scenario.id));
    const targetIds = librarySelection
      .getActionTargetIds(scenarioId)
      .filter((id) => existingIds.has(id));

    if (targetIds.length === 0) return;
    scenarioMoveBuffer.cut(targetIds);
  };

  const moveScenariosToGroup = async (itemIds: string[], targetGroupId: string | null) => {
    const existingIds = new Set(data.map((scenario) => scenario.id));
    const targetIds = itemIds.filter((id) => existingIds.has(id));
    if (targetIds.length === 0) return;

    const updatedScenarios = await Promise.all(
      targetIds.map(async (scenarioId) => {
        const updated = await apiRequest(`/scenarios/${scenarioId}`, {
          method: 'PATCH',
          body: JSON.stringify({ scenario_group_id: targetGroupId })
        });
        return mapScenarioSummary(updated);
      })
    );
    const updatedById = new Map(updatedScenarios.map((scenario) => [scenario.id, scenario]));
    onUpdate(data.map((scenario) => updatedById.get(scenario.id) ?? scenario));
  };

  const pasteScenariosToGroup = async (targetGroupId: string | null) => {
    try {
      await scenarioMoveBuffer.paste(async (bufferedIds) => {
        await moveScenariosToGroup(bufferedIds, targetGroupId);
      });
      librarySelection.clearSelection();
    } catch {
      // ignore
    }
  };

  const libraryDragDrop = useEntityLibraryDragDrop({
    getDragItemIds: (scenarioId) => librarySelection.getActionTargetIds(scenarioId),
    onDropItems: async ({ itemIds, targetGroupId }) => {
      try {
        await moveScenariosToGroup(itemIds, targetGroupId);
        librarySelection.clearSelection();
      } catch {
        // ignore
      }
    }
  });

  const getScenarioLibraryContextSections = (): EntityLibraryActionSection[] => {
    const context = libraryContextMenu.contextMenu;
    if (!context) return [];

    if (context.kind === 'workspace') {
      return [
        {
          actions: [
            {
              id: 'create-scenario',
              label: 'Создать сценарий',
              icon: <Plus size={13} />,
              onSelect: () => void handleCreateScenario()
            },
            {
              id: 'create-group',
              label: 'Создать группу',
              icon: <FolderPlus size={13} />,
              hidden: !libraryIsRoot,
              onSelect: () => void handleCreateScenarioGroup()
            },
            {
              id: 'paste-scenarios',
              label: context.groupId ? 'Вставить сюда' : 'Вставить в корень',
              icon: <ClipboardPaste size={13} />,
              disabled: scenarioMoveCount === 0,
              onSelect: () => void pasteScenariosToGroup(context.groupId)
            }
          ]
        }
      ];
    }

    if (context.kind === 'group') {
      const group = scenarioGroups.find((candidate) => candidate.id === context.groupId);
      return [
        {
          actions: [
            {
              id: 'open-group',
              label: 'Открыть группу',
              icon: <FolderOpen size={13} />,
              onSelect: () => {
                openGroup(context.groupId);
                librarySelection.clearSelection();
              }
            },
            {
              id: 'rename-group',
              label: 'Переименовать',
              icon: <Pencil size={13} />,
              disabled: !group,
              onSelect: () => {
                if (group) startRenamingScenarioGroup(group);
              }
            },
            {
              id: 'paste-to-group',
              label: 'Вставить в группу',
              icon: <ClipboardPaste size={13} />,
              disabled: scenarioMoveCount === 0,
              onSelect: () => void pasteScenariosToGroup(context.groupId)
            }
          ]
        },
        {
          actions: [
            {
              id: 'delete-group',
              label: 'Удалить группу',
              icon: <Trash2 size={13} />,
              destructive: true,
              onSelect: () => void handleDeleteScenarioGroup(context.groupId)
            }
          ]
        }
      ];
    }

    const targetIds = librarySelection.getActionTargetIds(context.itemId);
    const cutLabel = targetIds.length > 1 ? 'Вырезать выбранное' : 'Вырезать';

    return [
      {
        actions: [
          {
            id: 'open-scenario',
            label: 'Открыть',
            icon: <FolderOpen size={13} />,
            onSelect: () => void handleSelectScenario(context.itemId)
          },
          {
            id: 'cut-scenario',
            label: cutLabel,
            icon: <Scissors size={13} />,
            onSelect: () => cutScenariosToClipboard(context.itemId)
          }
        ]
      },
      {
        actions: [
          {
            id: 'delete-scenario',
            label: 'Удалить',
            icon: <Trash2 size={13} />,
            destructive: true,
            onSelect: () => void deleteScenarioById(context.itemId)
          }
        ]
      }
    ];
  };

  useEntityLibraryKeyboard({
    enabled: !activeId,
    contextMenuOpen: Boolean(libraryContextMenu.contextMenu),
    onCloseContextMenu: libraryContextMenu.closeContextMenu,
    renameActive: Boolean(renamingGroupId),
    onCancelRename: cancelScenarioGroupRename,
    selectedIds: librarySelection.selectedIds,
    onClearSelection: librarySelection.clearSelection,
    moveBufferCount: scenarioMoveCount,
    onCancelMoveBuffer: scenarioMoveBuffer.cancel,
    onOpenSelected: (scenarioId) => void handleSelectScenario(scenarioId),
    onDeleteSelected: (scenarioId) => void deleteScenarioById(scenarioId)
  });

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

  const handleExportCharacterCardsPdf = async (duplexEdge: 'long' | 'short') => {
    if (!activeScenario) return;

    try {
      const blob = await exportScenarioCharacterCardsPdf(activeScenario.id, duplexEdge);
      if (!blob) return;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeScenario.title || 'scenario'}_characters.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const handleExportItemCardsPdf = async (duplexEdge: 'long' | 'short') => {
    if (!activeScenario) return;

    try {
      const blob = await exportScenarioItemCardsPdf(activeScenario.id, duplexEdge);
      if (!blob) return;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeScenario.title || 'scenario'}_items.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const findScenarioCompositionLink = (targetType: EntityLinkTargetType, targetId: string): EntityLink | undefined =>
    activeScenarioCompositionLinks.find((link) => link.targetType === targetType && link.targetId === targetId);

  const toggleScenarioComposition = async (targetType: EntityLinkTargetType, targetId: string) => {
    if (!activeScenario || !['character', 'map', 'item'].includes(targetType)) return;

    const existingLink = findScenarioCompositionLink(targetType, targetId);

    try {
      if (existingLink) {
        await onDeleteMaterialLink(existingLink.id);
        return;
      }

      await onCreateMaterialLink('scenario', activeScenario.id, {
        targetType,
        targetId,
        relationType: 'uses',
        label: null,
      });
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
    const deletedLink = selectedNodeEntityLinks.find((link) => link.id === linkId);
    setGraphActionPending(true);
    setGraphError(null);
    try {
      await deleteScenarioNodeEntityLink(linkId);
      setSelectedNodeEntityLinks((current) => current.filter((link) => link.id !== linkId));
      if (selectedNode && deletedLink) {
        const config = selectedNode.config as Record<string, unknown>;
        const nextConfig = { ...config };
        let shouldUpdateConfig = false;

        if (deletedLink.targetType === 'character' && nextConfig.speaker_entity_id === deletedLink.targetId) {
          delete nextConfig.speaker_entity_id;
          shouldUpdateConfig = true;
        }

        if (deletedLink.targetType === 'item' && Array.isArray(nextConfig.reward_item_ids)) {
          const currentRewardIds = nextConfig.reward_item_ids.filter((id): id is string => typeof id === 'string');
          const nextRewardIds = currentRewardIds.filter((id) => id !== deletedLink.targetId);
          if (nextRewardIds.length !== currentRewardIds.length) {
            if (nextRewardIds.length > 0) {
              nextConfig.reward_item_ids = nextRewardIds;
            } else {
              delete nextConfig.reward_item_ids;
            }
            shouldUpdateConfig = true;
          }
        }

        if (shouldUpdateConfig) {
          const updatedNode = await updateScenarioNode(selectedNode.id, {
            type: selectedNode.type,
            title: selectedNode.title ?? '',
            content: selectedNode.content ?? '',
            config: nextConfig as ScenarioNodeConfig
          });
          setScenarioNodes((current) => current.map((node) => (node.id === updatedNode.id ? updatedNode : node)));
        }
      }
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
      <div className="flex h-full w-full flex-col bg-[var(--bg-main)] bauhaus-bg">
        <div className="shrink-0 px-8 pb-5 pt-7">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <div className="flex flex-col gap-4">
              <SectionHeader
                title="СЦЕНАРНАЯ МАСТЕРСКАЯ"
                subtitle="Конструктор сюжетов"
                  accentColor="var(--col-red)"
              />
              {!libraryIsRoot && currentScenarioGroup && (
                <div className="mono flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-[var(--text-muted)]">
                  <button
                    type="button"
                    onClick={() => {
                      returnToRoot();
                      librarySelection.clearSelection();
                    }}
                    className="transition-colors hover:text-[var(--col-red)]"
                  >
                    Сценарии
                  </button>
                  <span>/</span>
                  <span className="text-[var(--text-main)]">{currentScenarioGroup.name}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-[260px] flex-1">
                <SearchInput
                value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="НАЗВАНИЕ..."
                  accentColor="var(--col-red)"
                />
              </div>
              <div className="min-w-[220px]">
                <TagFilter
                  tags={tags}
                  value={selectedTagFilter}
                    onChange={setSelectedTagFilter}
                    accentColor="var(--col-red)"
                />
              </div>
              {!libraryIsRoot && (
                <button
                  type="button"
                  onClick={() => {
                    returnToRoot();
                    librarySelection.clearSelection();
                  }}
                  className="h-11 border-2 border-[var(--border-color)] px-4 mono text-[10px] font-black uppercase text-[var(--text-muted)] transition-colors hover:border-[var(--col-red)] hover:text-[var(--col-red)]"
                >
                  Все сценарии
                </button>
              )}
              <div className="flex-1" />
              <Button variant="accent-red" onClick={handleCreateScenario}>
                <Plus size={16} /> Создать сценарий
              </Button>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 px-8 pb-8 pt-3">
          <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-3">
            {scenarioMoveCount > 0 && (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-2 border-[var(--col-red)] bg-[var(--col-red)]/10 px-4 py-3">
                <div className="mono text-[10px] uppercase font-black text-[var(--text-main)]">
                  Вырезано сценариев: <span className="text-[var(--col-red)]">{scenarioMoveCount}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void pasteScenariosToGroup(currentGroupId)}
                    className="inline-flex h-9 items-center gap-2 border border-[var(--col-red)] px-3 mono text-[9px] font-black uppercase text-[var(--col-red)] transition-colors hover:bg-[var(--col-red)] hover:text-[var(--text-inverted)]"
                  >
                    <ClipboardPaste size={13} /> Вставить сюда
                  </button>
                  <button
                    type="button"
                    onClick={scenarioMoveBuffer.cancel}
                    className="inline-flex h-9 items-center gap-2 border border-[var(--border-color)] px-3 mono text-[9px] font-black uppercase text-[var(--text-muted)] transition-colors hover:border-[var(--text-main)] hover:text-[var(--text-main)]"
                  >
                    <X size={13} /> Отменить
                  </button>
                </div>
              </div>
            )}
            <EntityLibraryWorkspace<Scenario, ScenarioGroup>
              items={visibleScenarios}
              groups={visibleScenarioGroups}
              getItemId={(scenario) => scenario.id}
              getGroupId={(group) => group.id}
              selectedIds={librarySelection.selectedIds}
              cutItemIds={scenarioMoveBuffer.itemIds}
              draggingItemIds={libraryDragDrop.draggingIds}
              dragOverGroupId={libraryDragDrop.dragOverGroupId}
              currentGroupId={currentGroupId}
              draggableItems
              surface="transparent"
              framed
              className="min-h-[420px] flex-1"
              gridClassName=""
              onSelectItem={(scenarioId, _scenario, event) => librarySelection.selectFromEvent(scenarioId, event, visibleScenarioIds)}
              onOpenItem={(scenarioId) => {
                void handleSelectScenario(scenarioId);
              }}
              onOpenGroup={(groupId) => {
                openGroup(groupId);
                librarySelection.clearSelection();
              }}
              onClearSelection={librarySelection.clearSelection}
              onWorkspaceContextMenu={(context) => {
                libraryContextMenu.setContextMenu(context);
              }}
              onItemContextMenu={(scenarioId, _scenario, event) => {
                if (!librarySelection.isSelected(scenarioId)) librarySelection.replaceSelection(scenarioId);
                libraryContextMenu.openItemMenu(event, scenarioId, currentGroupId);
              }}
              onGroupContextMenu={(groupId, _group, event) => {
                librarySelection.clearSelection();
                libraryContextMenu.openGroupMenu(event, groupId);
              }}
              onItemDragStart={(scenarioId, _scenario, event) => {
                if (!librarySelection.isSelected(scenarioId)) librarySelection.replaceSelection(scenarioId);
                libraryDragDrop.handleItemDragStart(scenarioId, event);
              }}
              onItemDragEnd={(_scenarioId, _scenario, _event) => {
                libraryDragDrop.handleItemDragEnd();
              }}
              onWorkspaceDragOver={(groupId, event) => libraryDragDrop.handleWorkspaceDragOver(groupId, event)}
              onWorkspaceDragLeave={(groupId, event) => libraryDragDrop.handleWorkspaceDragLeave(groupId, event)}
              onWorkspaceDrop={(groupId, event) => libraryDragDrop.handleWorkspaceDrop(groupId, event)}
              onGroupDragOver={(groupId, _group, event) => libraryDragDrop.handleGroupDragOver(groupId, event)}
              onGroupDragLeave={(groupId, _group, event) => libraryDragDrop.handleGroupDragLeave(groupId, event)}
              onGroupDrop={(groupId, _group, event) => libraryDragDrop.handleGroupDrop(groupId, event)}
              renderGroup={(group, state) => (
                <EntityLibraryGroupCard
                  name={group.name}
                  nameContent={renamingGroupId === group.id ? (
                    <input
                      ref={renameGroupInputRef}
                      value={renamingGroupName}
                        onChange={(event) => setRenamingGroupName(event.target.value)}
                      onBlur={() => void commitScenarioGroupRename()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void commitScenarioGroupRename();
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelScenarioGroupRename();
                        }
                      }}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      onContextMenu={(event) => event.stopPropagation()}
                      className="w-full bg-transparent mono text-[10px] uppercase font-black tracking-[0.2em] text-[var(--text-main)] outline-none"
                    />
                  ) : undefined}
                  count={scenarioGroupCountById.get(group.id) ?? 0}
                  accentColor="var(--col-red)"
                  dragOver={state.dragOver}
                />
              )}
              renderItem={(scenario, state) => {
                const groupName = scenario.scenarioGroupId
                  ? scenarioGroups.find((group) => group.id === scenario.scenarioGroupId)?.name
                  : null;
                const dateLabel = (scenario.updatedAt ?? scenario.createdAt).split('T')[0];
                const isCut = scenarioMoveIds.includes(scenario.id);
                return (
                  <EntityLibraryCard
                    title={scenario.title}
                      accentColor="var(--col-red)"
                    selected={state.selected}
                    cut={state.cut}
                    dragging={state.dragging}
                    loading={loadingScenarioId === scenario.id}
                    headerExtra={
                      <>
                        {isCut && (
                          <span className="border border-[var(--col-red)] px-2 py-1 mono text-[8px] uppercase font-black text-[var(--col-red)]">
                            ВЫРЕЗАНО
                          </span>
                        )}
                        <button
                        type="button"
                        onClick={(event) => handleDeleteScenario(scenario.id, event)}
                        className="p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--col-red)]"
                        title="Удалить сценарий"
                        aria-label="Удалить сценарий"
                      >
                        <Trash2 size={14} />
                        </button>
                      </>
                    }
                  >
                    <div className="flex h-full flex-col justify-between gap-5">
                      <p className="mono line-clamp-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                        {scenario.description || 'Описание пока не добавлено.'}
                      </p>
                      <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
                        <div className="flex items-center justify-between gap-3 mono text-[9px] uppercase text-[var(--text-muted)]">
                          <span>{dateLabel}</span>
                          <span className="font-black text-[var(--col-red)]">GRAPH</span>
                        </div>
                        <div className="mono text-[9px] uppercase text-[var(--text-muted)]">
                          {groupName ? `Группа: ${groupName}` : 'Без группы'}
                        </div>
                      </div>
                    </div>
                  </EntityLibraryCard>
                );
              }}
              emptyTitle={scenarioLibraryEmptyTitle}
              emptyDescription={scenarioLibraryEmptyDescription}
              emptyAction={
                isScenarioLibraryFilteredEmpty ? null : <Button variant="accent-red" onClick={handleCreateScenario}>
                  <Plus size={16} /> СОЗДАТЬ СЦЕНАРИЙ
                </Button>
              }
            />
            <EntityLibraryContextMenu
              context={libraryContextMenu.contextMenu}
              sections={getScenarioLibraryContextSections()}
              onClose={libraryContextMenu.closeContextMenu}
              accentColor="var(--col-red)"
            />
          </div>
        </div>
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
            scenarioCharacters={relatedCharacters}
            scenarioMaps={relatedMaps}
            scenarioItems={relatedItems}
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
            scenarioCharacters={relatedCharacters}
            scenarioMaps={relatedMaps}
            scenarioItems={relatedItems}
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
          campaigns={campaigns}
          characters={characters}
          maps={maps}
          items={items}
          relatedCharacters={relatedCharacters}
          relatedMaps={relatedMaps}
          relatedItems={relatedItems}
          tags={tags}
          selectedTags={activeScenarioTags}
          publication={activeScenarioPublication}
          validationSummary={{ errorCount: graphValidation.errorCount, warningCount: graphValidation.warningCount }}
          onReplaceTags={(tagIds, newTags) => onReplaceTargetTags('scenario', activeScenario.id, tagIds, newTags)}
          onUpdateTag={onUpdateTag}
          onDeleteTag={onDeleteTag}
          onUpsertPublication={onUpsertPublication}
          onUpdatePublication={onUpdatePublication}
          onDeletePublication={onDeletePublication}
          onUpdateField={updateScenarioField}
          onToggleComposition={toggleScenarioComposition}
          onExportPdf={handleExportPdf}
          onExportCharacterCardsPdf={handleExportCharacterCardsPdf}
          onExportItemCardsPdf={handleExportItemCardsPdf}
          embedded
        />
      </Modal>
    </div>
  );
};

export default ScenarioEditor;
