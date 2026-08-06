import type { SemanticViewDefinition } from '@sellerpool/core';
import { semanticCubeLabel } from '@sellerpool/core';
import { Box, Database, Eye, Layers, Loader2, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';

import { DocCallout } from '@/components/doc/doc-callout';
import { SemanticCubeSidePanel } from '@/components/semantic/semantic-cube-side-panel';
import { SemanticNewCubeDialog } from '@/components/semantic/semantic-new-cube-dialog';
import { SemanticNewViewDialog } from '@/components/semantic/semantic-new-view-dialog';
import { SemanticPublishDialog } from '@/components/semantic/semantic-publish-dialog';
import {
  SemanticUnifiedCanvas,
  type SemanticUnifiedCanvasHandle,
} from '@/components/semantic/semantic-workspace-canvas';
import { SemanticViewPublishDialog } from '@/components/semantic/semantic-view-publish-dialog';
import { Button } from '@/components/ui/button';
import { useConnections } from '@/hooks/use-connections';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';
import { useSemanticCubeDraftEditor } from '@/hooks/use-semantic-cube-draft-editor';
import {
  useCubeJoinContext,
  useSemanticView,
  useSemanticWorkspace,
  useUpdateSemanticViewDraft,
} from '@/hooks/use-semantic';
import { useSemanticWorkspaceUrl } from '@/lib/semantic-workspace-url';
import {
  defaultSelectionForTab,
  shouldSyncTabOnSelect,
  tabForSelection,
} from '@/lib/semantic-cube-selection';
import type { SemanticCubeEditorTab } from '@/components/semantic/semantic-cube-editor-header';
import {
  applyTourDemoHierarchy,
  applyTourDemoJoin,
  applyTourDemoSegment,
  applyTourMeasureRename,
  createTourSnapshot,
  type SemanticCubeTourSnapshot,
} from '@/lib/semantic-cube-tour-demo';
import { useSemanticCubeTour } from '@/hooks/use-semantic-cube-tour';
import { MEMBER_KIND_LABELS } from '@/lib/semantic-labels';
import { cn } from '@/lib/utils';

function resolveSourceLabel(hasPostgres: boolean) {
  return hasPostgres ? 'PostgreSQL' : 'Демо · PostgreSQL';
}

export function SemanticLegacyRedirect() {
  const { cubeName, viewName } = useParams<{ cubeName?: string; viewName?: string }>();
  const [searchParams] = useSearchParams();
  const params = new URLSearchParams();
  if (cubeName) params.set('cube', cubeName);
  if (viewName) params.set('view', viewName);
  const tab = searchParams.get('tab');
  const joinTarget = searchParams.get('joinTarget');
  if (tab) params.set('tab', tab);
  if (joinTarget) params.set('joinTarget', joinTarget);
  const query = params.toString();
  return <Navigate to={query ? `/semantic?${query}` : '/semantic'} replace />;
}

export function SemanticWorkspacePage() {
  const url = useSemanticWorkspaceUrl();
  const { cube, view, tab, joinTarget, setCube, setView, setTab, clearFocus } = url;
  const [workspaceTab, setWorkspaceTab] = useState<'cubes' | 'views'>(view ? 'views' : 'cubes');

  const { data: me } = useMe();
  const canWrite = useCanWriteDashboards();
  const [newCubeOpen, setNewCubeOpen] = useState(false);
  const [newViewOpen, setNewViewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [viewPublishOpen, setViewPublishOpen] = useState(false);

  const { data: connections } = useConnections();
  const { data: workspace, isLoading, error } = useSemanticWorkspace();
  const { data: joinContext } = useCubeJoinContext();
  const cubeEditor = useSemanticCubeDraftEditor(cube ?? '');
  const canvasRef = useRef<SemanticUnifiedCanvasHandle>(null);
  const tourSnapshotRef = useRef<SemanticCubeTourSnapshot | null>(null);

  const { data: viewDetail } = useSemanticView(view ?? '');
  const [viewDraft, setViewDraft] = useState<SemanticViewDefinition | null>(null);
  const viewSaveTimerRef = useRef<number | null>(null);
  const updateViewDraft = useUpdateSemanticViewDraft(view ?? '');

  useEffect(() => {
    if (view) setWorkspaceTab('views');
    if (cube) setWorkspaceTab('cubes');
  }, [cube, view]);

  useEffect(() => {
    if (!viewDetail) return;
    setViewDraft(viewDetail.draft);
  }, [viewDetail]);

  const orgName = me?.organization?.name ?? 'Компания';
  const hasPostgres = (connections?.items ?? []).some(
    (item) => item.provider === 'postgresql' || item.provider === 'postgres'
  );
  const cubes = workspace?.cubes ?? [];
  const views = workspace?.views ?? [];
  const layout = workspace?.layout ?? { cubes: {}, views: {} };
  const sourceLabel = resolveSourceLabel(hasPostgres);
  const unpublishedCount = cubes.filter((item) => !item.publishedAt || item.status === 'draft').length;

  const connectionLabel = hasPostgres ? 'PostgreSQL' : 'Демо · PostgreSQL';
  const otherCubeName = useMemo(
    () => joinContext?.cubes.find((item) => item.name !== cube)?.name,
    [joinContext?.cubes, cube]
  );


  const scheduleViewSave = useCallback(
    (nextDraft: SemanticViewDefinition) => {
      if (!canWrite || !view) return;
      if (viewSaveTimerRef.current) window.clearTimeout(viewSaveTimerRef.current);
      viewSaveTimerRef.current = window.setTimeout(() => {
        updateViewDraft.mutate({ draft: nextDraft });
      }, 700);
    },
    [canWrite, updateViewDraft, view]
  );

  const toggleViewMember = useCallback(
    (joinPath: string, memberName: string) => {
      if (!viewDraft) return;
      const nextDraft: SemanticViewDefinition = {
        ...viewDraft,
        cubes: viewDraft.cubes.map((item) => {
          if (item.joinPath !== joinPath) return item;
          const has = item.includes.includes(memberName);
          return {
            ...item,
            includes: has
              ? item.includes.filter((name) => name !== memberName)
              : [...item.includes, memberName],
          };
        }),
      };
      setViewDraft(nextDraft);
      scheduleViewSave(nextDraft);
    },
    [scheduleViewSave, viewDraft]
  );

  const handleCanvasSelect = useCallback(
    (id: string) => {
      if (shouldSyncTabOnSelect(id, tab)) {
        const nextTab = tabForSelection(id);
        if (nextTab) setTab(nextTab);
      }
      cubeEditor.setSelected(id);
    },
    [cubeEditor, setTab, tab]
  );

  const handleCubeTabChange = useCallback(
    (nextTab: SemanticCubeEditorTab) => {
      setTab(nextTab);
      if (!cubeEditor.draft) return;
      const selectionTab = tabForSelection(cubeEditor.selected);
      if (selectionTab !== nextTab) {
        cubeEditor.setSelected(defaultSelectionForTab(cubeEditor.draft, nextTab));
      }
    },
    [cubeEditor, setTab]
  );

  const handleTourStart = useCallback(() => {
    if (!cube || !cubeEditor.draft) return;
    tourSnapshotRef.current = createTourSnapshot(
      cubeEditor.draft,
      cubeEditor.selected,
      tab
    );
  }, [cube, cubeEditor.draft, cubeEditor.selected, tab]);

  const handleTourEnd = useCallback(() => {
    const snapshot = tourSnapshotRef.current;
    if (!snapshot || !cubeEditor.draft) return;
    cubeEditor.handleDraftChange(snapshot.draft);
    cubeEditor.setSelected(snapshot.selected);
    setTab(snapshot.tab);
    tourSnapshotRef.current = null;
  }, [cubeEditor, setTab]);

  const tourRuntime = useMemo(
    () => ({
      switchTab: setTab,
      centerOnTarget: (selector: string) => canvasRef.current?.centerTourTarget(selector) ?? Promise.resolve(),
      prepare: (stepId: string) => {
        const current = cubeEditor.draftRef.current ?? cubeEditor.draft;
        if (!current) return;
        switch (stepId) {
          case 'visual-canvas':
            setTab('visual');
            break;
          case 'visual-measure': {
            const measureId = current.measures[0]?.id;
            if (measureId) cubeEditor.setSelected(measureId);
            break;
          }
          case 'visual-inspector-demo': {
            const measureId = current.measures[0]?.id;
            const nextDraft = applyTourMeasureRename(current);
            cubeEditor.handleDraftChange(nextDraft);
            if (measureId) cubeEditor.setSelected(measureId);
            break;
          }
          case 'relationships-demo':
            cubeEditor.handleDraftChange(applyTourDemoJoin(current, otherCubeName));
            break;
          case 'segments-demo':
            cubeEditor.handleDraftChange(applyTourDemoSegment(current));
            break;
          case 'hierarchies-demo':
            cubeEditor.handleDraftChange(applyTourDemoHierarchy(current));
            break;
          case 'finish-visual':
            setTab('visual');
            break;
        }
      },
    }),
    [cubeEditor, otherCubeName, setTab]
  );

  const { tourActive, startTour } = useSemanticCubeTour({
    ready: Boolean(cube && cubeEditor.draft && !cubeEditor.isLoading),
    editorTab: tab,
    runtime: tourRuntime,
    onTourStart: handleTourStart,
    onTourEnd: handleTourEnd,
  });

  const invalidCube = Boolean(cube && !cubeEditor.isLoading && (cubeEditor.error || !cubeEditor.draft));

  if (invalidCube) {
    return <Navigate to="/semantic" replace />;
  }

  if (!isLoading && cubes.length === 0) {
    return (
      <div className="app-page semantic-ide">
        <header className="semantic-ide__toolbar">
          <div className="semantic-ide__brand">
            <Layers size={18} strokeWidth={1.75} />
            <div>
              <h1 className="semantic-ide__title">Семантика</h1>
              <p className="semantic-ide__subtitle">Модель данных для дашбордов</p>
            </div>
          </div>
        </header>
        <div className="semantic-ide__empty">
          <Database className="empty-state__icon" strokeWidth={1.5} />
          <h2 className="empty-state__title">Нет кубов</h2>
          <p className="empty-state__desc">
            Подключите базу или выберите демо-таблицу — система сама предложит показатели и разрезы.
          </p>
          <div className="empty-state__actions">
            <Link to="/settings/connections/add-db">
              <Button type="button">Подключить БД</Button>
            </Link>
            <Button type="button" disabled={!canWrite} onClick={() => setNewCubeOpen(true)}>
              Новый куб
            </Button>
          </div>
        </div>
        <SemanticNewCubeDialog open={newCubeOpen} onClose={() => setNewCubeOpen(false)} />
      </div>
    );
  }

  const cubeLabel = cubeEditor.draft ? semanticCubeLabel(cubeEditor.draft) : cube ?? '';

  return (
    <div className="app-page semantic-ide semantic-ide--unified">
      <header className="semantic-ide__toolbar">
        {view && viewDetail && !cube ? (
          <div className="semantic-ide__view-toolbar">
            <Button variant="ghost" size="sm" type="button" className="semantic-ide__back-btn" onClick={clearFocus}>
              К графу
            </Button>
            <span className="semantic-cube-header__name">{viewDetail.draft.title || view}</span>
            {canWrite ? (
              <Button size="sm" type="button" onClick={() => setViewPublishOpen(true)}>
                Опубликовать
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="semantic-ide__brand">
              <Layers size={18} strokeWidth={1.75} />
              <div>
                <h1 className="semantic-ide__title">Семантика</h1>
                <p className="semantic-ide__subtitle">
                  {cubes.length} кубов · {views.length} представлений · {orgName} · {sourceLabel}
                </p>
              </div>
            </div>
            <div className="semantic-ide__toolbar-actions">
              <div className="segmented segmented--dense" role="tablist" aria-label="Раздел семантики">
                <button
                  className={cn('segmented__btn', workspaceTab === 'cubes' && 'is-active')}
                  type="button"
                  onClick={() => {
                    setWorkspaceTab('cubes');
                    if (view) clearFocus();
                  }}
                >
                  <Box size={14} />
                  Кубы
                </button>
                <button
                  className={cn('segmented__btn', workspaceTab === 'views' && 'is-active')}
                  type="button"
                  onClick={() => {
                    setWorkspaceTab('views');
                    if (cube) clearFocus();
                  }}
                >
                  <Eye size={14} />
                  Представления
                </button>
              </div>
              {workspaceTab === 'cubes' ? (
                <Button size="sm" type="button" disabled={!canWrite} onClick={() => setNewCubeOpen(true)}>
                  <Plus size={14} />
                  Куб
                </Button>
              ) : (
                <Button size="sm" type="button" disabled={!canWrite} onClick={() => setNewViewOpen(true)}>
                  <Plus size={14} />
                  Представление
                </Button>
              )}
            </div>
          </>
        )}
      </header>

      {error ? (
        <DocCallout className="semantic-ide__banner border-destructive/40">
          {error instanceof Error ? error.message : 'Ошибка загрузки рабочей области'}
        </DocCallout>
      ) : null}

      {unpublishedCount > 0 && !cube && !view ? (
        <DocCallout className="semantic-ide__banner">
          {unpublishedCount === 1
            ? '1 куб ждёт публикации — без неё дашборды не увидят ваши правки.'
            : `${unpublishedCount} кубов ждут публикации — без неё дашборды не увидят ваши правки.`}
        </DocCallout>
      ) : null}

      {cube && cubeEditor.needsFirstPublish && tab === 'visual' ? (
        <DocCallout variant="info" className="semantic-ide__banner">
          Куб ещё не опубликован — переименуйте поля и нажмите «Опубликовать».
        </DocCallout>
      ) : null}

      <div className="semantic-ide__workspace">
        <div className="semantic-ide__canvas-area">
          {isLoading ? (
            <div className="semantic-ide__canvas-loading">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Загрузка…
            </div>
          ) : (
            <SemanticUnifiedCanvas
              ref={canvasRef}
              tab={workspaceTab}
              cubes={cubes}
              views={views}
              layout={layout}
              canWrite={canWrite}
              focusCube={cube}
              focusView={view}
              expandedCubeDraft={cube ? cubeEditor.draft ?? undefined : undefined}
              expandedCubeLayout={cube ? cubeEditor.layout : undefined}
              cubeEditorTab={cube ? tab : undefined}
              inspectorNodeId={cube ? cubeEditor.selected : undefined}
              onInspectorNodeId={cube ? handleCanvasSelect : undefined}
              onFocusCube={(name) => setCube(name)}
              onFocusView={(name) => setView(name)}
              onOpenRelationships={(name) => setCube(name, { tab: 'relationships' })}
              onJoinCubes={(source, target) =>
                setCube(source, { tab: 'relationships', joinTarget: target })
              }
              viewDraft={view ? viewDraft ?? undefined : undefined}
              viewCubeDefs={joinContext?.cubes}
              onToggleViewMember={toggleViewMember}
              onClearFocus={clearFocus}
            />
          )}
        </div>

        {cube && cubeEditor.draft ? (
          <SemanticCubeSidePanel
            cubeName={cube}
            cubeLabel={cubeLabel}
            tab={tab}
            draft={cubeEditor.draft}
            selected={cubeEditor.selected}
            canWrite={canWrite}
            connectionLabel={connectionLabel}
            widgetCount={cubeEditor.widgetCount}
            isDraft={cubeEditor.isDraft}
            savedHint={cubeEditor.savedHint}
            isSaving={cubeEditor.isSaving}
            isDiscarding={cubeEditor.isDiscarding}
            joinTarget={joinTarget}
            tourActive={tourActive}
            onTabChange={handleCubeTabChange}
            onSelect={handleCanvasSelect}
            onClose={clearFocus}
            onUndo={cubeEditor.handleUndo}
            onRedo={cubeEditor.handleRedo}
            onDiscard={cubeEditor.handleDiscard}
            onPublish={() => setPublishOpen(true)}
            onStartTour={startTour}
            onDraftChange={cubeEditor.handleDraftChange}
            onAddMeasure={cubeEditor.handleAddMeasure}
            onAddDimension={cubeEditor.handleAddDimension}
            onDeleteMeasure={cubeEditor.handleDeleteMeasure}
            onDeleteDimension={cubeEditor.handleDeleteDimension}
          />
        ) : null}

        {view && viewDraft && !cube ? (
          <aside className="semantic-ide__inspector">
            <div className="semantic-ide__inspector-scroll">
              <div className="semantic-panel">
                <div className="semantic-panel__head">
                  <h2 className="semantic-panel__title">Поля представления</h2>
                  <p className="semantic-panel__desc">
                    Отметьте поля на графе или выберите из списка
                  </p>
                </div>
                {viewDraft.cubes.map((cubePath) => {
                  const cubeName = cubePath.joinPath.split('.')[0] ?? '';
                  const cubeDef = joinContext?.cubes.find((item) => item.name === cubeName);
                  if (!cubeDef) return null;
                  const members = [
                    ...cubeDef.measures.map((item) => ({ kind: 'measure' as const, ...item })),
                    ...cubeDef.dimensions.map((item) => ({ kind: 'dimension' as const, ...item })),
                  ];
                  return (
                    <section key={cubePath.joinPath} className="mb-4">
                      <h3 className="mb-2 text-sm font-medium">{cubePath.joinPath}</h3>
                      <ul className="semantic-view-editor__member-list m-0 list-none p-0">
                        {members.map((member) => {
                          const checked = cubePath.includes.includes(member.name);
                          return (
                            <li key={member.name}>
                              <label className="semantic-view-editor__member">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!canWrite}
                                  onChange={() => toggleViewMember(cubePath.joinPath, member.name)}
                                />
                                <span>
                                  {member.name}
                                  <small>
                                    {MEMBER_KIND_LABELS[member.kind] ?? member.kind}
                                  </small>
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      <SemanticNewCubeDialog open={newCubeOpen} onClose={() => setNewCubeOpen(false)} />
      <SemanticNewViewDialog open={newViewOpen} onClose={() => setNewViewOpen(false)} cubes={cubes} />

      {cube && cubeEditor.draft ? (
        <SemanticPublishDialog
          cubeName={cube}
          cubeLabel={cubeLabel}
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          onPublished={() => setPublishOpen(false)}
        />
      ) : null}

      {view ? (
        <SemanticViewPublishDialog
          viewName={view}
          open={viewPublishOpen}
          onClose={() => setViewPublishOpen(false)}
          onPublished={() => setViewPublishOpen(false)}
        />
      ) : null}
    </div>
  );
}
