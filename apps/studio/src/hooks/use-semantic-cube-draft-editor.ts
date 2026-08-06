import type { SemanticCubeDefinition, SemanticGraphLayout } from '@sellerpool/core';
import { DEFAULT_ORDERS_GRAPH_LAYOUT } from '@sellerpool/core';
import { useCallback, useEffect, useRef, useState } from 'react';

import { semanticCubeNodeId } from '@/lib/semantic-utils';
import { useDiscardSemanticDraft, useSemanticCube, useUpdateSemanticDraft } from '@/hooks/use-semantic';
import { useCanWriteDashboards } from '@/hooks/use-me';
import type { SemanticInspectorNodeId } from '@/components/semantic/semantic-cube-inspector';
import { nextMemberName } from '@/lib/semantic-cube-draft';

type EditorSnapshot = {
  draft: SemanticCubeDefinition;
  layout: SemanticGraphLayout;
};

export function useSemanticCubeDraftEditor(cubeName: string) {
  const canWrite = useCanWriteDashboards();
  const { data: cube, isLoading, error } = useSemanticCube(cubeName);
  const updateDraft = useUpdateSemanticDraft(cubeName);
  const discardDraft = useDiscardSemanticDraft(cubeName);

  const [draft, setDraft] = useState<SemanticCubeDefinition | null>(null);
  const [layout, setLayout] = useState<SemanticGraphLayout>(DEFAULT_ORDERS_GRAPH_LAYOUT);
  const [selected, setSelected] = useState<SemanticInspectorNodeId>('');
  const [savedHint, setSavedHint] = useState(false);

  const historyRef = useRef<EditorSnapshot[]>([]);
  const futureRef = useRef<EditorSnapshot[]>([]);
  const saveTimerRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    setDraft(null);
    hydratedRef.current = false;
  }, [cubeName]);

  useEffect(() => {
    if (!cube) return;
    setDraft(cube.draft);
    setLayout(cube.layout);
    setSelected(semanticCubeNodeId(cube.name));
    historyRef.current = [{ draft: cube.draft, layout: cube.layout }];
    futureRef.current = [];
    hydratedRef.current = true;
  }, [cube]);

  const pushHistory = useCallback((snapshot: EditorSnapshot) => {
    historyRef.current = [...historyRef.current.slice(-49), snapshot];
    futureRef.current = [];
  }, []);

  const scheduleSave = useCallback(
    (nextDraft: SemanticCubeDefinition, nextLayout: SemanticGraphLayout) => {
      if (!canWrite || !hydratedRef.current) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        try {
          await updateDraft.mutateAsync({ draft: nextDraft, layout: nextLayout });
          setSavedHint(true);
          window.setTimeout(() => setSavedHint(false), 1500);
        } catch {
          /* ignore */
        }
      }, 700);
    },
    [canWrite, updateDraft]
  );

  const applySnapshot = useCallback(
    (snapshot: EditorSnapshot, recordHistory: boolean) => {
      setDraft(snapshot.draft);
      setLayout(snapshot.layout);
      if (recordHistory) pushHistory(snapshot);
      scheduleSave(snapshot.draft, snapshot.layout);
    },
    [pushHistory, scheduleSave]
  );

  const activeLayoutForSave = useCallback(() => {
    return draft !== null ? layout : (cube?.layout ?? DEFAULT_ORDERS_GRAPH_LAYOUT);
  }, [cube?.layout, draft, layout]);

  const handleDraftChange = useCallback(
    (nextDraft: SemanticCubeDefinition) => {
      const currentDraft = draft ?? cube?.draft;
      if (!currentDraft) return;
      applySnapshot({ draft: nextDraft, layout: activeLayoutForSave() }, true);
    },
    [activeLayoutForSave, applySnapshot, cube?.draft, draft]
  );

  const handleLayoutChange = useCallback(
    (nextLayout: SemanticGraphLayout) => {
      const currentDraft = draft ?? cube?.draft;
      if (!currentDraft) return;
      setLayout(nextLayout);
      scheduleSave(currentDraft, nextLayout);
    },
    [cube?.draft, draft, scheduleSave]
  );

  const handleAddMeasure = useCallback(() => {
    const currentDraft = draft ?? cube?.draft;
    const currentLayout = draft !== null ? layout : (cube?.layout ?? DEFAULT_ORDERS_GRAPH_LAYOUT);
    if (!currentDraft) return;
    const name = nextMemberName(
      'metric',
      currentDraft.measures.map((item) => item.name)
    );
    const id = `measure:${name}`;
    const measure = {
      id,
      name,
      title: 'Новая мера',
      sql: 'amount',
      type: 'sum' as const,
    };
    const nextDraft = { ...currentDraft, measures: [...currentDraft.measures, measure] };
    const nextLayout = {
      ...currentLayout,
      [id]: { x: 576, y: 32 + currentDraft.measures.length * 96 },
    };
    setSelected(id);
    applySnapshot({ draft: nextDraft, layout: nextLayout }, true);
  }, [applySnapshot, cube?.draft, cube?.layout, draft, layout]);

  const handleAddDimension = useCallback(() => {
    const currentDraft = draft ?? cube?.draft;
    const currentLayout = draft !== null ? layout : (cube?.layout ?? DEFAULT_ORDERS_GRAPH_LAYOUT);
    if (!currentDraft) return;
    const name = nextMemberName(
      'dim',
      currentDraft.dimensions.filter((item) => !item.locked).map((item) => item.name)
    );
    const id = `dimension:${name}`;
    const dimension = {
      id,
      name,
      title: 'Новое измерение',
      sql: name,
      type: 'string' as const,
    };
    const nextDraft = { ...currentDraft, dimensions: [...currentDraft.dimensions, dimension] };
    const nextLayout = {
      ...currentLayout,
      [id]: { x: 576, y: 320 + (currentDraft.dimensions.length - 1) * 72 },
    };
    setSelected(id);
    applySnapshot({ draft: nextDraft, layout: nextLayout }, true);
  }, [applySnapshot, cube?.draft, cube?.layout, draft, layout]);

  const handleDeleteMeasure = useCallback(
    (measureId: string) => {
      const currentDraft = draft ?? cube?.draft;
      const currentLayout = draft !== null ? layout : (cube?.layout ?? DEFAULT_ORDERS_GRAPH_LAYOUT);
      if (!currentDraft) return;
      const nextDraft = {
        ...currentDraft,
        measures: currentDraft.measures.filter((item) => item.id !== measureId),
      };
      const nextLayout = { ...currentLayout };
      delete nextLayout[measureId];
      const nextSelected =
        nextDraft.measures[0]?.id ?? semanticCubeNodeId(currentDraft.name);
      setSelected(nextSelected);
      applySnapshot({ draft: nextDraft, layout: nextLayout }, true);
    },
    [applySnapshot, cube?.draft, cube?.layout, cube?.name, draft, layout]
  );

  const handleDeleteDimension = useCallback(
    (dimensionId: string) => {
      const currentDraft = draft ?? cube?.draft;
      const currentLayout = draft !== null ? layout : (cube?.layout ?? DEFAULT_ORDERS_GRAPH_LAYOUT);
      if (!currentDraft) return;
      const dimension = currentDraft.dimensions.find((item) => item.id === dimensionId);
      if (dimension?.locked) return;
      if (currentDraft.dimensions.length <= 1) return;
      const nextDraft = {
        ...currentDraft,
        dimensions: currentDraft.dimensions.filter((item) => item.id !== dimensionId),
      };
      const nextLayout = { ...currentLayout };
      delete nextLayout[dimensionId];
      const nextSelected =
        nextDraft.dimensions.find((item) => !item.locked)?.id ??
        semanticCubeNodeId(currentDraft.name);
      setSelected(nextSelected);
      applySnapshot({ draft: nextDraft, layout: nextLayout }, true);
    },
    [applySnapshot, cube?.draft, cube?.layout, cube?.name, draft, layout]
  );

  const handleUndo = useCallback(() => {
    if (historyRef.current.length < 2 || !draft) return;
    const current = historyRef.current.pop();
    if (!current) return;
    futureRef.current = [current, ...futureRef.current];
    const previous = historyRef.current[historyRef.current.length - 1];
    if (!previous) return;
    applySnapshot(previous, false);
  }, [applySnapshot, draft]);

  const handleRedo = useCallback(() => {
    const next = futureRef.current.shift();
    if (!next) return;
    historyRef.current.push(next);
    applySnapshot(next, false);
  }, [applySnapshot]);

  const handleDiscard = useCallback(async () => {
    try {
      const result = await discardDraft.mutateAsync();
      setDraft(result.draft);
      setLayout(result.layout);
      historyRef.current = [{ draft: result.draft, layout: result.layout }];
      futureRef.current = [];
      setSelected(semanticCubeNodeId(result.draft.name));
    } catch {
      /* ignore */
    }
  }, [discardDraft]);

  return {
    cube,
    draft: draft ?? cube?.draft ?? null,
    layout: draft !== null ? layout : (cube?.layout ?? DEFAULT_ORDERS_GRAPH_LAYOUT),
    selected,
    setSelected,
    isLoading,
    error,
    savedHint,
    isSaving: updateDraft.isPending,
    isDiscarding: discardDraft.isPending,
    isDraft: cube?.status === 'draft',
    needsFirstPublish: !cube?.publishedAt,
    widgetCount: cube?.widgetCount ?? 0,
    draftRef,
    handleDraftChange,
    handleLayoutChange,
    handleAddMeasure,
    handleAddDimension,
    handleDeleteMeasure,
    handleDeleteDimension,
    handleUndo,
    handleRedo,
    handleDiscard,
  };
}
