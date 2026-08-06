import type { SemanticCubeDefinition } from '@sellerpool/core';
import { semanticCubeNodeId, semanticJoinId } from '@sellerpool/core';

import type { SemanticCubeEditorTab } from '@/components/semantic/semantic-cube-editor-header';

export function tabForSelection(selected: string): SemanticCubeEditorTab | null {
  if (!selected) return null;
  if (selected.startsWith('measure:') || selected.startsWith('dimension:') || selected.startsWith('cube:')) {
    return 'visual';
  }
  if (selected.startsWith('join:')) return 'relationships';
  if (selected.startsWith('segment:')) return 'segments';
  if (selected.startsWith('hierarchy:')) return 'hierarchies';
  if (selected.startsWith('preAgg:')) return 'rollups';
  if (selected === 'yaml:editor') return 'yaml';
  return null;
}

export function defaultSelectionForTab(
  draft: SemanticCubeDefinition,
  tab: SemanticCubeEditorTab
): string {
  switch (tab) {
    case 'visual':
      return semanticCubeNodeId(draft.name);
    case 'relationships':
      return draft.joins?.[0]?.id ?? semanticCubeNodeId(draft.name);
    case 'segments':
      return draft.segments?.[0]?.id ?? semanticCubeNodeId(draft.name);
    case 'hierarchies':
      return draft.hierarchies?.[0]?.id ?? semanticCubeNodeId(draft.name);
    case 'rollups':
      return draft.preAggregations?.[0]?.id ?? semanticCubeNodeId(draft.name);
    case 'yaml':
      return 'yaml:editor';
  }
}

export function shouldSyncTabOnSelect(id: string, currentTab: SemanticCubeEditorTab): boolean {
  const nextTab = tabForSelection(id);
  if (!nextTab || nextTab === currentTab) return false;
  if (id.startsWith('cube:') && currentTab !== 'visual') return false;
  return true;
}

export function joinIdForTargetCube(draft: SemanticCubeDefinition, targetCube: string): string | null {
  const join = (draft.joins ?? []).find((item) => item.targetCube === targetCube);
  return join?.id ?? semanticJoinId(draft.name, targetCube);
}
