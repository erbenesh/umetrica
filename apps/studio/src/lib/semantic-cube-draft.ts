import type {
  SemanticCubeDefinition,
  SemanticDimension,
  SemanticGraphLayout,
  SemanticMeasure,
} from '@sellerpool/core';

export const WORKSPACE_CARD_W = 220;
export const WORKSPACE_CARD_H = 100;

export function nextMemberName(prefix: string, existing: string[]) {
  let index = 1;
  while (existing.includes(`${prefix}_${index}`)) {
    index += 1;
  }
  return `${prefix}_${index}`;
}

export function updateMeasure(
  draft: SemanticCubeDefinition,
  id: string,
  patch: Partial<SemanticMeasure>
) {
  return {
    ...draft,
    measures: draft.measures.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  };
}

export function updateDimension(
  draft: SemanticCubeDefinition,
  id: string,
  patch: Partial<SemanticDimension>
) {
  return {
    ...draft,
    dimensions: draft.dimensions.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  };
}

export const MEMBER_CHIP_W = 156;
export const MEMBER_CHIP_H = 44;
export const MEMBER_GAP = 8;
export const MEMBER_COLUMN_GAP = 20;
export const MEMBER_OFFSET_X = 36;
export const MEMBER_HEADER_H = 22;

/** Чистая сетка полей справа от карточки куба — без legacy node-layout. */
export function computeExpandedMemberPositions(
  cubeWorkspacePos: { x: number; y: number },
  draft: SemanticCubeDefinition
): Record<string, { x: number; y: number }> {
  const measureX = cubeWorkspacePos.x + WORKSPACE_CARD_W + MEMBER_OFFSET_X;
  const dimX = measureX + MEMBER_CHIP_W + MEMBER_COLUMN_GAP;
  const baseY = cubeWorkspacePos.y + MEMBER_HEADER_H;
  const result: Record<string, { x: number; y: number }> = {};

  draft.measures.forEach((measure, index) => {
    result[measure.id] = {
      x: measureX,
      y: baseY + index * (MEMBER_CHIP_H + MEMBER_GAP),
    };
  });

  draft.dimensions.forEach((dimension, index) => {
    result[dimension.id] = {
      x: dimX,
      y: baseY + index * (MEMBER_CHIP_H + MEMBER_GAP),
    };
  });

  return result;
}

export function computeExpandedMemberBounds(
  cubeWorkspacePos: { x: number; y: number },
  draft: SemanticCubeDefinition
) {
  const positions = Object.values(computeExpandedMemberPositions(cubeWorkspacePos, draft));
  const xs = [cubeWorkspacePos.x, cubeWorkspacePos.x + WORKSPACE_CARD_W, ...positions.map((p) => p.x), ...positions.map((p) => p.x + MEMBER_CHIP_W)];
  const ys = [cubeWorkspacePos.y, cubeWorkspacePos.y + WORKSPACE_CARD_H, ...positions.map((p) => p.y), ...positions.map((p) => p.y + MEMBER_CHIP_H)];
  const pad = 64;
  return {
    minX: Math.min(...xs) - pad,
    minY: Math.min(...ys) - pad,
    maxX: Math.max(...xs) + pad,
    maxY: Math.max(...ys) + pad,
  };
}

export type CubeCanvasLayer =
  | 'visual'
  | 'relationships'
  | 'segments'
  | 'hierarchies'
  | 'rollups'
  | 'yaml';

export interface CanvasAuxNode {
  id: string;
  label: string;
  subtitle?: string;
  kind: 'join' | 'segment' | 'hierarchy' | 'rollup' | 'yaml';
}

/** Одна колонка узлов справа от карточки куба (сегменты, иерархии, сводки). */
export function computeAuxNodePositions(
  cubeWorkspacePos: { x: number; y: number },
  nodes: CanvasAuxNode[]
): Record<string, { x: number; y: number }> {
  const columnX = cubeWorkspacePos.x + WORKSPACE_CARD_W + MEMBER_OFFSET_X;
  const baseY = cubeWorkspacePos.y + MEMBER_HEADER_H;
  const result: Record<string, { x: number; y: number }> = {};

  nodes.forEach((node, index) => {
    result[node.id] = {
      x: columnX,
      y: baseY + index * (MEMBER_CHIP_H + MEMBER_GAP),
    };
  });

  return result;
}

function expandBounds(
  box: { minX: number; minY: number; maxX: number; maxY: number },
  x: number,
  y: number,
  w: number,
  h: number
) {
  return {
    minX: Math.min(box.minX, x),
    minY: Math.min(box.minY, y),
    maxX: Math.max(box.maxX, x + w),
    maxY: Math.max(box.maxY, y + h),
  };
}

export function computeLayerBounds(
  cubeWorkspacePos: { x: number; y: number },
  draft: SemanticCubeDefinition,
  layer: CubeCanvasLayer,
  cubePositions: Record<string, { x: number; y: number }>,
  auxPositions: Record<string, { x: number; y: number }> = {}
) {
  let box = {
    minX: cubeWorkspacePos.x,
    minY: cubeWorkspacePos.y,
    maxX: cubeWorkspacePos.x + WORKSPACE_CARD_W,
    maxY: cubeWorkspacePos.y + WORKSPACE_CARD_H,
  };

  if (layer === 'visual') {
    const memberBounds = computeExpandedMemberBounds(cubeWorkspacePos, draft);
    return memberBounds;
  }

  if (layer === 'relationships') {
    for (const join of draft.joins ?? []) {
      const targetPos = cubePositions[join.targetCube];
      if (!targetPos) continue;
      box = expandBounds(box, targetPos.x, targetPos.y, WORKSPACE_CARD_W, WORKSPACE_CARD_H);
    }
    const pad = 80;
    return {
      minX: box.minX - pad,
      minY: box.minY - pad,
      maxX: box.maxX + pad,
      maxY: box.maxY + pad,
    };
  }

  for (const pos of Object.values(auxPositions)) {
    box = expandBounds(box, pos.x, pos.y, MEMBER_CHIP_W, MEMBER_CHIP_H);
  }

  const pad = 64;
  return {
    minX: box.minX - pad,
    minY: box.minY - pad,
    maxX: box.maxX + pad,
    maxY: box.maxY + pad,
  };
}

export function buildCanvasAuxNodes(
  draft: SemanticCubeDefinition,
  layer: CubeCanvasLayer
): CanvasAuxNode[] {
  switch (layer) {
    case 'segments':
      return (draft.segments ?? []).map((segment) => ({
        id: segment.id,
        label: segment.title || segment.name,
        subtitle: segment.name,
        kind: 'segment' as const,
      }));
    case 'hierarchies':
      return (draft.hierarchies ?? []).map((hierarchy) => ({
        id: hierarchy.id,
        label: hierarchy.title || hierarchy.name,
        subtitle: hierarchy.levels.join(' → '),
        kind: 'hierarchy' as const,
      }));
    case 'rollups':
      return (draft.preAggregations ?? []).map((preAgg) => ({
        id: preAgg.id,
        label: preAgg.name,
        subtitle: `${preAgg.measures.length} показ. · ${preAgg.dimensions.length} разр.`,
        kind: 'rollup' as const,
      }));
    case 'yaml':
      return [
        {
          id: 'yaml:editor',
          label: 'YAML-редактор',
          subtitle: 'Текстовый режим в панели справа',
          kind: 'yaml' as const,
        },
      ];
    default:
      return [];
  }
}

export const CANVAS_LAYER_COLUMN_LABELS: Record<
  Exclude<CubeCanvasLayer, 'visual' | 'relationships'>,
  string
> = {
  segments: 'Сегменты',
  hierarchies: 'Иерархии',
  rollups: 'Предагрегации',
  yaml: 'YAML',
};

export function graphOffsetForMember(
  cubeWorkspacePos: { x: number; y: number },
  memberWorkspacePos: { x: number; y: number },
  _draft: SemanticCubeDefinition,
  graphLayout: SemanticGraphLayout
) {
  void graphLayout;
  return {
    x: memberWorkspacePos.x - cubeWorkspacePos.x - WORKSPACE_CARD_W - MEMBER_OFFSET_X,
    y: memberWorkspacePos.y - cubeWorkspacePos.y - MEMBER_HEADER_H,
  };
}
