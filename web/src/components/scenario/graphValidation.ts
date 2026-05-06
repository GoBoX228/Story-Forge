import { ScenarioNode, ScenarioTransition } from '../../types';

export type GraphValidationSeverity = 'error' | 'warning';
export type GraphValidationTarget = 'graph' | 'node' | 'transition';

export interface GraphValidationIssue {
  id: string;
  severity: GraphValidationSeverity;
  target: GraphValidationTarget;
  message: string;
  nodeId?: string;
  transitionId?: string;
}

export interface GraphValidationResult {
  issues: GraphValidationIssue[];
  nodeIssues: Record<string, GraphValidationIssue[]>;
  transitionIssues: Record<string, GraphValidationIssue[]>;
  errorCount: number;
  warningCount: number;
  hasErrors: boolean;
  hasWarnings: boolean;
}

const addIssue = (
  issues: GraphValidationIssue[],
  issue: GraphValidationIssue
) => {
  issues.push(issue);
};

const normalizeLabel = (label?: string | null): string => (label ?? '').trim().toLowerCase();
const isBlank = (value: unknown): boolean => typeof value !== 'string' || value.trim().length === 0;

const configFieldMessage: Record<ScenarioNode['type'], string> = {
  description: 'Заполните поле сцены в настройках узла',
  dialog: 'Заполните говорящего для диалогового узла',
  location: 'Заполните ориентир или локацию узла',
  check: 'Заполните навык и корректный DC проверки',
  loot: 'Заполните подсказку по награде или предмету',
  combat: 'Заполните описание столкновения'
};

const hasIncompleteTypedConfig = (node: ScenarioNode): boolean => {
  const config = node.config ?? {};

  switch (node.type) {
    case 'description':
      return isBlank('scene' in config ? config.scene : undefined);
    case 'dialog':
      return isBlank('speaker' in config ? config.speaker : undefined);
    case 'location':
      return isBlank('map_hint' in config ? config.map_hint : undefined);
    case 'check': {
      const dc = 'dc' in config ? config.dc : undefined;
      return isBlank('skill' in config ? config.skill : undefined) || typeof dc !== 'number' || dc < 1 || dc > 40;
    }
    case 'loot':
      return isBlank('item_hint' in config ? config.item_hint : undefined);
    case 'combat':
      return isBlank('encounter' in config ? config.encounter : undefined);
    default:
      return false;
  }
};

export const validateScenarioGraph = (
  nodes: ScenarioNode[],
  transitions: ScenarioTransition[]
): GraphValidationResult => {
  const issues: GraphValidationIssue[] = [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, 0]));

  if (nodes.length === 0) {
    addIssue(issues, {
      id: 'graph-empty',
      severity: 'error',
      target: 'graph',
      message: 'Создайте первый узел графа'
    });
  }

  transitions.forEach((transition) => {
    const hasSource = nodeById.has(transition.fromNodeId);
    const hasTarget = nodeById.has(transition.toNodeId);

    if (!hasSource || !hasTarget) {
      addIssue(issues, {
        id: `transition-broken-link-${transition.id}`,
        severity: 'error',
        target: 'transition',
        transitionId: transition.id,
        nodeId: hasSource ? transition.fromNodeId : undefined,
        message: 'Переход ссылается на отсутствующий исходный или целевой узел'
      });
      return;
    }

    outgoing.set(transition.fromNodeId, (outgoing.get(transition.fromNodeId) ?? 0) + 1);
    incoming.set(transition.toNodeId, (incoming.get(transition.toNodeId) ?? 0) + 1);
  });

  const startNodes = nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0);
  const finalNodes = nodes.filter((node) => (outgoing.get(node.id) ?? 0) === 0);

  if (nodes.length > 0 && startNodes.length === 0) {
    addIssue(issues, {
      id: 'graph-no-start',
      severity: 'error',
      target: 'graph',
      message: 'В графе нет стартового узла без входящих переходов'
    });
  }

  if (nodes.length > 0 && finalNodes.length === 0) {
    addIssue(issues, {
      id: 'graph-no-final',
      severity: 'error',
      target: 'graph',
      message: 'В графе нет финального узла без исходящих переходов'
    });
  }

  if (startNodes.length > 1) {
    startNodes.forEach((node) => {
      addIssue(issues, {
        id: `node-multiple-start-${node.id}`,
        severity: 'warning',
        target: 'node',
        nodeId: node.id,
        message: 'Узел выглядит как дополнительный старт: у него нет входящих переходов'
      });
    });
  }

  if (finalNodes.length > 1) {
    finalNodes.forEach((node) => {
      addIssue(issues, {
        id: `node-multiple-final-${node.id}`,
        severity: 'warning',
        target: 'node',
        nodeId: node.id,
        message: 'Узел выглядит как дополнительный финал: у него нет исходящих переходов'
      });
    });
  }

  nodes.forEach((node) => {
    if ((incoming.get(node.id) ?? 0) === 0 && (outgoing.get(node.id) ?? 0) === 0) {
      addIssue(issues, {
        id: `node-isolated-${node.id}`,
        severity: 'warning',
        target: 'node',
        nodeId: node.id,
        message: 'Изолированный узел не связан с остальным графом'
      });
    }

    if (hasIncompleteTypedConfig(node)) {
      addIssue(issues, {
        id: `node-incomplete-config-${node.id}`,
        severity: 'warning',
        target: 'node',
        nodeId: node.id,
        message: configFieldMessage[node.type]
      });
    }
  });

  const duplicateGroups = new Map<string, ScenarioTransition[]>();
  const outgoingByNode = new Map<string, ScenarioTransition[]>();

  transitions.forEach((transition) => {
    if (!nodeById.has(transition.fromNodeId) || !nodeById.has(transition.toNodeId)) return;

    const fromNode = nodeById.get(transition.fromNodeId);
    if ((transition.type === 'success' || transition.type === 'failure') && fromNode?.type !== 'check') {
      addIssue(issues, {
        id: `transition-outcome-from-non-check-${transition.id}`,
        severity: 'error',
        target: 'transition',
        transitionId: transition.id,
        nodeId: transition.fromNodeId,
        message: 'Переход успеха или провала должен выходить из узла проверки'
      });
    }

    if (transition.type !== 'linear' && !normalizeLabel(transition.label)) {
      addIssue(issues, {
        id: `transition-missing-label-${transition.id}`,
        severity: 'warning',
        target: 'transition',
        transitionId: transition.id,
        nodeId: transition.fromNodeId,
        message: 'Нелинейный переход должен иметь понятную метку'
      });
    }

    const duplicateKey = [
      transition.fromNodeId,
      transition.toNodeId,
      transition.type,
      normalizeLabel(transition.label)
    ].join('::');
    duplicateGroups.set(duplicateKey, [...(duplicateGroups.get(duplicateKey) ?? []), transition]);
    outgoingByNode.set(transition.fromNodeId, [...(outgoingByNode.get(transition.fromNodeId) ?? []), transition]);
  });

  nodes
    .filter((node) => node.type === 'check')
    .forEach((node) => {
      const nodeTransitions = outgoingByNode.get(node.id) ?? [];
      const hasSuccess = nodeTransitions.some((transition) => transition.type === 'success');
      const hasFailure = nodeTransitions.some((transition) => transition.type === 'failure');

      if (!hasSuccess || !hasFailure) {
        addIssue(issues, {
          id: `node-check-outcomes-${node.id}`,
          severity: 'error',
          target: 'node',
          nodeId: node.id,
          message: 'Узел проверки должен иметь переходы успеха и провала'
        });
      }
    });

  duplicateGroups.forEach((group) => {
    if (group.length < 2) return;

    group.forEach((transition) => {
      addIssue(issues, {
        id: `transition-duplicate-${transition.id}`,
        severity: 'warning',
        target: 'transition',
        transitionId: transition.id,
        nodeId: transition.fromNodeId,
        message: 'Дублирующий переход: та же цель, тип и метка'
      });
    });
  });

  const nodeIssues: Record<string, GraphValidationIssue[]> = {};
  const transitionIssues: Record<string, GraphValidationIssue[]> = {};

  issues.forEach((issue) => {
    if (issue.nodeId) {
      nodeIssues[issue.nodeId] = [...(nodeIssues[issue.nodeId] ?? []), issue];
    }
    if (issue.transitionId) {
      transitionIssues[issue.transitionId] = [...(transitionIssues[issue.transitionId] ?? []), issue];
    }
  });

  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.length - errorCount;

  return {
    issues,
    nodeIssues,
    transitionIssues,
    errorCount,
    warningCount,
    hasErrors: errorCount > 0,
    hasWarnings: warningCount > 0
  };
};
