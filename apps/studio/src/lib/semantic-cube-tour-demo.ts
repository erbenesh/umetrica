import type { SemanticCubeDefinition } from '@sellerpool/core';
import { buildSuggestedJoinSql, semanticJoinId } from '@sellerpool/core';

import type { SemanticCubeEditorTab } from '@/components/semantic/semantic-cube-editor-header';
import type { SemanticNodeId } from '@/components/semantic/semantic-node-editor';

export const TOUR_DEMO_SEGMENT_ID = 'segment:tour_demo_paid';
export const TOUR_DEMO_HIERARCHY_ID = 'hierarchy:tour_demo';
export const TOUR_DEMO_JOIN_SUFFIX = ':tour_demo';

export type SemanticCubeTourSnapshot = {
  draft: SemanticCubeDefinition;
  selected: SemanticNodeId;
  tab: SemanticCubeEditorTab;
};

export function createTourSnapshot(
  draft: SemanticCubeDefinition,
  selected: SemanticNodeId,
  tab: SemanticCubeEditorTab
): SemanticCubeTourSnapshot {
  return {
    draft: structuredClone(draft),
    selected,
    tab,
  };
}

export function applyTourMeasureRename(draft: SemanticCubeDefinition): SemanticCubeDefinition {
  const measure = draft.measures[0];
  if (!measure) return draft;

  return {
    ...draft,
    measures: draft.measures.map((item) =>
      item.id === measure.id ? { ...item, title: 'Выручка (пример)' } : item
    ),
  };
}

export function applyTourDemoSegment(draft: SemanticCubeDefinition): SemanticCubeDefinition {
  if ((draft.segments ?? []).some((item) => item.id === TOUR_DEMO_SEGMENT_ID)) {
    return draft;
  }

  return {
    ...draft,
    segments: [
      ...(draft.segments ?? []),
      {
        id: TOUR_DEMO_SEGMENT_ID,
        name: 'tour_paid_only',
        title: 'Только оплаченные',
        sql: "status = 'paid'",
      },
    ],
  };
}

export function applyTourDemoHierarchy(draft: SemanticCubeDefinition): SemanticCubeDefinition {
  if ((draft.hierarchies ?? []).some((item) => item.id === TOUR_DEMO_HIERARCHY_ID)) {
    return draft;
  }

  const levels = draft.dimensions
    .filter((item) => !item.locked)
    .slice(0, 2)
    .map((item) => item.name);

  if (levels.length < 2) return draft;

  return {
    ...draft,
    hierarchies: [
      ...(draft.hierarchies ?? []),
      {
        id: TOUR_DEMO_HIERARCHY_ID,
        name: 'tour_geo',
        title: 'География (пример)',
        levels,
      },
    ],
  };
}

export function applyTourDemoJoin(
  draft: SemanticCubeDefinition,
  targetCube?: string
): SemanticCubeDefinition {
  if (!targetCube) return draft;

  const joinId = semanticJoinId(draft.name, targetCube) + TOUR_DEMO_JOIN_SUFFIX;
  if ((draft.joins ?? []).some((item) => item.id === joinId)) {
    return draft;
  }

  return {
    ...draft,
    joins: [
      ...(draft.joins ?? []),
      {
        id: joinId,
        targetCube,
        relationship: 'belongsTo',
        sql: buildSuggestedJoinSql(draft.name, 'id', targetCube, `${targetCube.toLowerCase()}_id`),
      },
    ],
  };
}
