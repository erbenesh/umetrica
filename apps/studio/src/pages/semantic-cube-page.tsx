import type { SemanticCubeDefinition, SemanticGraphLayout } from '@umetrica/core';
import { DEFAULT_ORDERS_GRAPH_LAYOUT } from '@umetrica/core';
import { ChevronRight, Loader2, Redo2, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { MobilePageHeader } from '@/components/layout/mobile-page-header';
import {
  SemanticNodeEditor,
  type SemanticNodeId,
} from '@/components/semantic/semantic-node-editor';
import { SemanticPublishDialog } from '@/components/semantic/semantic-publish-dialog';
import { Button } from '@/components/ui/button';
import { semanticCubeNodeId } from '@/lib/semantic-utils';
import { useConnections } from '@/hooks/use-connections';
import {
  useDiscardSemanticDraft,
  useSemanticCube,
  useUpdateSemanticDraft,
} from '@/hooks/use-semantic';
import { useCanWriteDashboards } from '@/hooks/use-me';

type EditorSnapshot = {
  draft: SemanticCubeDefinition;
  layout: SemanticGraphLayout;
};

function nextMemberName(prefix: string, existing: string[]) {
  let index = 1;
  while (existing.includes(`${prefix}_${index}`)) {
    index += 1;
  }
  return `${prefix}_${index}`;
}

export function SemanticCubePage() {
  const { cubeName = '' } = useParams<{ cubeName: string }>();
  const canWrite = useCanWriteDashboards();
  const { data: connections } = useConnections();
  const { data: cube, isLoading, error } = useSemanticCube(cubeName);
  const updateDraft = useUpdateSemanticDraft(cubeName);
  const discardDraft = useDiscardSemanticDraft(cubeName);

  const [draft, setDraft] = useState<SemanticCubeDefinition | null>(null);
  const [layout, setLayout] = useState<SemanticGraphLayout>(DEFAULT_ORDERS_GRAPH_LAYOUT);
  const [selected, setSelected] = useState<SemanticNodeId>('measure:revenue');
  const [publishOpen, setPublishOpen] = useState(false);
  const [savedHint, setSavedHint] = useState(false);

  const historyRef = useRef<EditorSnapshot[]>([]);
  const futureRef = useRef<EditorSnapshot[]>([]);
  const saveTimerRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    setDraft(null);
    hydratedRef.current = false;
  }, [cubeName]);

  useEffect(() => {
    if (!cube) return;
    setDraft(cube.draft);
    setLayout(cube.layout);
    setSelected(cube.draft.measures[0]?.id ?? semanticCubeNodeId(cube.name));
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

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(async () => {
        try {
          await updateDraft.mutateAsync({ draft: nextDraft, layout: nextLayout });
          setSavedHint(true);
          window.setTimeout(() => setSavedHint(false), 1500);
        } catch {
          /* surfaced via mutation state if needed */
        }
      }, 700);
    },
    [canWrite, updateDraft]
  );

  const applySnapshot = useCallback(
    (snapshot: EditorSnapshot, recordHistory: boolean) => {
      setDraft(snapshot.draft);
      setLayout(snapshot.layout);
      if (recordHistory) {
        pushHistory(snapshot);
      }
      scheduleSave(snapshot.draft, snapshot.layout);
    },
    [pushHistory, scheduleSave]
  );

  const handleDraftChange = useCallback(
    (nextDraft: SemanticCubeDefinition) => {
      const currentDraft = draft ?? cube?.draft;
      if (!currentDraft) return;
      const snapshot = { draft: nextDraft, layout: activeLayoutForSave() };
      applySnapshot(snapshot, true);
    },
    [applySnapshot, draft, cube, layout]
  );

  function activeLayoutForSave() {
    return draft !== null ? layout : (cube?.layout ?? DEFAULT_ORDERS_GRAPH_LAYOUT);
  }

  const handleLayoutChange = useCallback(
    (nextLayout: SemanticGraphLayout) => {
      const currentDraft = draft ?? cube?.draft;
      if (!currentDraft) return;
      setLayout(nextLayout);
      scheduleSave(currentDraft, nextLayout);
    },
    [draft, cube, scheduleSave]
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
      [id]: {
        x: 576,
        y: 32 + currentDraft.measures.length * 96,
      },
    };
    setSelected(id as SemanticNodeId);
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
      [id]: {
        x: 576,
        y: 320 + (currentDraft.dimensions.length - 1) * 72,
      },
    };
    setSelected(id as SemanticNodeId);
    applySnapshot({ draft: nextDraft, layout: nextLayout }, true);
  }, [applySnapshot, cube?.draft, cube?.layout, draft, layout]);

  const handleUndo = () => {
    if (historyRef.current.length < 2 || !draft) return;
    const current = historyRef.current.pop();
    if (!current) return;
    futureRef.current = [current, ...futureRef.current];
    const previous = historyRef.current[historyRef.current.length - 1];
    if (!previous) return;
    applySnapshot(previous, false);
  };

  const handleRedo = () => {
    const next = futureRef.current.shift();
    if (!next) return;
    historyRef.current.push(next);
    applySnapshot(next, false);
  };

  const handleDiscard = async () => {
    try {
      const result = await discardDraft.mutateAsync();
      setDraft(result.draft);
      setLayout(result.layout);
      historyRef.current = [{ draft: result.draft, layout: result.layout }];
      futureRef.current = [];
    } catch {
      /* ignore */
    }
  };

  const hasPostgres = (connections?.items ?? []).some(
    (item) => item.provider === 'postgresql' || item.provider === 'postgres'
  );
  const connectionLabel = hasPostgres ? 'PostgreSQL' : 'Демо · PostgreSQL';

  if (isLoading) {
    return (
      <div className="app-page flex items-center justify-center p-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Загрузка куба...
      </div>
    );
  }

  if (error || !cube) {
    return <Navigate to="/semantic" replace />;
  }

  const activeDraft = draft ?? cube.draft;
  const activeLayout = draft !== null ? layout : cube.layout;

  const isDraft = cube.status === 'draft';

  return (
    <div className="app-page">
      <MobilePageHeader
        title={cube.name}
        back={{ to: '/semantic', label: 'Семантика' }}
        actions={
          canWrite ? (
            <Button size="sm" type="button" onClick={() => setPublishOpen(true)}>
              Опубликовать
            </Button>
          ) : null
        }
      />

      <header className="editor-toolbar">
        <div className="editor-toolbar__crumb">
          <Link to="/semantic">Семантика</Link>
          <ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={2} />
          <span>{cube.name}</span>
        </div>
        <div className="editor-toolbar__actions">
          <span
            className={
              isDraft ? 'db-tag db-tag--blue editor-toolbar__status' : 'db-tag db-tag--green editor-toolbar__status'
            }
          >
            {isDraft ? 'Черновик' : 'Опубликован'}
          </span>
          {savedHint ? <span className="text-xs text-muted-foreground">Сохранено</span> : null}
          {updateDraft.isPending ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
            </span>
          ) : null}
          {canWrite ? (
            <>
              <Button variant="ghost" size="icon-sm" type="button" onClick={handleUndo} aria-label="Отменить">
                <Undo2 size={16} />
              </Button>
              <Button variant="ghost" size="icon-sm" type="button" onClick={handleRedo} aria-label="Повторить">
                <Redo2 size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={handleDiscard}
                disabled={!isDraft || discardDraft.isPending}
              >
                Отменить
              </Button>
              <Button size="sm" type="button" onClick={() => setPublishOpen(true)}>
                Опубликовать
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <SemanticNodeEditor
        draft={activeDraft}
        layout={activeLayout}
        selected={selected}
        canWrite={canWrite}
        widgetCount={cube.widgetCount}
        connectionLabel={connectionLabel}
        onSelect={setSelected}
        onDraftChange={handleDraftChange}
        onAddMeasure={handleAddMeasure}
        onAddDimension={handleAddDimension}
        onLayoutChange={handleLayoutChange}
      />

      <SemanticPublishDialog
        cubeName={cube.name}
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublished={() => {
          setPublishOpen(false);
        }}
      />
    </div>
  );
}
